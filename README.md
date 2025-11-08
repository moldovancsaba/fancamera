# Camera — Photo Frame Webapp

**Version**: 2.0.1  
**Last Updated**: 2025-11-08T17:53:00.000Z  
**Status**: Production-ready with Safari camera fix (v2.0.1)

A Next.js photo frame web application allowing users to capture photos and automatically apply decorative frames, built with comprehensive refactoring for maintainability and scalability.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open http://localhost:3000 to view the application.

---

## Architecture Overview (v2.0.0)

### Technology Stack
- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5.9.3 (strict mode, ES Modules)
- **Database**: MongoDB 6.8.0 (Atlas)
- **Authentication**: Custom SSO (OAuth2/OIDC with PKCE)
- **Styling**: Tailwind CSS 4.0
- **Image CDN**: imgbb.com
- **Email**: Resend
- **Hosting**: Vercel

### Key Features (v2.0.0)

**Custom Pages System** (v2.0.0):
- Onboarding pages before photo capture (data collection, terms acceptance)
- Thank you pages after sharing (CTAs, additional engagement)
- Drag-and-drop page ordering in admin UI
- Templates: Who Are You (name/email), Accept (checkbox consent), CTA (call-to-action)
- Full GDPR compliance with timestamped consent tracking

**Reusable API Layer** (`lib/api/`):
- Centralized authentication middleware (`requireAuth`, `requireAdmin`)
- Standardized response helpers (`apiSuccess`, `apiError`, `apiPaginated`)
- Error boundary wrapper (`withErrorHandler`)
- Rate limiting with token bucket algorithm
- Input sanitization utilities

**Shared Component Library** (`components/shared/`):
- `Button` - 4 variants, 3 sizes
- `Card` - Flexible container with padding options
- `Badge` - Status indicators with 5 variants
- `LoadingSpinner` - 3 sizes with animations

**Security & Performance**:
- Content Security Policy (CSP) headers
- Rate limiting (5-100 req/min depending on endpoint)
- Input sanitization (XSS, SQL injection, prototype pollution)
- Static asset caching (1 year)
- HSTS, X-Frame-Options, X-Content-Type-Options

---

## Project Structure

```
camera/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (24 endpoints)
│   ├── admin/             # Admin pages
│   ├── capture/           # Photo capture with custom pages (v2.0.0)
│   └── profile/           # User profile
├── components/
│   ├── capture/           # Custom page components (v2.0.0)
│   ├── shared/            # Reusable UI components
│   └── admin/             # Admin-specific components (v2.0.0)
├── lib/
│   ├── api/               # API utilities (v2.0.0)
│   ├── auth/              # Authentication (SSO)
│   ├── db/                # MongoDB connection & schemas (v2.0.0)
│   ├── imgbb/             # Image upload to CDN
│   ├── security/          # Input sanitization
│   └── slideshow/         # Slideshow playlist logic
├── docs/                   # Technical documentation
│   ├── ARCHITECTURE.md    # System architecture (v2.0.0)
│   ├── TECH_STACK.md      # Technology decisions
│   ├── NAMING_GUIDE.md    # Code conventions
│   └── CODE_AUDIT.md      # Refactoring report
├── TASKLIST.md            # Active tasks
├── ROADMAP.md             # Future plans
├── RELEASE_NOTES.md       # Version history
└── LEARNINGS.md           # Development insights
```

---

## Documentation Index

### Core Documentation
1. **README.md** (this file) - Project overview and quick start
2. **ARCHITECTURE.md** - Complete system architecture and design decisions
3. **TECH_STACK.md** - Technology choices with justifications
4. **NAMING_GUIDE.md** - Code naming conventions and patterns
5. **CODE_AUDIT.md** - v1.7.1 refactoring report

### Development
6. **TASKLIST.md** - Current tasks and execution plan
7. **ROADMAP.md** - Future development plans (Q1 2026+)
8. **RELEASE_NOTES.md** - Version history and changelog
9. **LEARNINGS.md** - Issues encountered and solutions

### Technical Guides
10. **docs/MONGODB_CONVENTIONS.md** - Database reference patterns

---

## v2.0.0 Release Summary

### Implementation Complete ✅

Successfully implemented a comprehensive **Custom Pages System** for the Camera webapp, enabling event organizers to add onboarding pages (before photo capture) and thank you pages (after sharing). This is a **MAJOR release** due to schema changes.

### What Was Accomplished

**Phase 1: Database & API Layer** ✅
- Extended Event schema with `customPages: CustomPage[]`
- Extended Submission schema with `userInfo` and `consents` fields
- Added `CustomPageType` enum (who-are-you, accept, cta, take-photo)
- Created PATCH `/api/events/[eventId]` endpoint with full validation
- Updated POST endpoints to initialize/handle new fields

**Phase 2: Custom Page Components** ✅
- `WhoAreYouPage.tsx` (214 lines) - Name/email data collection
- `AcceptPage.tsx` (154 lines) - Terms acceptance with blue theme
- `CTAPage.tsx` (154 lines) - Call-to-action with purple theme
- All with dark mode, accessibility, keyboard navigation

**Phase 3: Capture Flow Refactoring** ✅
- Refactored `app/capture/[eventId]/page.tsx` for multi-step flow
- Flow: Onboarding → Frame Select → Capture → Preview → Sharing + NEXT → Thank You → Restart
- State management for page navigation, collected data, consents
- Required field validation and checkbox validation

