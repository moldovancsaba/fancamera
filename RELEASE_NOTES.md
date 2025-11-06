# RELEASE_NOTES.md

**Project**: Camera — Photo Frame Webapp
**Current Version**: 1.5.0
**Last Updated**: 2025-04-27T11:35:20.000Z

This document tracks all completed tasks and version releases in chronological order, following semantic versioning format.

---

## [v1.5.0] — 2025-04-27T11:35:20.000Z

### Feature — Per-Slideshow Play Tracking and Fixed Mosaic Generation

**Status**: Complete
**Release Type**: Minor

#### Added
- ✅ Per-slideshow play count tracking (not just global)
- ✅ Event gallery shows play counts for each specific slideshow
- ✅ Fixed mosaic generation to properly interleave portrait/square mosaics with landscape
- ✅ Fixed flashing issue - smooth fade transitions instead of instant cuts
- ✅ Stabilized timer to prevent buffer updates from causing rapid transitions

#### Schema Changes
**New field**: `submissions.slideshowPlays`
```typescript
slideshowPlays?: Record<string, {
  count: number;
  lastPlayedAt: string;
}>;
```

#### Play Count Display
**Event Gallery** hover now shows:
```
🎬 Main Screen: 15×
🎬 VIP Lounge: 8×
Total: 23×
```

#### Mosaic Generation Fix
Changed from sequential (all landscape → all mosaics) to round-robin:
1. Add 1 landscape slide (if available)
2. Add 1 portrait mosaic (if 3 available)
3. Add 1 square mosaic (if 2 available)
4. Repeat until buffer full

This ensures mosaics are properly distributed instead of appearing individually.

#### Slideshow Timing Fix
**Problem**: Buffer updates triggered timer reset, causing images to flash rapidly
**Solution**: 
- Removed `buffer` from useEffect dependency array
- Implemented proper fade transitions using opacity + CSS transitions
- Fade starts (transitionDuration - fadeDuration) before slide change
- Timer now stable regardless of background buffer updates

#### Files Modified
- `lib/db/schemas.ts` — Added slideshowPlays field
- `app/api/slideshows/[slideshowId]/played/route.ts` — Track per-slideshow plays
- `lib/slideshow/playlist.ts` — Fixed mosaic interleaving with round-robin
- `app/slideshow/[slideshowId]/page.tsx` — Fixed timing and added fade transitions
- `app/admin/events/[id]/page.tsx` — Display per-slideshow play counts
- `package.json` — Version 1.4.1 → 1.5.0
- `RELEASE_NOTES.md` — Added this release entry

#### Debug Improvements
Added logging:
```
[Playlist] Added landscape slide (1/10)
[Playlist] Added portrait mosaic (2/10)
[Playlist] Added square mosaic (3/10)
```

---

## [v1.4.1] — 2025-04-27T11:12:45.000Z

### Bugfix — Slideshow Rolling Buffer and Aspect Ratio Detection

**Status**: Complete
**Release Type**: Patch

#### Fixed
- ✅ Playlist API now returns complete settings (bufferSize, refreshStrategy)
- ✅ Frontend now receives buffer configuration for rolling refresh
- ✅ Added debug logging for aspect ratio detection
- ✅ Logs show dimension → aspect ratio mapping for troubleshooting

#### Issues Addressed
1. **Rolling buffer not refreshing**: API wasn't returning `bufferSize` and `refreshStrategy` to frontend
2. **No mosaics appearing**: Added logging to diagnose aspect ratio detection

#### Debug Output
Server logs now show:
```
[Playlist] 507f1f77bcf86cd799439011: 1080x1920 → 9:16 (ratio: 0.562)
[Playlist] Building playlist from: 15 landscape, 4 square, 6 portrait
```

#### Files Modified
- `app/api/slideshows/[slideshowId]/playlist/route.ts` — Return bufferSize/refreshStrategy
- `lib/slideshow/playlist.ts` — Add debug logging for aspect ratio detection
- `package.json` — Version 1.4.0 → 1.4.1
- `RELEASE_NOTES.md` — Added this release entry

#### Next Steps for User
Check server logs when slideshow loads to see:
1. What dimensions are being detected for each image
2. What aspect ratios they're classified as
3. How many of each type are available for mosaics

If no mosaics appear, logs will show if there are insufficient square (need 2) or portrait (need 3) images.

---

## [v1.4.0] — 2025-04-27T10:45:18.000Z

### Feature — Slideshow Play Count Display

**Status**: Complete
**Release Type**: Minor

