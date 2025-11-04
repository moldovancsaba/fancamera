# RELEASE_NOTES.md

**Project**: Camera — Photo Frame Webapp
**Current Version**: 1.0.0
**Last Updated**: 2025-11-03T18:31:18.000Z

This document tracks all completed tasks and version releases in chronological order, following semantic versioning format.

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
