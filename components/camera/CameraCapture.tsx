/**
 * Camera Capture Component
 * Version: 1.0.0
 * 
 * Handles live camera capture using getUserMedia API.
 * Supports both mobile (iOS Safari, Android Chrome) and desktop webcams.
 * 
 * Features:
 * - Camera permission handling
 * - Front/back camera selection on mobile
 * - Photo capture with preview
 * - Error handling and user feedback
 * - Responsive design for all devices
 * 
 * Browser Support:
 * - iOS Safari 11+
 * - Android Chrome 53+
 * - Desktop Chrome, Firefox, Safari, Edge
 */

'use client';

import { useState, useRef, useEffect } from 'react';

export interface CameraCaptureProps {
  onCapture: (blob: Blob, dataUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  frameOverlay?: string; // URL of frame image to overlay
  frameWidth?: number;   // Frame width in pixels (for aspect ratio)
  frameHeight?: number;  // Frame height in pixels (for aspect ratio)
  captureButtonColor?: string; // Hex color for capture button fill (default: #3B82F6)
  captureButtonBorderColor?: string; // Hex color for capture button border (default: #3B82F6)
  promptTitle?: string;  // Custom title for camera start prompt (default: 'Ready to capture?')
  promptDescription?: string; // Custom description for camera start prompt
}

export default function CameraCapture({ 
  onCapture, 
  onError, 
  className = '', 
  frameOverlay, 
  frameWidth, 
  frameHeight,
  captureButtonColor = '#3B82F6',
  captureButtonBorderColor = '#3B82F6',
  promptTitle = 'Ready to capture?',
  promptDescription = 'Click to start your camera and take a photo'
}: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Load frame overlay image
   */
  useEffect(() => {
    if (frameOverlay) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setFrameImage(img);
      img.onerror = (err) => console.error('Failed to load frame overlay:', err);
      img.src = frameOverlay;
    }
  }, [frameOverlay]);