#### Added
- ✅ Play count display in event gallery (hover overlay)
- ✅ Play count badge in admin submissions page
- ✅ Shows "🎬 Played X times" for images used in slideshows
- ✅ Only displays when playCount > 0

#### User Experience
**Event Gallery** (`/admin/events/[id]`):
- Hover over any submission to see play count in the overlay
- Displays below the date in white text

**Admin Submissions** (`/admin/submissions`):
- Purple badge showing slideshow play count
- Positioned prominently above action buttons

#### Technical Details
- Play counts are automatically tracked by the `/api/slideshows/[id]/played` endpoint
- Incremented each time an image is displayed in a slideshow
- Stored in `submissions.playCount` field
- Conditional rendering ensures clean UI when playCount is 0 or undefined

#### Files Modified
- `app/admin/events/[id]/page.tsx` — Added play count to gallery hover overlay
- `app/admin/submissions/page.tsx` — Added play count badge
- `package.json` — Version 1.3.1 → 1.4.0
- `RELEASE_NOTES.md` — Added this release entry

#### Slideshow Settings Location
Slideshow settings (⚙️ button) are located in:
- Admin → Events → [Event Details] page
- In the "Event Slideshows" section
- Each slideshow card has a ⚙️ button next to the delete button
- Opens dialog with: Name, Buffer Size, Slide Duration, Fade Duration, Refresh Strategy

---

## [v1.3.1] — 2025-04-27T10:15:32.000Z

### Bugfix — Slideshow Settings UI Build Error

**Status**: Complete
**Release Type**: Patch

#### Fixed
- ✅ JSX syntax error in `components/admin/SlideshowManager.tsx` at line 201
- ✅ Incorrect closing brace structure in ternary conditional rendering
- ✅ Build now succeeds without errors

#### Technical Details
- Changed line 201 from `)}` to `</div>` to properly close the `<div className="p-6">` container
- Moved ternary closing `)}` to line 202 where it correctly closes the conditional expression
- Settings dialog functionality verified: edit button (⚙️), form fields, Save/Cancel actions

#### Files Modified
- `components/admin/SlideshowManager.tsx` — Fixed JSX structure
- `package.json` — Version 1.3.0 → 1.3.1
- `RELEASE_NOTES.md` — Added this release entry

---

## [v1.3.0] — 2025-04-27T09:30:00.000Z

### Feature — Rolling Buffer Slideshow System

**Status**: Complete
**Release Type**: Minor

#### Added
- ✅ Complete rolling buffer slideshow architecture for infinite smooth playback
- ✅ Backend APIs: playlist, next-candidate, played tracking, slideshow CRUD
- ✅ Settings UI with configurable buffer size, timing, refresh strategy
- ✅ Image preloading system with background refresh
- ✅ Resilient to network failures — continues with existing buffer
- ✅ Fullscreen support with keyboard controls (F, Space, Arrows)

#### Technical Implementation
**Schema Updates**:
- Added `bufferSize` (default 10), `refreshStrategy` ('continuous' | 'batch') to Slideshow
- Added `playCount`, `lastPlayedAt` to Submission for least-played tracking

**APIs Created**:
- `GET /api/slideshows/[id]/playlist?limit=N` — Returns initial buffer
- `GET /api/slideshows/[id]/next-candidate?excludeIds=...` — Returns single best slide
- `POST /api/slideshows/[id]/played` — Updates play counts
- `PATCH /api/slideshows?id=...` — Updates slideshow settings

**Player Features**:
- N-slide buffer in memory (configurable 1-50)
- Fetches 1 candidate per transition (background, non-blocking)
- Buffer rotation: push new, shift oldest
- Displays "Slide X of Y • Buffer: N" in controls

**Settings UI**:
- Name, Buffer Size (1-50 slides)
- Slide Duration (1-60 seconds)
- Fade Duration (0-5 seconds)
- Refresh Strategy (continuous/batch)
- ⚙️ button next to delete button for each slideshow

#### Files Modified
- `lib/db/schemas.ts` — Added bufferSize, refreshStrategy, playCount, lastPlayedAt
- `lib/slideshow/playlist.ts` — Configurable limit parameter
- `app/api/slideshows/route.ts` — Added PATCH endpoint
- `app/api/slideshows/[slideshowId]/next-candidate/route.ts` — NEW
- `app/slideshow/[slideshowId]/page.tsx` — Complete rewrite with rolling buffer
- `components/admin/SlideshowManager.tsx` — Added settings dialog

---

## [v1.2.1] — 2025-04-27T08:45:00.000Z

