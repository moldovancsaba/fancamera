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
  bufferSize?: number;
  transitionDurationMs?: number;
  fadeDurationMs?: number;
  refreshStrategy?: 'continuous' | 'batch';
}

interface Props {
  eventId: string;
  initialSlideshows: Slideshow[];
}

export default function SlideshowManager({ eventId, initialSlideshows }: Props) {
  const [slideshows, setSlideshows] = useState<Slideshow[]>(initialSlideshows);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSlideshow, setEditingSlideshow] = useState<Slideshow | null>(null);

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

  const handleEditSlideshow = async (updated: Slideshow) => {
    try {
      const response = await fetch(`/api/slideshows?id=${updated._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          bufferSize: updated.bufferSize,
          transitionDurationMs: updated.transitionDurationMs,
          fadeDurationMs: updated.fadeDurationMs,
          refreshStrategy: updated.refreshStrategy,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSlideshows(slideshows.map(s => s._id === updated._id ? data.slideshow : s));
        setEditingSlideshow(null);
      } else {
        alert('Failed to update slideshow');
      }
    } catch (err) {
      alert('Failed to update slideshow');
    }
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSlideshow(slideshow)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                      title="Settings"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={() => handleDeleteSlideshow(slideshow._id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
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

      {/* Settings Dialog */}
      {editingSlideshow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Slideshow Settings
            </h3>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingSlideshow.name}
                  onChange={(e) => setEditingSlideshow({ ...editingSlideshow, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Buffer Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Buffer Size (slides in memory)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editingSlideshow.bufferSize || 10}
                  onChange={(e) => setEditingSlideshow({ ...editingSlideshow, bufferSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Higher = more memory, lower = faster refresh
                </p>
              </div>

              {/* Transition Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slide Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={(editingSlideshow.transitionDurationMs || 5000) / 1000}
                  onChange={(e) => setEditingSlideshow({ ...editingSlideshow, transitionDurationMs: parseInt(e.target.value) * 1000 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Fade Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fade Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={(editingSlideshow.fadeDurationMs || 1000) / 1000}
                  onChange={(e) => setEditingSlideshow({ ...editingSlideshow, fadeDurationMs: parseFloat(e.target.value) * 1000 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Refresh Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refresh Strategy
                </label>
                <select
                  value={editingSlideshow.refreshStrategy || 'continuous'}
                  onChange={(e) => setEditingSlideshow({ ...editingSlideshow, refreshStrategy: e.target.value as 'continuous' | 'batch' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="continuous">Continuous (background refresh)</option>
                  <option value="batch">Batch (reload all at once)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleEditSlideshow(editingSlideshow)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingSlideshow(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
