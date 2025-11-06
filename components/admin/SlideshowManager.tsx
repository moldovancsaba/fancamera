'use client';

/**
 * Slideshow Manager Component
 * Version: 1.0.0
 * 
 * Client component for managing event slideshows from admin event detail page
 */

import { useState } from 'react';
import Link from 'next/link';

interface Slideshow {
  _id: string;
  slideshowId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  eventId: string;
  initialSlideshows: Slideshow[];
}

export default function SlideshowManager({ eventId, initialSlideshows }: Props) {
  const [slideshows, setSlideshows] = useState<Slideshow[]>(initialSlideshows);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSlideshow = async () => {
    const name = prompt('Enter slideshow name (e.g., "Main Screen", "VIP Lounge"):');
    if (!name) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/slideshows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSlideshows([...slideshows, data.slideshow]);
      } else {
        alert('Failed to create slideshow');
      }
    } catch (err) {
      alert('Failed to create slideshow');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSlideshow = async (slideshowId: string) => {
    if (!confirm('Delete this slideshow?')) return;

    try {
      const response = await fetch(`/api/slideshows?id=${slideshowId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSlideshows(slideshows.filter(s => s._id !== slideshowId));
      } else {
        alert('Failed to delete slideshow');
      }
    } catch (err) {
      alert('Failed to delete slideshow');
    }
  };

  const copySlideshowUrl = (slideshowId: string) => {
    const url = `${window.location.origin}/slideshow/${slideshowId}`;
    navigator.clipboard.writeText(url);
    alert('Slideshow URL copied to clipboard!');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              📺 Event Slideshows
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Display submissions on screens during the event
            </p>
          </div>
          <button
            onClick={handleCreateSlideshow}
            disabled={isCreating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : '➕ New Slideshow'}
          </button>
        </div>
      </div>

      {slideshows.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-5xl mb-4">📺</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No slideshows yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create a slideshow to display event photos on screens with smart playlist rotation
          </p>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slideshows.map((slideshow) => (
              <div
                key={slideshow._id}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {slideshow.name}
                    </h3>
                    <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      slideshow.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {slideshow.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSlideshow(slideshow._id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    🗑️
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(slideshow.createdAt).toLocaleDateString()}
                  </div>
                  <Link
                    href={`/slideshow/${slideshow.slideshowId}`}
                    target="_blank"
                    className="block w-full px-3 py-2 bg-purple-600 text-white rounded text-sm font-semibold hover:bg-purple-700 transition-colors text-center"
                  >
                    🎬 Open Slideshow
                  </Link>
                  <button
                    onClick={() => copySlideshowUrl(slideshow.slideshowId)}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    📋 Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