### Bugfix — Legacy Submission Dimensions

**Status**: Complete
**Release Type**: Patch

#### Fixed
- ✅ Slideshow playlist generator now uses fallback dimensions (1920x1080) for old submissions without imageWidth/imageHeight
- ✅ All images now display correctly in slideshows

#### Files Modified
- `lib/slideshow/playlist.ts` — Added fallback dimension logic

---

## [v1.2.0] — 2025-04-27T08:30:00.000Z

### Documentation — MongoDB Reference Conventions

**Status**: Complete
**Release Type**: Minor

#### Added
- ✅ Comprehensive MongoDB reference conventions documentation
- ✅ Added image dimensions to submissions API for aspect ratio detection
- ✅ Updated capture page to send canvas dimensions

#### Files Created
- `docs/MONGODB_CONVENTIONS.md` — Complete reference guide

#### Convention Rules
- URLs: use MongoDB `_id` as string
- Same-collection queries: `{ _id: new ObjectId(id) }`
- Foreign key storage: `_id.toString()` stored as string
- Display IDs (UUID): Only for external APIs and obfuscation

#### Files Modified
- `app/api/submissions/route.ts` — Added imageWidth/Height params
- `app/capture/[eventId]/page.tsx` — Sends canvas dimensions

---

## [v1.0.0] — 2025-11-03T18:31:18.000Z

### Initial Project Planning and Documentation

**Status**: Planning Phase
**Release Type**: Initial Setup

#### Added
- ✅ Complete project planning and architecture definition
- ✅ Comprehensive 15-task execution plan created
- ✅ README.md with complete project overview, features, tech stack
- ✅ WARP.DEV_AI_CONVERSATION.md with AI development rules and session tracking
- ✅ TASKLIST.md with all active and planned tasks
- ✅ ROADMAP.md with forward-looking development plans through 2027
- ✅ RELEASE_NOTES.md (this file) for versioned changelog

#### Documentation Created
**Core Documentation**:
1. README.md — Project overview, quickstart, documentation index
2. WARP.DEV_AI_CONVERSATION.md — AI session log, conventions, Q&A
3. TASKLIST.md — 15 tasks with dependencies and acceptance criteria
4. ROADMAP.md — Future development plans by quarter
5. RELEASE_NOTES.md — This versioned changelog

#### Requirements Defined
**User Features**:
- Photo capture via webcam (mobile + desktop support mandatory)
- File upload alternative
- Pre-designed graphical frame selection and application
- Automatic image composition (no user positioning/resizing)
- Social media sharing (Facebook, Twitter/X, Instagram, LinkedIn, WhatsApp)
- Shareable links with Open Graph metadata
- User profile with complete submission history
- Image gallery with pagination ("Load 20 more" pattern)
- Download and re-share previous submissions

**Admin Features**:
- Frame management system (CRUD operations)
- Frame upload supporting PNG, SVG, HTML Canvas formats
- Frame metadata management
- Admin-only access protection
- Frame preview and activation controls

**Technical Features**:
- SSO authentication via sso.doneisbetter.com (OAuth2/OIDC with PKCE)
- MongoDB Atlas for metadata storage
- imgbb.com CDN for image hosting
- Email delivery of final images (Resend)
- Canvas API for image composition
- Comprehensive metadata tracking (userId, frameId, device, location, timestamp, IP)
- Session management (30-day sliding expiration)
- Token refresh rotation
- Rate limiting
- CSRF protection
- Input validation and sanitization

#### Architecture Decisions
**Technology Stack**:
- Next.js 15+ with App Router
- React 18+ with TypeScript (strict mode)
- ES Modules (type: "module" in package.json)
- MongoDB Atlas database
- imgbb.com API for image CDN
- Resend for email delivery
- Vercel hosting with automatic GitHub deployments
- Node.js 18.x, 20.x, or 22.x

**Database Schema**:
- `frames` collection: Frame templates with metadata
- `submissions` collection: User photo submissions with comprehensive tracking
- `users_cache` collection: Optional SSO user data cache

**API Structure**:
- `/api/auth/*` — SSO authentication endpoints
- `/api/frames/*` — Frame management (admin only)
- `/api/submissions/*` — Photo submission and retrieval
- `/api/share/*` — Public share pages

**Component Organization**:
- `components/camera/` — Camera capture logic
- `components/frames/` — Frame selection and preview
- `components/admin/` — Admin interface
- `components/profile/` — User profile and gallery
- `components/shared/` — Reusable components

