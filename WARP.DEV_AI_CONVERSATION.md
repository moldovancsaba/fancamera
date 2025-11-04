# WARP.DEV AI Conversation Log

**Project**: Camera — Photo Frame Webapp
**Version**: 1.0.0
**Last Updated**: 2025-11-03T18:31:18.000Z

This document tracks all AI-assisted development sessions and serves as a reference for development conventions, rules, and context.

---

## Session 1: Initial Project Planning and Architecture

**Date**: 2025-11-03T18:19:48.000Z to 2025-11-03T18:31:18.000Z
**Objective**: Create comprehensive project plan and initial documentation

### User Requirements Gathered

**Core Purpose**:
- Web application for taking photos with graphical frames
- Photos taken within the webapp (camera capture)
- Users can download final image, share on social media, and send to system

**Key Features Confirmed**:
1. **Frame Management**:
   - Pre-designed templates stored in system
   - Admin users can upload/manage frames
   - Formats: PNG, SVG, overlays, HTML canvas shapes, decorations, texts

2. **Photo Capture**:
   - Live camera capture (mandatory mobile device support)
   - Desktop webcam support (mandatory)
   - Alternative file upload option

3. **Storage and Delivery**:
   - Save images to imgbb.com CDN
   - Save metadata to MongoDB Atlas
   - Email result to user

4. **User Management**:
   - User accounts/login with SSO via sso.doneisbetter.com
   - User profile page with all previous images
   - Precise tracking: who, when, where submitted what photo

5. **Social Sharing**:
   - Built-in share buttons
   - Shareable links
   - Image file sharing
   - All shared images hosted on imgbb.com

6. **User Constraints**:
   - NO user positioning/resizing of photo within frame
   - NO user filters or basic editing tools
   - Text overlay is part of admin-managed image decoration options

**Project Name**: "camera" (working title, generic enough until proper name chosen)

### Technology Stack Decisions

Based on existing project patterns (messmass, sso):
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Module System**: ES Modules (type: "module" in package.json)
- **Database**: MongoDB Atlas
- **Authentication**: OAuth2/OIDC via sso.doneisbetter.com
- **Image CDN**: imgbb.com API
- **Email**: Resend (matching SSO project)
- **Hosting**: Vercel (automatic GitHub deployment)
- **Node Version**: 18.x, 20.x, or 22.x

### Architecture Decisions

**Database Collections**:
1. `frames` - Frame templates with metadata
2. `submissions` - User photo submissions with comprehensive metadata
3. `users_cache` - Optional cache of SSO user data for performance

**API Structure**:
- `/api/auth/*` - SSO authentication endpoints
- `/api/frames/*` - Frame management (admin only)
- `/api/submissions/*` - Photo submission and retrieval
- `/api/share/*` - Public share pages

**Component Structure**:
- `components/camera/` - Camera capture logic
- `components/frames/` - Frame selection and preview
- `components/admin/` - Admin interface for frame management
- `components/profile/` - User profile and gallery
- `components/shared/` - Shared components (ShareButtons, etc.)

### Documentation Suite Created

Following established conventions from messmass project:

**Core Documentation** (mandatory):
1. ✅ README.md - Complete project overview
2. ⏳ ARCHITECTURE.md - System architecture details
3. ⏳ TASKLIST.md - Active and planned tasks
4. ⏳ ROADMAP.md - Forward-looking development plans
5. ⏳ RELEASE_NOTES.md - Versioned changelog
6. ⏳ LEARNINGS.md - Issues and solutions
7. ✅ WARP.DEV_AI_CONVERSATION.md - This file

**Feature-Specific Documentation** (mandatory):
8. ⏳ SSO_INTEGRATION.md - Authentication integration guide
9. ⏳ IMGBB_INTEGRATION.md - imgbb.com API integration
10. ⏳ FRAME_SYSTEM.md - Frame management architecture
11. ⏳ IMAGE_PROCESSING.md - Canvas API and composition
12. ⏳ CODING_STANDARDS.md - Code conventions (recommended)

### Task List Created

15 comprehensive tasks created covering:
1. Project initialization and core setup
2. Database and external service configuration
3. SSO authentication integration
4. Camera capture and image upload components
5. Frame management system (admin only)
6. Image composition and processing system
7. Photo submission workflow and storage
8. User profile and image history
9. Social sharing features
10. Comprehensive documentation suite
11. Security, performance, and accessibility implementation
12. GitHub repository setup and initial commit
13. Vercel deployment and production configuration
14. Manual testing and quality assurance
15. Final documentation review and version synchronization

### Development Rules Established

**Version Control Protocol**:
- PATCH (1.0.X): Increment before `npm run dev`
- MINOR (1.X.0): Increment before `git commit`
- MAJOR (X.0.0): Only when explicitly instructed

**Version Synchronization Required in**:
- package.json
- README.md
- ARCHITECTURE.md
- TASKLIST.md
- LEARNINGS.md
- ROADMAP.md
- RELEASE_NOTES.md
- All feature-specific documentation

