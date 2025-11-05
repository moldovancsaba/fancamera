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
}

export default function CameraCapture({ onCapture, onError, className = '', frameOverlay }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsLoading(false);
      
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
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and data URL
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture photo');
        return;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      
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
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      {/* Video Preview or Captured Image */}
      <div 
        className="relative w-full max-w-2xl bg-gray-900 rounded-lg overflow-hidden shadow-xl"
        style={{
          aspectRatio: frameImage ? `${frameImage.width} / ${frameImage.height}` : '16 / 9'
        }}
      >
        {!capturedImage ? (
          <>
            {/* Live Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Frame Overlay */}
            {frameImage && (
              <div className="absolute inset-0 pointer-events-none">
                <img
                  src={frameOverlay}
                  alt="Frame overlay"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Camera Controls Overlay */}
            {stream && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-blue-500 hover:bg-blue-50 transition-colors shadow-lg"
                  aria-label="Capture photo"
                >
                  <div className="w-full h-full rounded-full bg-blue-500"></div>
                </button>

                {/* Switch Camera Button (mobile) */}
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg"
                    aria-label="Switch camera"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {error && !stream && (
              <div className="absolute inset-0 bg-red-900/90 flex items-center justify-center p-6">
                <div className="text-white text-center max-w-md">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-semibold mb-2">Camera Error</p>
                  <p className="text-sm mb-4">{error}</p>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-6 py-2 bg-white text-red-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
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
                className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4 w-full h-full cursor-pointer hover:from-blue-800 hover:to-indigo-800 transition-colors"
              >
                <div className="text-white text-center max-w-md">
                  <svg className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-lg md:text-xl font-semibold mb-2">Ready to capture?</p>
                  <p className="text-xs md:text-sm text-blue-100">
                    Click to start your camera and take a photo
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
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={retake}
                className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
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
