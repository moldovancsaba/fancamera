'use client';

/**
 * Slideshow Player with Rolling Buffer
 * Version: 2.0.0
 * 
 * Infinite smooth playback with continuous background refresh
 * - Rolling N-slide buffer (configurable)
 * - Fetch 1 candidate per transition (non-blocking)
 * - Image preloading for smooth transitions
 * - Resilient to network failures
 * - Supports 16:9, 1:1 (2x1 mosaic), 9:16 (3x1 mosaic)
 */

import { useEffect, useState, useRef, use } from 'react';

interface Submission {
  _id: string;
  imageUrl: string;
  width: number;
  height: number;
}

interface Slide {
  type: 'single' | 'mosaic';
  aspectRatio: '16:9' | '1:1' | '9:16';
  submissions: Submission[];
}

interface SlideshowSettings {
  _id: string;
  name: string;
  eventName: string;
  transitionDurationMs: number;
  fadeDurationMs: number;
  bufferSize: number;
  refreshStrategy: 'continuous' | 'batch';
}

export default function SlideshowPlayerV2({
  params,
}: {
  params: Promise<{ slideshowId: string }>;
}) {
  const resolvedParams = use(params);
  const { slideshowId } = resolvedParams;

  // Slideshow state
  const [settings, setSettings] = useState<SlideshowSettings | null>(null);
  const [buffer, setBuffer] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const isFetchingCandidate = useRef(false);

  // Helper: Get all submission IDs from buffer
  const getBufferSubmissionIds = (): string[] => {
    const ids: string[] = [];
    buffer.forEach(slide => {
      slide.submissions.forEach(sub => ids.push(sub._id));
    });
    return ids;
  };

  // Helper: Preload image
  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.current.has(url)) {
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        preloadedImages.current.set(url, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        reject();
      };
      img.src = url;
    });
  };

  // Helper: Preload all images in a slide
  const preloadSlide = async (slide: Slide): Promise<void> => {
    const promises = slide.submissions.map(sub => 
      preloadImage(sub.imageUrl).catch(() => {}) // Ignore failures
    );
    await Promise.all(promises);
  };

  // Initial load: Fetch buffer-sized playlist
  const loadInitialBuffer = async () => {
    try {
      console.log('Loading initial buffer for slideshow:', slideshowId);
      
      const response = await fetch(`/api/slideshows/${slideshowId}/playlist`);
      if (!response.ok) {
        throw new Error(`Failed to load slideshow: ${response.status}`);
      }

      const data = await response.json();
      console.log('Initial playlist loaded:', data.playlist.length, 'slides');

      if (!data.slideshow || !data.playlist) {
        throw new Error('Invalid slideshow data');
      }

      setSettings(data.slideshow);
      setBuffer(data.playlist);

      // Preload all images in buffer (parallel)
      if (data.playlist.length > 0) {
        console.log('Preloading', data.playlist.length, 'slides...');
        await Promise.all(data.playlist.map(preloadSlide));
        console.log('Preload complete');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load initial buffer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load slideshow');
      setIsLoading(false);
    }
  };

  // Background refresh: Fetch next best candidate
  const fetchNextCandidate = async () => {
    if (isFetchingCandidate.current || buffer.length === 0) return;

    isFetchingCandidate.current = true;

    try {
      const excludeIds = getBufferSubmissionIds();
      const response = await fetch(
        `/api/slideshows/${slideshowId}/next-candidate?excludeIds=${excludeIds.join(',')}`
      );

      if (!response.ok) {
        console.warn('Next candidate fetch failed:', response.status);
        return;
      }

      const data = await response.json();

      if (data.candidate) {
        console.log('New candidate fetched, preloading...');
        
        // Preload new candidate images
        await preloadSlide(data.candidate).catch(() => {
          console.warn('Failed to preload candidate');
        });

        // Add to buffer, remove oldest
        setBuffer(prevBuffer => {
          const newBuffer = [...prevBuffer];
          newBuffer.push(data.candidate);
          
          // Keep buffer at configured size
          if (settings && newBuffer.length > settings.bufferSize) {
            newBuffer.shift(); // Remove oldest
          }
          
          console.log('Buffer updated:', newBuffer.length, 'slides');
          return newBuffer;
        });
      } else {
        console.log('No new candidates available');
      }
    } catch (err) {
      console.warn('Failed to fetch next candidate:', err);
      // Silently fail - continue with existing buffer
    } finally {
      isFetchingCandidate.current = false;
    }
  };

  // Update play counts for displayed slide
  const updatePlayCounts = async (slide: Slide) => {
    try {
      const submissionIds = slide.submissions.map(s => s._id);
      await fetch(`/api/slideshows/${slideshowId}/played`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds }),
      });
    } catch (err) {
      console.warn('Failed to update play counts:', err);
    }
  };

  // Load initial buffer on mount
  useEffect(() => {
    loadInitialBuffer();
  }, [slideshowId]);

  // Auto-advance slides with background refresh
  useEffect(() => {
    if (!settings || !isPlaying || buffer.length === 0) return;

    // Start fade out before transition
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, settings.transitionDurationMs - settings.fadeDurationMs);

    // Advance to next slide after fade completes
    const advanceTimer = setTimeout(async () => {
      const currentSlide = buffer[currentIndex];
      
      // Update play counts for current slide
      if (currentSlide) {
        updatePlayCounts(currentSlide);
      }

      // Background fetch next candidate (non-blocking)
      if (settings.refreshStrategy === 'continuous') {
        fetchNextCandidate();
      }

      // Advance to next slide
      const nextIndex = (currentIndex + 1) % buffer.length;
      setCurrentIndex(nextIndex);
      setFadeOut(false); // Reset fade for next slide
    }, settings.transitionDurationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(advanceTimer);
    };
  }, [settings, currentIndex, isPlaying]); // Removed buffer dependency to prevent timer reset

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls in fullscreen
  const handleMouseMove = () => {
    if (!isFullscreen) return;
    
    setShowControls(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'ArrowRight' && buffer.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % buffer.length);
      } else if (e.key === 'ArrowLeft' && buffer.length > 0) {
        setCurrentIndex((prev) => (prev - 1 + buffer.length) % buffer.length);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [buffer]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="text-white text-2xl">Loading slideshow...</div>
      </div>
    );
  }

  // Error state
  if (error || !settings) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="text-red-500 text-2xl">{error || 'Slideshow not found'}</div>
      </div>
    );
  }

  // Empty buffer state
  if (buffer.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">📸</div>
          <div className="text-2xl">{settings.name}</div>
          <div className="text-gray-400 mt-2">No submissions yet</div>
        </div>
      </div>
    );
  }

  const currentSlide = buffer[currentIndex];

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Slideshow Canvas - 16:9 aspect ratio */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Slide Content */}
        <div
          className="relative bg-black flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '1920px',
            maxHeight: '1080px',
            aspectRatio: '16/9',
          }}
        >
          {currentSlide.type === 'single' ? (
            // Single 16:9 image (full screen)
            <img
              key={currentSlide.submissions[0]._id}
              src={currentSlide.submissions[0].imageUrl}
              alt="Slideshow image"
              className="w-full h-full object-contain transition-opacity duration-1000"
              style={{ opacity: fadeOut ? 0 : 1 }}
            />
          ) : currentSlide.aspectRatio === '1:1' ? (
            // 1:1 Mosaic - 2 images side by side (800x800 each)
            <div 
              className="flex items-center justify-center gap-8 w-full h-full px-8 transition-opacity duration-1000"
              style={{ opacity: fadeOut ? 0 : 1 }}
            >
              {currentSlide.submissions.map((sub) => (
                <img
                  key={sub._id}
                  src={sub.imageUrl}
                  alt="Mosaic image"
                  className="object-contain"
                  style={{
                    maxWidth: '800px',
                    maxHeight: '800px',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
              ))}
            </div>
          ) : (
            // 9:16 Mosaic - 3 images side by side (540x960 each)
            <div 
              className="flex items-center justify-center gap-6 w-full h-full px-6 transition-opacity duration-1000"
              style={{ opacity: fadeOut ? 0 : 1 }}
            >
              {currentSlide.submissions.map((sub) => (
                <img
                  key={sub._id}
                  src={sub.imageUrl}
                  alt="Mosaic image"
                  className="object-contain"
                  style={{
                    maxWidth: '540px',
                    maxHeight: '960px',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls Overlay - YouTube/Netflix style */}
        {(!isFullscreen || showControls) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity">
            <div className="max-w-7xl mx-auto">
              {/* Title */}
              <div className="mb-4">
                <h1 className="text-white text-2xl font-bold">{settings.name}</h1>
                <p className="text-gray-300 text-sm">{settings.eventName}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:text-gray-300 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Progress */}
                <div className="flex-1 text-white text-sm">
                  Slide {currentIndex + 1} of {buffer.length} • Buffer: {settings.bufferSize}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
