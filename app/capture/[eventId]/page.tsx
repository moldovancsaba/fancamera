/**
 * Event-Specific Capture Page
 * Version: 1.3.0
 * 
 * Public page for capturing photos at events
 * Full interactive capture flow with camera/upload support
 */

'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import CameraCapture from '@/components/camera/CameraCapture';

interface Frame {
  _id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
}

interface EventData {
  eventId: string;
  name: string;
  partnerId: string | null;
  partnerName: string | null;
  eventDate: string | null;
  location: string | null;
}

export default function EventCapturePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'select-frame' | 'capture-photo' | 'preview'>('select-frame');

  // Fetch event and frames
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        
        const data = await response.json();
        const eventData = data.event;
        
        setEvent({
          eventId: eventData.eventId,
          name: eventData.name,
          partnerId: eventData.partnerId || null,
          partnerName: eventData.partnerName || null,
          eventDate: eventData.eventDate || null,
          location: eventData.location || null,
        });

        // Get frames assigned to this event
        const activeFrameAssignments = (eventData.frames || []).filter((f: any) => f.isActive);
        const frameIds = activeFrameAssignments.map((f: any) => f.frameId);

        if (frameIds.length > 0) {
          // Fetch frame details
          const framesResponse = await fetch('/api/frames?active=true&limit=100');
          const framesData = await framesResponse.json();
          
          // Filter to only frames assigned to this event
          const eventFrames = (framesData.frames || []).filter((f: any) => 
            frameIds.includes(f._id.toString())
          );
          setFrames(eventFrames);
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [eventId]);

  // Composite image with frame when photo is captured
  useEffect(() => {
    if (capturedImage && selectedFrame) {
      compositeImageWithFrame();
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
      alert('Failed to apply frame. Please try again.');
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
    if (!compositeImage || !selectedFrame || !event) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: compositeImage,
          frameId: selectedFrame._id,
          eventId: eventId,
          eventName: event.name,
          partnerId: event.partnerId,
          partnerName: event.partnerName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save failed:', response.status, errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const origin = window.location.origin;
      setShareUrl(`${origin}/share/${data.submission._id}`);
      
      alert('Photo saved successfully! You can now share it.');
    } catch (error: any) {
      console.error('Error saving submission:', error);
      alert(`Failed to save photo: ${error.message || 'Please try again.'}`);
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
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please copy it manually.');
    }
  };

  const handleShareSocial = (platform: string) => {
    if (!shareUrl) {
      alert('Please save the photo first to get a shareable link.');
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event || frames.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🖼️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Frames Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This event doesn't have any active frames yet.
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
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === 'capture-photo' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  2
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
                  3
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
        {/* Step 1: Frame Selection */}
        {step === 'select-frame' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3">
            <div className="grid grid-cols-2 landscape:grid-cols-4 gap-2">
              {frames.map((frame) => (
                <button
                  key={frame._id}
                  onClick={() => handleFrameSelect(frame)}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border-2 border-transparent hover:border-blue-500 focus:border-blue-600 transition-all flex flex-col"
                >
                  <div className="w-full flex items-center justify-center mb-2" style={{ minHeight: '100px' }}>
                    <img
                      src={frame.thumbnailUrl || frame.imageUrl}
                      alt={frame.name}
                      style={{ maxHeight: '160px', maxWidth: '100%', height: 'auto', width: 'auto' }}
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white text-center">
                    {frame.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Photo Capture - Fullscreen */}
        {step === 'capture-photo' && selectedFrame && (
          <div className="fixed inset-0 bg-black z-40 flex flex-col">
            {/* Minimal header with change frame button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setStep('select-frame')}
                className="px-3 py-2 bg-white/90 text-gray-900 rounded-lg font-medium text-sm flex items-center gap-1 shadow-lg"
              >
                <span className="material-icons text-lg">refresh</span>
                Change
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <CameraCapture onCapture={handlePhotoCapture} frameOverlay={selectedFrame.imageUrl} />
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && compositeImage && selectedFrame && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 landscape:flex landscape:gap-4 landscape:h-full">
            {/* Image - Left side in landscape */}
            <div className="landscape:flex-1 landscape:flex landscape:items-center landscape:justify-center">
              <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-4 landscape:mb-0" style={{
                maxWidth: '100%',
              }}>
                <Image
                  src={compositeImage}
                  alt="Final result"
                  width={2048}
                  height={2048}
                  className="w-full h-auto object-contain landscape:max-h-[80vh]"
                  unoptimized
                />
              </div>
            </div>
            {/* Actions - Right side in landscape, bottom in portrait */}
            <div className="space-y-3 landscape:flex landscape:flex-col landscape:justify-center landscape:w-20">
              {!shareUrl && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 landscape:flex-col landscape:px-3 landscape:py-6"
                >
                  <span className="material-icons text-2xl">favorite</span>
                  <span className="landscape:hidden">{isSaving ? 'SAVING...' : 'LOVE IT'}</span>
                </button>
              )}
              {!shareUrl && (
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 landscape:flex-col landscape:px-3 landscape:py-6"
                >
                  <span className="material-icons text-2xl">refresh</span>
                  <span className="landscape:hidden">TRY AGAIN</span>
                </button>
              )}
              {shareUrl && (
                <div className="border-t pt-3 landscape:border-t-0 landscape:pt-0 landscape:flex-1 landscape:flex landscape:flex-col landscape:gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-1 landscape:hidden">
                    <span className="material-icons text-lg">share</span>
                    Share Your Photo
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 landscape:flex-col">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs landscape:text-[10px]"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-icons text-sm">content_copy</span>
                        <span className="text-xs landscape:hidden">Copy</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 landscape:grid-cols-1">
                      <button
                        onClick={() => handleShareSocial('facebook')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs landscape:text-[10px]"
                      >
                        Facebook
                      </button>
                      <button
                        onClick={() => handleShareSocial('twitter')}
                        className="px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-xs landscape:text-[10px]"
                      >
                        Twitter
                      </button>
                      <button
                        onClick={() => handleShareSocial('linkedin')}
                        className="px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-xs landscape:text-[10px]"
                      >
                        LinkedIn
                      </button>
                      <button
                        onClick={() => handleShareSocial('whatsapp')}
                        className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs landscape:text-[10px]"
                      >
                        WhatsApp
                      </button>
                    </div>
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
            <span className="material-icons text-6xl mb-4 animate-spin text-blue-600">autorenew</span>
            <p className="text-gray-900 dark:text-white font-medium">
              Applying frame...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
