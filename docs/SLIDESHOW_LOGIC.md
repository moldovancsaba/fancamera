# Slideshow Playlist Generation Logic

**Version:** 1.0.0  
**Last Updated:** 2025-11-06

This document explains how the photo frame application generates smart slideshows with automatic aspect ratio detection and mosaic layouts.

---

## Overview

The slideshow system ensures fair rotation of all submitted photos while optimizing screen space through intelligent mosaic creation. Photos are grouped by aspect ratio and displayed either full-screen (landscape) or in multi-image grids (portrait/square).

---

## 1. Submission Selection Algorithm

### Fetch Strategy

Submissions are fetched from MongoDB sorted by two criteria:

1. **`playCount` ASC** (least played first) - ensures fair rotation
2. **`createdAt` ASC** (oldest first) - within same play count, prioritize older photos

This two-tier sorting ensures every photo eventually gets displayed and no photo is "stuck" never being shown.

### Filtering

Only submissions matching **ALL** criteria are included:

- `eventIds` **contains** the current eventId (array field)
- `isArchived: false` (not archived)
- `hiddenFromEvents` does **NOT contain** eventId (not hidden from this specific event)
- Has valid image dimensions in `metadata.finalWidth` and `metadata.finalHeight`

---

## 2. Aspect Ratio Detection

### Detection Logic

**Location:** `/lib/slideshow/playlist.ts` lines 50-75

Images are categorized by their `width / height` ratio:

| **Category** | **Ratio Range** | **Examples** | **Typical Sources** |
|--------------|-----------------|--------------|---------------------|
| **Portrait (9:16)** | 0.4 - 0.7 | 1080×1920 (0.5625), 540×960 (0.5625) | Vertical phone camera shots |
| **Square (1:1)** | 0.8 - 1.2 | 1080×1080 (1.0), 540×540 (1.0) | Instagram-style square crops |
| **Landscape (16:9)** | > 1.2 | 1920×1080 (1.777), 2160×1440 (1.5), 2048×1365 (1.5) | Horizontal phone shots, DSLR photos, screenshots |
| **Fallback** | < 0.4 | Anything outside other ranges | Treated as landscape |

### Wide Tolerance - Critical Design Decision

The tolerance ranges are intentionally **WIDE** (e.g. accepting 1.5 ratio as landscape instead of strict 1.777 for 16:9).

#### Why Wide Tolerance?

- **Real-world diversity:** Images have diverse aspect ratios (3:2, 4:3, 16:10, etc.)
- **DSLR cameras:** Produce 3:2 (1.5) images
- **Phone variety:** Manufacturers vary (19.5:9, 20:9, etc.)
- **Screenshots:** Can be arbitrary dimensions

#### Impact

- **Ensures NO images get skipped** due to "unsupported" aspect ratio
- **Prevents repeated playback** of same few images while others never appear
- **Trades perfect aspect ratio purity for universal compatibility**

This is a **critical design choice** that ensures the system works with any user-uploaded content.

---

## 3. Mosaic Creation Rules

### Layout Strategy

**Location:** `/lib/slideshow/playlist.ts` lines 140-236

#### Landscape (16:9)

- **Layout:** Single full-screen image per slide
- **Requirements:** 1 image minimum
- **Display:** Fills entire 1920×1080 screen
- **Use Case:** Professional appearance for horizontal photos

#### Portrait (9:16)

- **Layout:** 3 images in horizontal row (3×1 mosaic)
- **Requirements:** Must have at least **3** portrait images available
- **Display:** Each image gets 640px width × 1080px height
- **Skip condition:** If fewer than 3 available, skip portrait slides in this playlist
- **Use Case:** Prevents wasted screen space with vertical photos

#### Square (1:1)

- **Layout:** 6 images in 3 columns × 2 rows (3×2 grid)
- **Requirements:** Must have at least **6** square images available
- **Display:** Each image gets 640×540 slot
- **Skip condition:** If fewer than 6 available, skip square mosaics in this playlist
- **Use Case:** Maximizes screen utilization for square photos

### Round-Robin Interleaving

Slides are added to playlist in rotation:

1. Add 1 landscape slide (if available)
2. Add 1 portrait mosaic (if 3+ available)
3. Add 1 square mosaic (if 6+ available)
4. **Repeat** until reaching slide limit (default: 10 slides)

This ensures:

- ✅ Fair distribution across aspect ratios
- ✅ Mosaics are properly spaced between landscape images
- ✅ No single aspect ratio dominates the slideshow

