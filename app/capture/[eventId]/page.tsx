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

  const handleReset = () => {
    setSelectedFrame(null);
    setCapturedImage(null);
    setCompositeImage(null);
    setShareUrl(null);
    setStep('select-frame');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            {event.partnerName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {event.partnerName}
              </p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {event.name}
            </h1>
            {event.eventDate && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {new Date(event.eventDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
            {event.location && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📍 {event.location}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            📸 Take a Photo
          </h2>
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${
                step === 'select-frame' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                1
              </div>
              <p className={`text-sm font-medium text-center ${
                step === 'select-frame' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                Select Frame
              </p>
            </div>
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${
                step === 'capture-photo' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                2
              </div>
              <p className={`text-sm font-medium text-center ${
                step === 'capture-photo' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                Capture Photo
              </p>
            </div>
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${
                step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                3
              </div>
              <p className={`text-sm font-medium text-center ${
                step === 'preview' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                Preview & Save
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Frame Selection */}
        {step === 'select-frame' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Step 1: Choose Your Frame
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select a frame design for your photo
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {frames.map((frame) => (
                <button
                  key={frame._id}
                  onClick={() => handleFrameSelect(frame)}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-transparent hover:border-blue-500 focus:border-blue-600 transition-all"
                >
                  <div className="aspect-square relative bg-white dark:bg-gray-800 rounded overflow-hidden mb-2">
                    <Image
                      src={frame.thumbnailUrl || frame.imageUrl}
                      alt={frame.name}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {frame.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Photo Capture */}
        {step === 'capture-photo' && selectedFrame && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Step 2: Capture Your Photo
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Selected frame: <span className="font-medium">{selectedFrame.name}</span>
                </p>
              </div>
              <button
                onClick={() => setStep('select-frame')}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                Change Frame
              </button>
            </div>
            <div>
              <CameraCapture onCapture={handlePhotoCapture} frameOverlay={selectedFrame.imageUrl} />
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && compositeImage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Step 3: Preview & Save
            </h3>
            <div className="max-w-2xl mx-auto">
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-6">
                <Image
                  src={compositeImage}
                  alt="Final result"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !!shareUrl}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {shareUrl ? '✓ Saved!' : isSaving ? '💾 Saving...' : '💾 Save & Share'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    💾 Download
                  </button>
                </div>
                {shareUrl && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Share your photo:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(shareUrl)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  📸 Take Another Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4 animate-pulse">✨</div>
              <p className="text-gray-900 dark:text-white font-medium">
                Applying frame...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
