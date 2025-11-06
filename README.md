# Camera — Photo Frame Webapp

**Version**: 1.7.1  
**Last Updated**: 2025-11-06T19:33:00.000Z  
**Status**: Production-ready with v1.7.1 refactoring complete

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

## Architecture Overview (v1.7.1)

### Technology Stack
- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5.9.3 (strict mode, ES Modules)
- **Database**: MongoDB 6.8.0 (Atlas)
- **Authentication**: Custom SSO (OAuth2/OIDC with PKCE)
- **Styling**: Tailwind CSS 4.0
- **Image CDN**: imgbb.com
- **Email**: Resend
- **Hosting**: Vercel

### Key Features (v1.7.1 Refactoring)

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
│   ├── capture/           # Photo capture
│   └── profile/           # User profile
├── components/
│   ├── shared/            # Reusable UI components (v1.7.1)
│   └── admin/             # Admin-specific components
├── lib/
│   ├── api/               # API utilities (v1.7.1)
│   ├── auth/              # Authentication (SSO)
│   ├── db/                # MongoDB connection & schemas
│   ├── imgbb/             # Image upload to CDN
│   ├── security/          # Input sanitization (v1.7.1)
│   └── slideshow/         # Slideshow playlist logic
├── docs/                   # Technical documentation
│   ├── ARCHITECTURE.md    # System architecture (v1.7.1)
│   ├── TECH_STACK.md      # Technology decisions (v1.7.1)
│   ├── NAMING_GUIDE.md    # Code conventions (v1.7.1)
│   └── CODE_AUDIT.md      # Refactoring report (v1.7.1)
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

## Key Improvements in v1.7.1

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
