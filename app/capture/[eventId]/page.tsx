/**
 * Event-Specific Capture Page
 * Version: 2.0.0
 * 
 * Public page for capturing photos at events
 * Full interactive capture flow with camera/upload support
 * 
 * v2.0.0: Custom page flow system
 * - Onboarding pages → Frame selection → Capture → Preview/Save → Sharing → Thank you pages
 * - Collects user data (name/email) and consents before capture
 * - Passes collected data to submission API
 */

'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import CameraCapture from '@/components/camera/CameraCapture';
import WhoAreYouPage, { type WhoAreYouPageData } from '@/components/capture/WhoAreYouPage';
import AcceptPage, { type AcceptPageData } from '@/components/capture/AcceptPage';
import CTAPage, { type CTAPageData } from '@/components/capture/CTAPage';
import { type CustomPage } from '@/lib/db/schemas';

interface Frame {
  frameId: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
}

interface EventData {
  eventId: string;
  name: string;
  partnerId: string | null;
  partnerName: string | null;
  eventDate: string | null;
  location: string | null;
  customPages: CustomPage[];  // v2.0.0: Custom page flow
  loadingText?: string;  // Customizable loading text
  logoUrl?: string;  // Optional event logo URL
  showLogo: boolean;  // Whether to display logo on pages
}

// v2.0.0: Collected data from custom pages
interface CollectedData {
  userInfo?: WhoAreYouPageData;
  consents: Array<{
    pageId: string;
    pageType: 'accept' | 'cta';
    checkboxText: string;
    accepted: boolean;
    acceptedAt: string;
  }>;
}