**Phase 4: Admin UI** ✅
- `CustomPagesManager.tsx` (468 lines) - Complete page management system
- Add/Edit/Delete pages with modal editor
- Reordering with ▲▼ buttons (no external dependencies)
- Integrated into event edit page between "Event Details" and "Event is active"

**Phase 5: Testing & Documentation** ✅
- Fixed JSX className escaped quotes in CustomPagesManager
- Fixed Next.js 15 route handler type compatibility in withErrorHandler
- Build passes: TypeScript 0 errors, all 27 pages generated
- Dev server starts successfully
- All documentation updated to v2.0.0

### Technical Issues Resolved

1. **JSX Compilation Error**: Escaped quotes in className attributes causing Turbopack failure
   - Fixed by removing backslashes from all className strings

2. **TypeScript Route Handler Type Mismatch**: withErrorHandler incompatible with Next.js 15
   - Updated RouteHandler type to use `context?: any` for flexibility
   - Documented in LEARNINGS.md as [BACK-002]

### Files Modified/Created

**New Components** (4 files, ~990 lines):
- `components/capture/WhoAreYouPage.tsx`
- `components/capture/AcceptPage.tsx`
- `components/capture/CTAPage.tsx`
- `components/admin/CustomPagesManager.tsx`

**Modified Files** (8 files):
- `lib/db/schemas.ts` - Schema extensions (v2.0.0)
- `lib/api/withErrorHandler.ts` - Fixed type compatibility (v2.0.0)
- `app/api/events/route.ts` - Initialize customPages
- `app/api/events/[eventId]/route.ts` - Added PATCH endpoint
- `app/api/submissions/route.ts` - Accept userInfo/consents
- `app/capture/[eventId]/page.tsx` - Multi-step flow refactor
- `app/admin/events/[id]/edit/page.tsx` - Integrated CustomPagesManager
- `package.json` - Version 1.7.2 → 2.0.0

**Documentation Updated** (7 files):
- `README.md` - v2.0.0 overview with custom pages features
- `RELEASE_NOTES.md` - Comprehensive v2.0.0 entry (225 lines)
- `ARCHITECTURE.md` - Version updated to 2.0.0
- `TASKLIST.md` - Added completion entry for v2.0.0
- `ROADMAP.md` - Version updated to 2.0.0
- `LEARNINGS.md` - Added Next.js 15 type compatibility issue
- `package.json` - Version synchronized

### Impact

**Lines Added/Modified**: ~1,540 lines

**Capabilities Unlocked**:
- Event organizers can collect user data before photo capture
- Legal compliance with timestamped consent tracking
- Post-sharing engagement with thank you pages
- Flexible flow customization per event
- Foundation for future page types (video, quiz, survey)

---

## Key Improvements from v1.7.1

### Code Quality

### Code Quality
- ✅ Eliminated ~3,200 lines of duplicated code
- ✅ Created 1,304 lines of reusable abstractions
- ✅ Refactored all 24 API routes to use centralized patterns
- ✅ Fixed all TypeScript compilation errors
- ✅ Resolved all TODO comments

### Security
- ✅ Rate limiting on all endpoints
- ✅ Input sanitization (9 utility functions)
- ✅ CSP headers configured
- ✅ Admin role-based access control
- ✅ XSS, SQL injection, prototype pollution protection

### Documentation
- ✅ Created 4 mandatory documentation files (2,295 lines)
- ✅ Synchronized all versions to 1.7.1
- ✅ Updated all timestamps to ISO 8601 format

### Performance
- ✅ Static asset caching (1 year immutable)
- ✅ Optimized database queries
- ✅ Reduced route complexity by 50%

---

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate SSO login
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - End session

### Partners & Events
- `GET /api/partners` - List partners
- `GET /api/events` - List events
- `POST /api/events` - Create event (admin)

### Frames
- `GET /api/frames` - List frames
- `POST /api/frames` - Upload frame (admin)
- `PATCH /api/frames/[id]` - Update frame (admin)

### Submissions
- `GET /api/submissions` - List user submissions
- `POST /api/submissions` - Create submission
- `DELETE /api/submissions/[id]` - Delete submission

### Slideshows
- `GET /api/slideshows/[id]/playlist` - Get slideshow buffer
- `POST /api/slideshows/[id]/played` - Track play count

See **ARCHITECTURE.md** for complete API documentation.

---

## Development Guidelines

### Code Standards
- Use reusable API utilities from `lib/api`
- Use shared UI components from `components/shared`
- Follow naming conventions in **NAMING_GUIDE.md**
- Add "what and why" comments to all code
- Never commit secrets in plain text

### Before Committing
1. Run `npm run build` - Must pass
2. Increment version (PATCH before dev, MINOR before commit)
3. Update all documentation files
4. Verify timestamps in ISO 8601 format
5. Check Definition of Done criteria

### Version Protocol
- **PATCH** (1.7.X) - Before `npm run dev`
- **MINOR** (1.X.0) - Before `git commit`
- **MAJOR** (X.0.0) - Only when explicitly instructed

---

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# SSO Authentication
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_CLIENT_ID=your_client_id
SSO_REDIRECT_URI=http://localhost:3000/api/auth/callback

# imgbb.com CDN
IMGBB_API_KEY=your_api_key

# Email (Resend)
RESEND_API_KEY=your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## License

Proprietary - All rights reserved

---

## Support

For issues or questions, refer to:
- **ARCHITECTURE.md** - System design and patterns
- **LEARNINGS.md** - Common issues and solutions
- **TASKLIST.md** - Current development status

---

**v2.0.0** | 🔐 Authentication via SSO | ☁️ Powered by MongoDB Atlas | 📧 Email delivery with Resend