---

## 4. Play Count Tracking

### Update Mechanism

After slideshow display completes:

1. Extract all submission IDs from displayed slides (including all mosaic members)
2. Increment `playCount` by 1 for each submission
3. Update `lastPlayedAt` to current ISO 8601 timestamp
4. Update `slideshowPlays[slideshowId].count` and `slideshowPlays[slideshowId].lastPlayedAt`

### Effect on Next Playlist

- Next playlist generation fetches **least-played submissions first**
- Photos that just played have higher playCount, so drop to back of queue
- Ensures **automatic rotation through entire photo collection**

### Edge Case Handling

| **Scenario** | **Behavior** |
|--------------|--------------|
| All photos played equal times | Falls back to `createdAt` sorting (oldest first) |
| Fewer submissions than playlist limit | Playlist contains all available submissions |
| Aspect ratio groups empty | Those slide types skipped (no error) |
| No submissions available | Empty playlist returned |

---

## 5. Why This Approach Works

### Ensures Complete Coverage

- Every submission gets displayed eventually (no photos "stuck" unplayed)
- Fair rotation prevents favorites from dominating
- Least-played-first algorithm guarantees fairness

### Optimizes Screen Space

- Landscape photos get full-screen treatment (ideal for horizontal display)
- Portrait and square photos shown in groups (prevents wasted screen space)
- 1920×1080 canvas always filled efficiently

### Handles Real-World Diversity

- Wide aspect ratio tolerance accepts images from any source
- Graceful degradation when insufficient images for mosaics
- No rigid requirements that could break with user-uploaded content

### Maintains Visual Quality

- Full-screen landscape photos look professional
- Mosaics create visual interest with multiple images
- Consistent 1920×1080 output resolution

---

## 6. Implementation Reference

| **Component** | **Location** | **Purpose** |
|---------------|--------------|-------------|
| **Playlist Logic** | `/lib/slideshow/playlist.ts` | Core algorithm for generating playlists |
| **API Endpoint** | `/app/api/slideshows/[slideshowId]/playlist/route.ts` | REST API for fetching playlist |
| **Display Component** | `/app/slideshow/[slideshowId]/page.tsx` | Frontend slideshow player |
| **Schema Definition** | `/lib/db/schemas.ts` | Slideshow and Submission schemas |

---

## 7. Configuration

Current settings (can be adjusted in code):

| **Setting** | **Default Value** | **Location** |
|-------------|-------------------|--------------|
| Playlist size | 10 slides | `generatePlaylist(submissions, limit)` |
| Portrait mosaic | 3×1 grid (3 images) | `playlist.ts` line 173-205 |
| Square mosaic | 3×2 grid (6 images) | `playlist.ts` line 208-230 |
| Aspect ratio tolerance | See detection logic above | `detectAspectRatio()` function |

---

## 8. Common Questions

### Why are some photos displayed together in a grid?

Photos with similar aspect ratios (portrait or square) are grouped into mosaics to optimize screen space. A vertical photo displayed full-screen would waste most of the horizontal space on a 16:9 screen.

### Why isn't my photo appearing in the slideshow?

Possible reasons:

1. Photo is archived (`isArchived: true`)
2. Photo is hidden from this event (`hiddenFromEvents` contains eventId)
3. Photo has high playCount (will appear later in rotation)
4. Photo doesn't have valid dimensions in metadata

### Can I adjust the mosaic grid sizes?

Yes, edit `/lib/slideshow/playlist.ts`:

- Portrait mosaic: Change line 173 condition `portraitIdx + 2 < portrait.length` to adjust number of images
- Square mosaic: Change line 208 condition `squareIdx + 5 < square.length` and loop on line 211

### How often does the playlist refresh?

The playlist is generated fresh on each API request to `/api/slideshows/[slideshowId]/playlist`. The frontend calls this API periodically (default: every time the buffer needs refilling) to ensure new submissions appear automatically.

---

## 9. Future Enhancements

Potential improvements for consideration:

- **Weighted rotation:** Allow admins to "boost" certain submissions
- **Time-based filters:** Only show submissions from last N hours
- **User preferences:** Let users favorite photos for more frequent display
- **Dynamic mosaic sizes:** Adjust grid based on available submissions
- **Transition effects:** Smooth animations between slides

---

**Last Updated:** 2025-11-06  
**Maintained By:** Camera Development Team
