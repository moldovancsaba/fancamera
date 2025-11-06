/**
 * Slideshow Playlist Generation
 * Version: 1.0.0
 * 
 * Generates smart playlists for event slideshows with aspect ratio detection
 * and mosaic layouts for non-16:9 images.
 * 
 * Playlist Logic:
 * - Always select the 5 least-played submissions (sorted by playCount ASC, createdAt ASC)
 * - Detect aspect ratio from image dimensions
 * - Group by aspect ratio: 16:9, 1:1, 9:16
 * - Create mosaics: 1:1 → 2x1 layout, 9:16 → 3x1 layout
 * - Skip 1:1 and 9:16 if insufficient images for complete mosaic
 */

import { Submission } from '@/lib/db/schemas';

/**
 * Aspect Ratio Categories
 */
export enum AspectRatio {
  LANDSCAPE = '16:9',  // Horizontal images (full screen)
  SQUARE = '1:1',      // Square images (2x1 mosaic)
  PORTRAIT = '9:16',   // Vertical images (3x1 mosaic)
  UNKNOWN = 'unknown', // Cannot determine or unsupported
}

/**
 * Slide Type - represents what will be displayed
 */
export interface Slide {
  type: 'single' | 'mosaic';
  aspectRatio: AspectRatio;
  submissions: Array<{
    _id: string;
    imageUrl: string;
    width: number;
    height: number;
  }>;
}

/**
 * Detect aspect ratio from image dimensions
 * Uses tolerance for floating point comparison
 */
export function detectAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  const tolerance = 0.1; // 10% tolerance for aspect ratio detection
  
  // 16:9 = 1.777...
  if (Math.abs(ratio - 16/9) < tolerance) {
    return AspectRatio.LANDSCAPE;
  }
  
  // 1:1 = 1.0
  if (Math.abs(ratio - 1.0) < tolerance) {
    return AspectRatio.SQUARE;
  }
  
  // 9:16 = 0.5625
  if (Math.abs(ratio - 9/16) < tolerance) {
    return AspectRatio.PORTRAIT;
  }
  
  return AspectRatio.UNKNOWN;
}

/**
 * Generate playlist of next N slides from submissions
 * 
 * @param submissions - Array of submissions sorted by playCount ASC, createdAt ASC
 * @param limit - Maximum number of slides to generate (default: 10)
 * @returns Array of Slide objects ready for display
 */