export default function EventCapturePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'select-frame' | 'capture-photo' | 'preview'>('select-frame');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // v2.0.0: Custom page flow state
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [collectedData, setCollectedData] = useState<CollectedData>({ consents: [] });
  const [flowPhase, setFlowPhase] = useState<'onboarding' | 'capture' | 'thankyou'>('onboarding');
  
  // Get take-photo page config for button texts and messages
  const takePhotoPage = customPages.find(p => p.pageType === 'take-photo');
  const captureButtonText = takePhotoPage?.config.captureButtonText || 'LOVE IT';
  const retryButtonText = takePhotoPage?.config.retryButtonText || 'TRY AGAIN';
  const shareNextButtonText = takePhotoPage?.config.shareNextButtonText || 'NEXT';
  const changeButtonText = takePhotoPage?.config.changeButtonText || 'Change';
  const successMessage = takePhotoPage?.config.successMessage || 'Photo saved successfully! You can now share it.';
  const showSharePage = takePhotoPage?.config.showSharePage !== false;
  const skipShareMessage = takePhotoPage?.config.skipShareMessage || 'Thank you! Your photo has been saved.';
  const showFrameOnCapture = takePhotoPage?.config.showFrameOnCapture !== false; // Default true
  const errorFrameMessage = takePhotoPage?.config.errorFrameMessage || 'Failed to apply frame. Please try again.';
  const errorSaveMessage = takePhotoPage?.config.errorSaveMessage || 'Failed to save photo: Please try again.';
  const linkCopiedMessage = takePhotoPage?.config.linkCopiedMessage || 'Link copied to clipboard!';
  const copyErrorMessage = takePhotoPage?.config.copyErrorMessage || 'Failed to copy link. Please copy it manually.';
  const saveFirstMessage = takePhotoPage?.config.saveFirstMessage || 'Please save the photo first to get a shareable link.';

  // Fetch event and frames
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        
        const data = await response.json();
        // apiSuccess wraps in { success: true, data: { event: {...} } }
        const eventData = data.data?.event || data.event;  // Support both structures
        
        if (!eventData) throw new Error('Event data not found');
        
        // MongoDB returns _id (string) and eventId (UUID)
        // We use _id for the URL but event has both fields
        setEvent({
          eventId: eventData.eventId || eventData._id,  // fallback to _id if eventId missing
          name: eventData.name,
          partnerId: eventData.partnerId || null,
          partnerName: eventData.partnerName || null,
          eventDate: eventData.eventDate || null,
          location: eventData.location || null,
          customPages: eventData.customPages || [],
          loadingText: eventData.loadingText,
          logoUrl: eventData.logoUrl,
          showLogo: eventData.showLogo || false,
        });
        
        // Fetch logo for loading-capture scenario
        try {
          const logoResponse = await fetch(`/api/events/${eventId}/logos`);
          if (logoResponse.ok) {
            const logoData = await logoResponse.json();
            const loadingLogos = logoData.data?.logos?.['loading-capture'] || logoData.logos?.['loading-capture'] || [];
            const activeLogo = loadingLogos.find((l: any) => l.isActive);
            if (activeLogo) {
              setLogoUrl(activeLogo.imageUrl);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch logo:', err);
        }
        
        // v2.0.0: Set up custom page flow
        const pages = (eventData.customPages || []).filter((p: CustomPage) => p.isActive);
        if (pages.length > 0) {
          // Sort pages by order
          const sortedPages = [...pages].sort((a, b) => a.order - b.order);
          setCustomPages(sortedPages);
          
          // Start with onboarding if there are pages before 'take-photo'
          const takePhotoIndex = sortedPages.findIndex(p => p.pageType === 'take-photo');
          if (takePhotoIndex > 0) {
            // Has onboarding pages
            setFlowPhase('onboarding');
            setCurrentPageIndex(0);
          } else {
            // No onboarding, go straight to capture
            setFlowPhase('capture');
          }
        } else {
          // No custom pages, go straight to capture (legacy behavior)
          setFlowPhase('capture');
        }

        // Get frames assigned to this event
        const activeFrameAssignments = (eventData.frames || []).filter((f: any) => f.isActive);
        const frameIds = activeFrameAssignments.map((f: any) => f.frameId);

        if (frameIds.length > 0) {
          // Fetch frame details
          const framesResponse = await fetch('/api/frames?active=true&limit=100');
          const framesData = await framesResponse.json();
          
          // Filter to only frames assigned to this event (using frameId UUID)
          const eventFrames = (framesData.data?.frames || []).filter((f: any) => 
            frameIds.includes(f.frameId)
          );
          setFrames(eventFrames);
          
          // Auto-select if only one frame
          if (eventFrames.length === 1) {
            setSelectedFrame(eventFrames[0]);
            setStep('capture-photo');
          }
        } else {
          // No frames - skip to capture without frame
          setStep('capture-photo');
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [eventId]);

  // Composite image with frame when photo is captured (or just use photo if no frame)
  useEffect(() => {
    if (capturedImage) {
      if (selectedFrame) {
        compositeImageWithFrame();
      } else {
        // No frame - use captured image as-is
        setCompositeImage(capturedImage);
        setStep('preview');
      }
    }
  }, [capturedImage, selectedFrame]);

  const compositeImageWithFrame = async () => {
    if (!capturedImage || !selectedFrame) return;

    setIsProcessing(true);

    try {
      const frameImg = new window.Image();
      frameImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve;
        frameImg.onerror = reject;
        frameImg.src = selectedFrame.imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Limit canvas size to prevent large payloads (max 2048px on longest side)
      const maxDimension = 2048;
      let targetWidth = frameImg.width;
      let targetHeight = frameImg.height;
      
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
        targetWidth = Math.floor(targetWidth * scale);
        targetHeight = Math.floor(targetHeight * scale);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Store dimensions for submission
      setImageDimensions({ width: targetWidth, height: targetHeight });

      const photoImg = new window.Image();
      photoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        photoImg.onload = resolve;
        photoImg.onerror = reject;
        photoImg.src = capturedImage;
      });

      const frameAspect = canvas.width / canvas.height;
      const photoAspect = photoImg.width / photoImg.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (photoAspect > frameAspect) {
        drawHeight = canvas.height;
        drawWidth = photoImg.width * (canvas.height / photoImg.height);
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = photoImg.height * (canvas.width / photoImg.width);
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(photoImg, offsetX, offsetY, drawWidth, drawHeight);
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG with compression to reduce file size (quality 0.85 = ~85%)
      const composite = canvas.toDataURL('image/jpeg', 0.85);
      setCompositeImage(composite);
      setStep('preview');
    } catch (error) {
      console.error('Error compositing image:', error);
      alert(errorFrameMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFrameSelect = (frame: Frame) => {
    setSelectedFrame(frame);
    setStep('capture-photo');
  };

  const handlePhotoCapture = (blob: Blob, dataUrl: string) => {
    setCapturedImage(dataUrl);
  };

  const handleSave = async () => {
    if (!compositeImage || !event) return;

    setIsSaving(true);

    try {
      // v2.0.0: Include userInfo and consents in submission
      const submissionData: any = {
        imageData: compositeImage,
        frameId: selectedFrame?.frameId || null,  // Optional frame
        eventId: event.eventId,  // Use event UUID, not URL parameter
        eventName: event.name,
        partnerId: event.partnerId,
        partnerName: event.partnerName,
        imageWidth: imageDimensions?.width || selectedFrame?.width || 1920,
        imageHeight: imageDimensions?.height || selectedFrame?.height || 1080,
      };
      
      // Add collected data from custom pages
      if (collectedData.userInfo) {
        submissionData.userInfo = collectedData.userInfo;
      }
      if (collectedData.consents.length > 0) {
        submissionData.consents = collectedData.consents;
      }
      
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save failed:', response.status, errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const origin = window.location.origin;
      // Response is wrapped in { success: true, data: { submission: {...} } }
      const submissionId = data.data?.submission?._id || data.submission?._id;
      setShareUrl(`${origin}/share/${submissionId}`);
      
      alert(successMessage);
    } catch (error: any) {
      console.error('Error saving submission:', error);
      alert(`${errorSaveMessage.replace(': Please try again.', '')}: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!compositeImage) return;

    const link = document.createElement('a');
    link.href = compositeImage;
    link.download = `${event?.name || 'photo'}-${Date.now()}.png`;
    link.click();
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert(linkCopiedMessage);
    } catch (error) {
      console.error('Error copying link:', error);
      alert(copyErrorMessage);
    }
  };

  const handleShareSocial = (platform: string) => {
    if (!shareUrl) {
      alert(saveFirstMessage);
      return;
    }

    const text = `Check out my photo from ${event?.name || 'this event'}!`;
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const handleReset = () => {
    // Keep selected frame and go back to capture step
    setCapturedImage(null);
    setCompositeImage(null);
    setShareUrl(null);
    setStep('capture-photo');
  };
  
  // v2.0.0: Custom page navigation handlers
  
  /**
   * Handle completion of Who Are You page
   * Stores user info and moves to next page
   */
  const handleWhoAreYouComplete = (data: WhoAreYouPageData) => {
    setCollectedData(prev => ({
      ...prev,
      userInfo: data,
    }));
    handleNextPage();
  };
  
  /**
   * Handle completion of Accept/CTA pages
   * Stores consent and moves to next page
   */
  const handleConsentComplete = (page: CustomPage, data: AcceptPageData | CTAPageData) => {
    setCollectedData(prev => ({
      ...prev,
      consents: [
        ...prev.consents,
        {
          pageId: page.pageId,
          pageType: page.pageType as 'accept' | 'cta',
          checkboxText: page.config.checkboxText || '',
          accepted: data.accepted,
          acceptedAt: data.acceptedAt,
        },
      ],
    }));
    handleNextPage();
  };
  
  /**
   * Navigate to next page in flow
   * Determines if moving to next custom page, capture, or thank you phase
   */
  const handleNextPage = () => {
    const takePhotoIndex = customPages.findIndex(p => p.pageType === 'take-photo');
    
    if (flowPhase === 'onboarding') {
      // In onboarding phase
      if (currentPageIndex + 1 < takePhotoIndex) {
        // More onboarding pages
        setCurrentPageIndex(currentPageIndex + 1);
      } else {
        // Move to capture phase
        setFlowPhase('capture');
      }
    } else if (flowPhase === 'thankyou') {
      // In thank you phase
      if (currentPageIndex + 1 < customPages.length) {
        // More thank you pages
        setCurrentPageIndex(currentPageIndex + 1);
      } else {
        // Completed all thank you pages - restart flow
        handleRestartFlow();
      }
    }
  };
  
  /**
   * Navigate to previous page
   */
  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };
  
  /**
   * Move from sharing to thank you pages
   * Called when user clicks NEXT button after saving
   */
  const handleMoveToThankYou = () => {
    const takePhotoIndex = customPages.findIndex(p => p.pageType === 'take-photo');
    
    if (takePhotoIndex >= 0 && takePhotoIndex + 1 < customPages.length) {
      // Has thank you pages
      setFlowPhase('thankyou');
      setCurrentPageIndex(takePhotoIndex + 1);
    } else {
      // No thank you pages, restart
      handleRestartFlow();
    }
  };
  
  /**
   * Restart flow from beginning
   * Resets all state and goes back to first page or capture
   */
  const handleRestartFlow = () => {
    // Reset capture state
    setSelectedFrame(null);
    setCapturedImage(null);
    setCompositeImage(null);
    setShareUrl(null);
    setStep('select-frame');
    setImageDimensions(null);
    
    // Reset flow state
    setCollectedData({ consents: [] });
    
    // Restart from beginning
    const takePhotoIndex = customPages.findIndex(p => p.pageType === 'take-photo');
    if (takePhotoIndex > 0) {
      // Has onboarding pages
      setFlowPhase('onboarding');
      setCurrentPageIndex(0);
    } else {
      // No onboarding, go to capture
      setFlowPhase('capture');
    }
  };

  // v2.0.0: Render custom pages (onboarding or thank you)
  if (!isLoading && event && (flowPhase === 'onboarding' || flowPhase === 'thankyou')) {
    const currentPage = customPages[currentPageIndex];
    
    if (!currentPage) {
      // No current page, move to appropriate phase
      if (flowPhase === 'onboarding') {
        setFlowPhase('capture');
      } else {
        handleRestartFlow();
      }
      return null;
    }
    
    // Render page based on type
    switch (currentPage.pageType) {
      case 'who-are-you':
        return (
          <WhoAreYouPage
            config={{
              title: currentPage.config.title,
              description: currentPage.config.description,
              nameLabel: currentPage.config.nameLabel || 'Your Name',
              emailLabel: currentPage.config.emailLabel || 'Your Email',
              buttonText: currentPage.config.buttonText,
              namePlaceholder: currentPage.config.namePlaceholder,
              emailPlaceholder: currentPage.config.emailPlaceholder,
            }}
            onNext={handleWhoAreYouComplete}
          />
        );
      
      case 'accept':
        return (
          <AcceptPage
            config={{
              title: currentPage.config.title,
              description: currentPage.config.description,
              checkboxText: currentPage.config.checkboxText || '',
              buttonText: currentPage.config.buttonText,
            }}
            pageId={currentPage.pageId}
            onNext={(data) => handleConsentComplete(currentPage, data)}
          />
        );
      
      case 'cta':
        return (
          <CTAPage
            config={{
              title: currentPage.config.title,
              description: currentPage.config.description,
              checkboxText: currentPage.config.checkboxText || '',
              buttonText: currentPage.config.buttonText,
              hasButton: currentPage.config.hasButton,
              visitButtonText: currentPage.config.visitButtonText,
              redirectingText: currentPage.config.redirectingText,
            }}
            pageId={currentPage.pageId}
            onNext={(data) => handleConsentComplete(currentPage, data)}
          />
        );
      
      default:
        // Unknown page type or 'take-photo' (shouldn't happen)
        if (flowPhase === 'onboarding') {
          setFlowPhase('capture');
        } else {
          handleRestartFlow();
        }
        return null;
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Event logo"
              className="max-w-md max-h-64 mx-auto mb-8 object-contain"
            />
          ) : (
            <div className="text-6xl mb-4">⏳</div>
          )}
          <p className="text-white text-2xl">{event?.loadingText || 'Loading event...'}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Event Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This event could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col landscape:flex-row bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Combined Header and Progress Steps - Hide after save */}
      {!shareUrl && (
        <div className="flex-shrink-0 px-4 py-3 landscape:w-auto landscape:h-full landscape:py-4 landscape:px-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 landscape:h-full landscape:flex landscape:flex-col landscape:justify-center landscape:writing-mode-vertical">
            {/* Event Info */}
            <div className="text-center mb-3 landscape:mb-6 landscape:[writing-mode:vertical-lr] landscape:rotate-180">
              {event.showLogo && event.logoUrl && (
                <img
                  src={event.logoUrl}
                  alt="Event logo"
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                />
              )}
              {event.partnerName && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.partnerName}
                </p>
              )}
              <h1 className="text-base font-bold text-gray-900 dark:text-white">
                {event.name}
              </h1>
            </div>
            {/* Progress Steps - Hide in landscape for camera */}
            <div className="flex items-center justify-center gap-2 landscape:flex-col landscape:gap-4 landscape:hidden">
              {/* Only show frame selection step if multiple frames */}
              {frames.length > 1 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      step === 'select-frame' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      1
                    </div>
                    <p className={`text-[10px] font-medium text-center mt-1 ${
                      step === 'select-frame' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Select Frame
                    </p>
                  </div>
                  <div className="w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </>
              )}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === 'capture-photo' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {frames.length > 1 ? '2' : '1'}
                </div>
                <p className={`text-[10px] font-medium text-center mt-1 ${
                  step === 'capture-photo' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Capture Photo
                </p>
              </div>
              <div className="w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {frames.length > 1 ? '3' : '2'}
                </div>
                <p className={`text-[10px] font-medium text-center mt-1 ${
                  step === 'preview' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Preview & Save
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 landscape:overflow-x-auto landscape:overflow-y-hidden">
        {/* Step 1: Frame Selection - Fit to screen keeping aspect ratio */}
        {step === 'select-frame' && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
              {frames.map((frame) => (
                <div key={frame.frameId} className="flex items-center justify-center">
                  <img
                    src={frame.imageUrl}
                    alt={frame.name}
                    onClick={() => handleFrameSelect(frame)}
                    className="cursor-pointer border-2 border-gray-300 hover:border-blue-500 object-contain w-full h-auto max-h-[60vh] rounded-lg transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Photo Capture - Fullscreen */}
        {step === 'capture-photo' && (
          <div className="fixed inset-0 bg-black z-40 flex flex-col">
            {/* Minimal header with change frame button - only show if multiple frames */}
            {frames.length > 1 && (
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setStep('select-frame')}
                  className="px-3 py-2 bg-white/90 text-gray-900 rounded-lg font-medium text-sm flex items-center gap-1 shadow-lg"
                >
                  🔄 {changeButtonText}
                </button>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center p-4 min-h-0">
              <CameraCapture 
                onCapture={handlePhotoCapture} 
                frameOverlay={showFrameOnCapture ? selectedFrame?.imageUrl : undefined}
                frameWidth={selectedFrame?.width || 1920}
                frameHeight={selectedFrame?.height || 1080}
              />
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && compositeImage && (
          <div className="h-full flex items-center justify-center p-4">
            {/* Image with overlay - Full screen with share overlay when saved */}
            <div className="relative max-w-full max-h-full">
              <img
                src={compositeImage}
                alt="Final result"
                className="max-h-[80vh] max-w-full object-contain"
              />
              
              {/* Save/Retry buttons - Positioned over image */}
              {!shareUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl relative overflow-hidden"
                    >
                      {isSaving ? (
                        event?.showLogo && event?.logoUrl ? (
                          <img
                            src={event.logoUrl}
                            alt="Event logo"
                            className="w-8 h-8 object-contain animate-pulse"
                          />
                        ) : (
                          <span className="text-3xl animate-spin">⏳</span>
                        )
                      ) : (
                        <span className="text-3xl">❤️</span>
                      )}
                      <span className="text-xl">{isSaving ? 'SAVING...' : captureButtonText}</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-2xl"
                    >
                      <span className="text-3xl">🔄</span>
                      <span className="text-xl">{retryButtonText}</span>
                    </button>
                  </div>
                </div>
                            )}
              
              {/* Share overlay - Transparent black overlay over photo */}
              {shareUrl && showSharePage && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-black/70 rounded-2xl p-6 space-y-4 backdrop-blur-md">
                    <h3 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-2">
                      <span className="text-3xl">📤</span>
                      Share Your Photo
                    </h3>
                    
                    {/* Share URL */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-3 bg-white/30 text-white rounded-lg hover:bg-white/40 transition-colors flex items-center gap-2 backdrop-blur"
                      >
                        <span className="text-xl">📋</span>
                        <span className="font-medium">Copy</span>
                      </button>
                    </div>
                    
                    {/* Social Share Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleShareSocial('facebook')}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                      >
                        Facebook
                      </button>
                      <button
                        onClick={() => handleShareSocial('twitter')}
                        className="px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-semibold shadow-lg"
                      >
                        Twitter
                      </button>
                      <button
                        onClick={() => handleShareSocial('linkedin')}
                        className="px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-semibold shadow-lg"
                      >
                        LinkedIn
                      </button>
                      <button
                        onClick={() => handleShareSocial('whatsapp')}
                        className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-lg"
                      >
                        WhatsApp
                      </button>
                    </div>
                    
                    {/* Next Button */}
                    <button
                      onClick={handleMoveToThankYou}
                      className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl"
                    >
                      {shareNextButtonText}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Skip share overlay */}
              {shareUrl && !showSharePage && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-black/70 rounded-2xl p-8 text-center backdrop-blur-md max-w-md">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-2xl text-white font-bold mb-6">
                      {skipShareMessage}
                    </p>
                    <button
                      onClick={handleMoveToThankYou}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl"
                    >
                      {shareNextButtonText}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            {event?.showLogo && event?.logoUrl ? (
              <img
                src={event.logoUrl}
                alt="Event logo"
                className="w-24 h-24 mx-auto mb-4 object-contain animate-pulse"
              />
            ) : (
              <div className="text-6xl mb-4 animate-spin">⏳</div>
            )}
            <p className="text-gray-900 dark:text-white font-medium">
              Applying frame...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