**Timestamp Format** (ISO 8601 with milliseconds UTC):
```
YYYY-MM-DDTHH:MM:SS.sssZ
```

**Definition of Done** (from rules):
1. Manual verification in development environment
2. Version incremented and reflected across all files
3. All documentation updated (ARCHITECTURE.md, TASKLIST.md, LEARNINGS.md, README.md, RELEASE_NOTES.md, ROADMAP.md)
4. Code committed with clear, versioned message
5. Build passed (npm run build)
6. Lint passed (npm run lint) if applicable

**Tests Prohibited**: Per MVP factory approach, no automated tests allowed

**Code Comment Requirements**: All code must include functional and strategic comments explaining what it does and why

**Documentation Rules**:
- ROADMAP.md: Forward-looking only, no historical entries
- TASKLIST.md: Active tasks only, completed tasks move to RELEASE_NOTES.md
- LEARNINGS.md: Categorized by Dev/Design/Backend/Frontend/Process/Other
- All docs must avoid outdated/deprecated elements
- No "to be confirmed", "maybe", "soon" placeholders

### SSO Integration Context

**SSO Service Details** (from sso.doneisbetter.com):
- Version: 5.16.0
- OAuth2/OIDC authorization server
- Support for Authorization Code Flow with optional PKCE
- Public clients (SPA like camera app) require PKCE
- Session duration: 30 days with sliding expiration
- User redirected to `/account` page after login
- JWT access tokens (RS256)
- Refresh token rotation support

**Required SSO Endpoints**:
- Authorization: `/api/oauth/authorize`
- Token: `/api/oauth/token`
- Validation: `/api/sso/validate`
- OIDC Discovery: `/.well-known/openid-configuration`
- JWKS: `/.well-known/jwks.json`

**Camera App Registration Requirements**:
- Register as OAuth2 client in sso.doneisbetter.com admin
- Configure as "public" client (requires PKCE)
- Set redirect URIs for dev and production
- Request scopes: `openid`, `profile`, `email`
- Store client_id (no client_secret needed for public clients)

### Next Steps

Following the task list created, the next immediate actions are:
1. Initialize Next.js project with TypeScript
2. Set up package.json with proper version and dependencies
3. Configure environment variables
4. Complete all core documentation files
5. Set up MongoDB Atlas database and collections
6. Register OAuth2 client with SSO service

---

## Development Conventions

### Code Structure
- Use TypeScript strict mode
- ES Modules throughout (type: "module" in package.json)
- Server-side: `.ts` or `.mts` extensions
- Client components: Mark with 'use client' directive
- All async operations must have proper error handling

### Naming Conventions
- Files: kebab-case for utilities, PascalCase for components
- Functions: camelCase
- Components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Database fields: camelCase
- MongoDB collections: lowercase with underscores

### Component Patterns
- Reuse before creation (search codebase first)
- Single responsibility principle
- Props interface defined for all components
- Loading and error states mandatory for async components
- Accessibility attributes required (ARIA labels, semantic HTML)

### Security Requirements
- Never hardcode secrets
- Use environment variables for all sensitive data
- CSRF protection on state-changing operations
- Input validation and sanitization on all endpoints
- Rate limiting on public endpoints
- Proper session management with secure cookies

### Performance Requirements
- Use Next.js Image component for all images
- Implement lazy loading for galleries
- Pagination with "Load 20 more" pattern
- Cache SSO user data appropriately
- Optimize Canvas operations for mobile devices

---

## Questions Resolved

**Q**: Should this be a camera app, photo editor, gallery, or something else?
**A**: Photo frame application - users capture/upload photos and apply pre-designed frames

**Q**: Who are the target users?
**A**: Public users (authenticated via SSO) and admin users (for frame management)

**Q**: What authentication system?
**A**: SSO via sso.doneisbetter.com (OAuth2/OIDC)

**Q**: Where to store images?
**A**: imgbb.com CDN for image hosting, MongoDB Atlas for metadata

**Q**: Can users edit/position photos?
**A**: No - automatic fitting only, no user control over positioning/resizing

**Q**: What about filters or editing tools?
**A**: No user editing tools. Text overlay is admin-managed decoration only

**Q**: Project name?
**A**: "camera" (working title, subject to change)

---

## External Context References

**SSO Service**: https://sso.doneisbetter.com
- Documentation: /Users/moldovancsaba/Library/Mobile Documents/com~apple~CloudDocs/Projects/sso/
- Version: 5.16.0
- OAuth2 client registration required

**imgbb.com API**: https://imgbb.com
- API documentation: https://api.imgbb.com
- Free tier: 32 MB upload limit
- Requires API key

**Reference Projects**:
- messmass: /Users/moldovancsaba/Projects/messmass (v10.5.0)
  - Used for documentation structure patterns
  - Design system patterns
  - MongoDB and Vercel deployment patterns