  /**
   * Check if device has multiple cameras
   * Used to show camera switch button
   */
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        // Always show camera selector if more than 1 camera available
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.error('Error checking cameras:', err);
      }
    };

    checkCameras();
  }, []);

  /**
   * Re-check cameras when stream changes
   */
  useEffect(() => {
    if (stream) {
      const checkCameras = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        } catch (err) {
          console.error('Error checking cameras:', err);
        }
      };
      checkCameras();
    }
  }, [stream]);

  /**
   * Start camera stream with specified constraints
   */
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setIsLoading(true);
    setError(null);
    setCapturedImage(null);

    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera access with appropriate constraints
      // For mobile: use facingMode to select front/back camera
      // For desktop: use default camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setFacingMode(facing);
      setIsVideoReady(false);

      // Attach stream to video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Safari desktop has a known bug where video frames aren't drawable immediately
        // We need to wait for actual frame rendering
        const onVideoPlaying = () => {
          console.log('🎬 Video playing event fired');
          
          // Use requestVideoFrameCallback if available (Chrome/Safari)
          if ('requestVideoFrameCallback' in video) {
            (video as any).requestVideoFrameCallback(() => {
              console.log('✅ Video frame ready (requestVideoFrameCallback)');
              setIsVideoReady(true);
              setIsLoading(false);
            });
          } else {
            // Fallback: wait for next animation frame + small delay
            requestAnimationFrame(() => {
              setTimeout(() => {
                console.log('✅ Video frame ready (fallback)');
                setIsVideoReady(true);
                setIsLoading(false);
              }, 100);
            });
          }
        };
        
        video.addEventListener('playing', onVideoPlaying, { once: true });
      } else {
        setIsLoading(false);
      }
      
    } catch (err) {
      setIsLoading(false);
      
      const error = err as Error;
      let errorMessage = 'Failed to access camera';

      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera permission in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested settings.';
      }

      setError(errorMessage);
      
      if (onError) {
        onError(new Error(errorMessage));
      }

      console.error('Camera error:', error);
    }
  };

  /**
   * Stop camera stream and release resources
   */
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsVideoReady(false);
  };

  /**
   * Switch between front and back camera (mobile)
   */
  const switchCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  };

  /**
   * Capture photo from video stream
   */
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Missing video or canvas ref');
      return;
    }
    
    if (!isVideoReady) {
      console.warn('⚠️ Video not ready yet, waiting...');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log('📹 Video state:', {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      currentTime: video.currentTime
    });

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log('🎨 Canvas size:', canvas.width, 'x', canvas.height);

    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return;
    }
    
    // SAFARI FIX: Temporarily remove CSS transform during capture
    const originalTransform = video.style.transform;
    video.style.transform = 'none';
    
    // Force a paint/reflow to ensure transform is removed
    void video.offsetHeight;

    // If front camera, flip horizontally to match mirror view
    if (facingMode === 'user') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    
    // Restore CSS transform
    video.style.transform = originalTransform;
    
    console.log('✅ Drew image to canvas');

    // CRITICAL: Generate data URL IMMEDIATELY after drawing, while canvas still has image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    console.log('📊 Data URL length:', dataUrl.length, 'bytes');
    console.log('📊 Data URL preview:', dataUrl.substring(0, 100));
    
    // Set preview immediately
    setCapturedImage(dataUrl);

    // Convert canvas to blob (this happens async but uses canvas data from above)
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('❌ Failed to create blob');
        setError('Failed to capture photo');
        return;
      }
      
      console.log('✅ Blob created:', blob.size, 'bytes');
      
      // Pass captured image to parent
      onCapture(blob, dataUrl);
      
      // Stop camera after capture
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  /**
   * Retake photo (restart camera)
   */
  const retake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  /**
   * Calculate container size based on viewport and frame aspect ratio
   */
  useEffect(() => {
    const calculateSize = () => {
      if (!containerRef.current) return;
      
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      
      const availableWidth = parent.clientWidth;
      const availableHeight = parent.clientHeight;
      
      // Calculate frame aspect ratio
      // Default to 16:9 (landscape) if no frame specified
      const frameAspectRatio = (frameWidth && frameHeight) 
        ? frameWidth / frameHeight
        : frameImage
          ? frameImage.width / frameImage.height
          : 16 / 9;
      
      // Determine if width or height is the constraint
      const containerAspectRatio = availableWidth / availableHeight;
      
      let width, height;
      
      if (containerAspectRatio > frameAspectRatio) {
        // Height is the constraint
        height = availableHeight;
        width = height * frameAspectRatio;
      } else {
        // Width is the constraint
        width = availableWidth;
        height = width / frameAspectRatio;
      }
      
      setContainerSize({ width, height });
    };
    
    calculateSize();
    window.addEventListener('resize', calculateSize);
    window.addEventListener('orientationchange', calculateSize);
    
    return () => {
      window.removeEventListener('resize', calculateSize);
      window.removeEventListener('orientationchange', calculateSize);
    };
  }, [frameWidth, frameHeight, frameImage]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div ref={containerRef} className={`flex items-center justify-center w-full h-full ${className}`}>
      {/* Camera view with calculated dimensions to fit viewport */}
      <div 
        className="relative bg-gray-900 overflow-hidden"
        style={{
          width: containerSize.width > 0 ? `${containerSize.width}px` : '100%',
          height: containerSize.height > 0 ? `${containerSize.height}px` : '100%',
        }}
      >
        {!capturedImage ? (
          <>
            {/* Live Video Stream - Cover the frame area, mirror if front camera */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
              }}
            />

            {/* Frame Overlay - Always on top */}
            {frameImage && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <img
                  src={frameOverlay}
                  alt="Frame overlay"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Camera Controls Overlay */}
            {stream && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20">
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  disabled={!isVideoReady}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white transition-colors shadow-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderWidth: '4px',
                    borderStyle: 'solid',
                    borderColor: captureButtonBorderColor
                  }}
                  aria-label="Capture photo"
                >
                  <div 
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: captureButtonColor }}
                  ></div>
                </button>

                {/* Switch Camera Button (mobile) */}
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg flex-shrink-0"
                    aria-label="Switch camera"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {error && !stream && (
              <div className="absolute inset-0 bg-red-900/90 flex items-center justify-center p-6 z-10">
                <div className="text-white text-center max-w-md">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-base md:text-lg font-semibold mb-2">Camera Error</p>
                  <p className="text-xs md:text-sm mb-4">{error}</p>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-4 py-2 md:px-6 md:py-2 bg-white text-red-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Start Camera Prompt */}
            {!stream && !isLoading && !error && (
              <button
                onClick={() => startCamera(facingMode)}
                className="absolute inset-0 flex items-center justify-center p-3 md:p-4 w-full h-full cursor-pointer transition-all z-10"
                style={{
                  background: `linear-gradient(to bottom right, ${captureButtonColor}dd, ${captureButtonColor}aa)`,
                }}
              >
                <div className="text-white text-center max-w-xs md:max-w-md">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-base md:text-lg font-semibold mb-2">{promptTitle}</p>
                  <p className="text-xs text-white/90">
                    {promptDescription}
                  </p>
                </div>
              </button>
            )}
          </>
        ) : (
          <>
            {/* Captured Image Preview */}
            <img
              src={capturedImage}
              alt="Captured photo"
              className="w-full h-full object-cover"
            />

            {/* Retake Button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
              <button
                onClick={retake}
                className="px-4 py-2 md:px-6 md:py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg text-sm md:text-base"
              >
                Retake Photo
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden Canvas for Image Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