#### Development Rules Established
**Version Control Protocol**:
- PATCH (1.0.X): Increment before `npm run dev`
- MINOR (1.X.0): Increment before `git commit`
- MAJOR (X.0.0): Only when explicitly instructed

**Timestamp Standard**: ISO 8601 with milliseconds UTC
```
Format: YYYY-MM-DDTHH:MM:SS.sssZ
Example: 2025-11-03T18:31:18.000Z
```

**Definition of Done**:
1. Manual verification in development environment
2. Version incremented and reflected across all files
3. All documentation updated
4. Code committed with clear message
5. Build passed (npm run build)
6. Lint passed (npm run lint) when applicable

**Code Standards**:
- All code must include functional and strategic comments
- Reuse before creation (search codebase first)
- No automated tests (MVP factory approach)
- Accessibility attributes required (ARIA, semantic HTML)
- Security: No hardcoded secrets, input validation on all endpoints

#### External Service Integrations Planned
**SSO Service** (sso.doneisbetter.com v5.16.0):
- OAuth2/OIDC authorization
- Public client with PKCE required
- Scopes: openid, profile, email
- 30-day session duration with sliding expiration

**imgbb.com API**:
- Free tier: 32 MB upload limit per image
- API key required
- Used for both frame storage and final image hosting

**Resend Email Service**:
- Email delivery of final composed images
- Following pattern from SSO project

#### Task List Summary
**Phase 1 — Core Infrastructure** (Q4 2025):
- Task 1.1: Project initialization ⏳
- Task 1.2: Documentation suite ⏳
- Task 2.1: Database and external services ⏳
- Task 2.2: SSO authentication ⏳

**Phase 2 — Core Features** (Q4 2025):
- Task 3.1: Camera capture ⏳
- Task 3.2: Frame management ⏳
- Task 3.3: Image composition ⏳
- Task 3.4: Submission workflow ⏳

**Phase 3 — User Experience** (Q1 2026):
- Task 4.1: User profile ⏳
- Task 4.2: Social sharing ⏳

**Phase 4 — Quality and Deployment** (Q1 2026):
- Task 5.1: Security, performance, accessibility ⏳
- Task 5.2: GitHub repository setup ⏳
- Task 5.3: Vercel deployment ⏳
- Task 5.4: Manual testing ⏳
- Task 5.5: Final documentation review ⏳

**Overall Progress**: 0/15 tasks completed (Planning phase)

#### Notes
- Project working title: "camera" (subject to change)
- No user positioning/resizing of photos (automatic fitting only)
- No user filters or editing tools
- Text overlay is admin-managed decoration only
- Tests prohibited per MVP factory rules

#### References
- SSO documentation: /Users/moldovancsaba/Library/Mobile Documents/com~apple~CloudDocs/Projects/sso/
- Reference project (messmass): /Users/moldovancsaba/Projects/messmass/ (v10.5.0)
- imgbb.com API: https://api.imgbb.com

---

## Version History Overview

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 1.5.0 | 2025-04-27T11:35:20.000Z | Minor | Per-slideshow tracking, fixed mosaics, smooth fade transitions |
| 1.4.1 | 2025-04-27T11:12:45.000Z | Patch | Fixed rolling buffer refresh and added aspect ratio debug logging |
| 1.4.0 | 2025-04-27T10:45:18.000Z | Minor | Slideshow play count display in galleries |
| 1.3.1 | 2025-04-27T10:15:32.000Z | Patch | Fixed JSX syntax error in SlideshowManager settings UI |
| 1.3.0 | 2025-04-27T09:30:00.000Z | Minor | Rolling buffer slideshow system with settings UI |
| 1.2.1 | 2025-04-27T08:45:00.000Z | Patch | Image dimension fallback for legacy submissions |
| 1.2.0 | 2025-04-27T08:30:00.000Z | Minor | MongoDB conventions documentation |
| 1.0.0 | 2025-11-03T18:31:18.000Z | Initial | Project planning and documentation setup |

---

## Upcoming Releases

### v1.1.0 (Planned — 2025-11-04)
- Project initialization complete
- Next.js setup with TypeScript
- MongoDB Atlas database created
- Environment configuration complete

### v1.2.0 (Planned — 2025-11-06)
- SSO authentication integration
- OAuth2 client registration
- Session management implemented

### v1.3.0 (Planned — 2025-11-10)
- Camera capture functionality
- Frame management system
- Admin interface

See ROADMAP.md for complete future planning.

---

**Note**: All completed tasks are moved from TASKLIST.md to this file immediately upon completion, maintaining a complete historical record of development progress.
