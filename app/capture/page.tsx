/**
 * Photo Capture Page
 * Version: 1.2.0
 * 
 * Main page for capturing photos with frame overlays.
 * Users select a frame, take/upload photo, and save result.
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import CameraCapture from '@/components/camera/CameraCapture';
import FileUpload from '@/components/camera/FileUpload';

interface Frame {
  _id: string;
  name: string;
  description?: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
}

export default function CapturePage() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select-frame' | 'capture-photo' | 'preview'>('select-frame');

  // Fetch active frames
  useEffect(() => {
    async function fetchFrames() {
      try {
        const response = await fetch('/api/frames?active=true');
        const data = await response.json();
        setFrames(data.frames || []);
      } catch (error) {
        console.error('Error fetching frames:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFrames();
  }, []);

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
      // Create canvas for composition
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load captured photo
      const photoImg = new window.Image();
      photoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        photoImg.onload = resolve;
        photoImg.onerror = reject;
        photoImg.src = capturedImage;
      });

      // Set canvas size to photo size
      canvas.width = photoImg.width;
      canvas.height = photoImg.height;

      // Draw photo
      ctx.drawImage(photoImg, 0, 0);

      // Load and draw frame overlay
      const frameImg = new window.Image();
      frameImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve;
        frameImg.onerror = reject;
        frameImg.src = selectedFrame.imageUrl;
      });

      // Draw frame on top (scaled to match photo)
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const composite = canvas.toDataURL('image/png', 0.95);
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

  const handleDownload = () => {
    if (!compositeImage) return;

    const link = document.createElement('a');
    link.href = compositeImage;
    link.download = `camera-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    setSelectedFrame(null);
    setCapturedImage(null);
    setCompositeImage(null);
    setStep('select-frame');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <p className="text-gray-600 dark:text-gray-400">Loading frames...</p>
        </div>
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🖼️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Frames Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There are no frames available yet. Please check back later!
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📸 Take a Photo
            </h1>
            <a
              href="/"
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Back
            </a>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'select-frame' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-frame' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                1
              </div>
              <span className="font-medium">Select Frame</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
            <div className={`flex items-center gap-2 ${step === 'capture-photo' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'capture-photo' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                2
              </div>
              <span className="font-medium">Capture Photo</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
            <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                3
              </div>
              <span className="font-medium">Preview & Save</span>
            </div>
          </div>
        </div>

        {/* Step 1: Frame Selection */}
        {step === 'select-frame' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Choose a Frame
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {frames.map((frame) => (
                <button
                  key={frame._id}
                  onClick={() => handleFrameSelect(frame)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 transition-colors overflow-hidden"
                >
                  <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={frame.thumbnailUrl}
                      alt={frame.name}
                      fill
                      className="object-contain p-4"
                      unoptimized
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{frame.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{frame.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Photo Capture */}
        {step === 'capture-photo' && selectedFrame && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Capture Your Photo
                </h2>
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

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Take Photo</h3>
                <CameraCapture onCapture={handlePhotoCapture} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Or Upload Image</h3>
                <FileUpload onUpload={handlePhotoCapture} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && compositeImage && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Preview Your Photo
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    💾 Download
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    📸 Take Another
                  </button>
                </div>
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