export function generatePlaylist(submissions: any[], limit: number = 10): Slide[] {
  const playlist: Slide[] = [];
  const processedIds = new Set<string>();
  
  // Group submissions by aspect ratio
  const landscape: any[] = [];
  const square: any[] = [];
  const portrait: any[] = [];
  
  for (const submission of submissions) {
    if (processedIds.has(submission._id.toString())) continue;
    
    // Detect aspect ratio from metadata
    // Fallback to 16:9 (1920x1080) for old submissions without dimensions
    const width = submission.metadata?.finalWidth || submission.metadata?.originalWidth || 1920;
    const height = submission.metadata?.finalHeight || submission.metadata?.originalHeight || 1080;
    
    // Note: We use 16:9 as default aspect ratio for submissions without metadata
    // This ensures old submissions still appear in slideshows
    
    const aspectRatio = detectAspectRatio(width, height);
    
    switch (aspectRatio) {
      case AspectRatio.LANDSCAPE:
        landscape.push(submission);
        break;
      case AspectRatio.SQUARE:
        square.push(submission);
        break;
      case AspectRatio.PORTRAIT:
        portrait.push(submission);
        break;
      default:
        // Skip unknown aspect ratios
        break;
    }
  }
  
  // Build playlist: prioritize 16:9, then mosaics
  // Generate up to limit slides
  let slideCount = 0;
  let landscapeIdx = 0;
  let squareIdx = 0;
  let portraitIdx = 0;
  
  while (slideCount < limit) {
    let added = false;
    
    // Try to add 16:9 landscape image (full screen)
    if (landscapeIdx < landscape.length) {
      const sub = landscape[landscapeIdx];
      playlist.push({
        type: 'single',
        aspectRatio: AspectRatio.LANDSCAPE,
        submissions: [{
          _id: sub._id.toString(),
          imageUrl: sub.imageUrl || sub.finalImageUrl,
          width: sub.metadata?.finalWidth || sub.metadata?.originalWidth || 1920,
          height: sub.metadata?.finalHeight || sub.metadata?.originalHeight || 1080,
        }],
      });
      processedIds.add(sub._id.toString());
      landscapeIdx++;
      slideCount++;
      added = true;
    }
    
    // Try to add 1:1 mosaic (2 images side-by-side)
    if (slideCount < limit && squareIdx + 1 < square.length) {
      const sub1 = square[squareIdx];
      const sub2 = square[squareIdx + 1];
      playlist.push({
        type: 'mosaic',
        aspectRatio: AspectRatio.SQUARE,
        submissions: [
          {
            _id: sub1._id.toString(),
            imageUrl: sub1.imageUrl || sub1.finalImageUrl,
            width: sub1.metadata?.finalWidth || sub1.metadata?.originalWidth || 800,
            height: sub1.metadata?.finalHeight || sub1.metadata?.originalHeight || 800,
          },
          {
            _id: sub2._id.toString(),
            imageUrl: sub2.imageUrl || sub2.finalImageUrl,
            width: sub2.metadata?.finalWidth || sub2.metadata?.originalWidth || 800,
            height: sub2.metadata?.finalHeight || sub2.metadata?.originalHeight || 800,
          },
        ],
      });
      processedIds.add(sub1._id.toString());
      processedIds.add(sub2._id.toString());
      squareIdx += 2;
      slideCount++;
      added = true;
    }
    
    // Try to add 9:16 mosaic (3 images side-by-side)
    if (slideCount < limit && portraitIdx + 2 < portrait.length) {
      const sub1 = portrait[portraitIdx];
      const sub2 = portrait[portraitIdx + 1];
      const sub3 = portrait[portraitIdx + 2];
      playlist.push({
        type: 'mosaic',
        aspectRatio: AspectRatio.PORTRAIT,
        submissions: [
          {
            _id: sub1._id.toString(),
            imageUrl: sub1.imageUrl || sub1.finalImageUrl,
            width: sub1.metadata?.finalWidth || sub1.metadata?.originalWidth || 540,
            height: sub1.metadata?.finalHeight || sub1.metadata?.originalHeight || 960,
          },
          {
            _id: sub2._id.toString(),
            imageUrl: sub2.imageUrl || sub2.finalImageUrl,
            width: sub2.metadata?.finalWidth || sub2.metadata?.originalWidth || 540,
            height: sub2.metadata?.finalHeight || sub2.metadata?.originalHeight || 960,
          },
          {
            _id: sub3._id.toString(),
            imageUrl: sub3.imageUrl || sub3.finalImageUrl,
            width: sub3.metadata?.finalWidth || sub3.metadata?.originalWidth || 540,
            height: sub3.metadata?.finalHeight || sub3.metadata?.originalHeight || 960,
          },
        ],
      });
      processedIds.add(sub1._id.toString());
      processedIds.add(sub2._id.toString());
      processedIds.add(sub3._id.toString());
      portraitIdx += 3;
      slideCount++;
      added = true;
    }
    
    // If nothing was added, we've exhausted all options
    if (!added) break;
  }
  
  return playlist;
}

/**
 * Extract all submission IDs from a playlist
 * Used to update play counts after display
 */
export function extractSubmissionIds(playlist: Slide[]): string[] {
  const ids: string[] = [];
  for (const slide of playlist) {
    for (const submission of slide.submissions) {
      ids.push(submission._id);
    }
  }
  return ids;
}
