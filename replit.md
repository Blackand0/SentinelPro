# Sentinel Pro - Print Management System

## Overview

Sentinel Pro es una plataforma web multi-tenant de gestión de impresión para pequeñas y medianas empresas. Proporciona control de acceso basado en roles, seguimiento de trabajos de impresión con archivado digital, análisis de consumo y paneles de monitoreo en tiempo real. La interfaz completa está en español para entornos empresariales hispanohablantes.

## User Preferences

Preferred communication style: Simple, everyday language.

## Current Status ✅

**Deployment:** Render Web Service (free tier) con PostgreSQL
**Database:** PostgreSQL en Render
**Sessions:** PostgreSQL persistent session store
**Status:** Ready for production

### ¿Cómo desplegar?
1. Ve a tu servicio en Render
2. Click "Re-deploy latest commit"
3. Espera 2-3 minutos
4. La app estará en https://sentinelpro.onrender.com

## Default Credentials

**Super Admin:**
- Username: `sentinelpro`
- Password: `123456`
- Email: `sentinelpro@sentinel.cl`
- Role: `super-admin`

(Ver `.superadmin-credentials.json` para referencia)

## System Architecture

### Frontend Architecture

**Technology Stack**
- **Framework**: React with TypeScript for type-safe component development
- **Styling**: Tailwind CSS with custom design system based on Material Design/Fluent Design hybrid
- **UI Components**: Shadcn UI component library built on Radix UI primitives
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation

**Design System**
- Typography uses Inter for body text and Plus Jakarta Sans for headings
- Color system supports light/dark themes via CSS custom properties
- Component hierarchy emphasizes data clarity and minimal cognitive load
- Professional aesthetics with consistent spacing primitives (2, 4, 6, 8 units)

**Authentication Flow**
- Session validation occurs on application load via `/api/auth/me` endpoint
- Protected routes use role-based access control enforced client-side with server verification
- Theme preference persists to localStorage

### Backend Architecture

**Technology Stack**
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **Session Management**: express-session with PostgreSQL persistence (PostgresSessionStore)
- **File Handling**: Multer middleware for multipart form uploads (stored in `/uploads` directory)
- **Password Security**: bcrypt for hashing with configurable salt rounds
- **ORM**: Drizzle ORM for type-safe database operations

**API Structure**
- RESTful endpoints organized by resource type (auth, users, printers, print-jobs, companies, consumption, dashboard)
- Middleware chain: authentication → role verification → route handler
- Session cookies configured with secure, httpOnly, and sameSite="strict" flags

**Role-Based Access Control**
- **super-admin**: Full system access including multi-company management
- **admin**: Company-level user and resource management
- **operator**: Create print jobs, manage printers, view consumption
- **viewer**: Read-only access to jobs and dashboard

**Multi-Tenancy**
- Companies table with admin assignment
- Users scoped to companies via `companyId` foreign key
- Data isolation enforced at storage layer

### Data Storage

**Current Implementation**
- PostgreSQL database with Drizzle ORM
- Schema defined in `shared/schema.ts` using drizzle-orm/pg-core
- Migration framework configured via drizzle-kit
- Database URL required via `DATABASE_URL` environment variable
- Auto-initialization on startup (no manual migration needed)

**Data Models**
- **Companies**: Multi-tenant organization records
- **Users**: Authentication credentials, profile data, role assignment, company association
- **Printers**: Device inventory with name, location, status
- **Print Jobs**: Document metadata (name, pages, copies, color mode), user/printer relationships, file references, timestamps
- **Sessions**: Persistent session storage in PostgreSQL (replaces MemoryStore)

### Security Implementation

**Session Security**
- Session persistence in PostgreSQL via PostgresSessionStore
- Session regeneration after login prevents session fixation
- Secure session secret required via `SESSION_SECRET` environment variable
- Cookie configuration adapts to NODE_ENV (secure flag in production)
- Sessions survive app restarts and multi-instance deployments

**CSRF Protection**
- Token-based protection middleware present
- Currently relies on sameSite="strict" cookies
- Exempt routes include auth endpoints to prevent login issues

**Password Security**
- Passwords hashed with bcrypt before storage
- Password fields excluded from API responses
- Minimum 6-character requirement enforced via Zod schemas

**Role Verification**
- Server-side role checks via `requireRole` middleware
- Session-based user context attached to requests
- 403 Forbidden responses for insufficient permissions

### File Upload System

**Storage Strategy**
- Local filesystem storage in `/uploads` directory
- Unique filenames generated using timestamp + random string
- 10MB file size limit enforced by Multer
- File metadata tracked in print job records

**Limitations**
- Files stored on server disk (not cloud storage)
- No file cleanup on job deletion
- No virus scanning or validation beyond size

### Analytics and Reporting

**Dashboard Metrics**
- Total print jobs across time periods
- Active user count
- Active printer inventory
- Monthly page consumption

**Consumption Analytics**
- Period-based filtering (day, week, month, year)
- Breakdown by color vs black-and-white pages
- Top users and printers by volume
- Recent job history

## External Dependencies

### Third-Party Services

**Database**
- PostgreSQL via Render (free tier)
- Connection pooling with serverless-optimized queries
- Requires `DATABASE_URL` environment variable

**Authentication**
- express-session with PostgresSessionStore for session persistence
- No external authentication providers (OAuth, SAML, etc.)

### Key NPM Packages

**UI Framework**
- `@radix-ui/*`: Unstyled, accessible component primitives (accordion, dialog, dropdown, etc.)
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Type-safe component variants
- `cmdk`: Command menu pattern

**Data Management**
- `@tanstack/react-query`: Async state management with caching
- `react-hook-form`: Form state and validation
- `zod`: TypeScript-first schema validation
- `drizzle-orm`: Type-safe SQL query builder

**Security**
- `bcrypt`: Password hashing
- `express-session`: Session middleware
- **PostgreSQL persistence instead of connect-pg-simple** (compatibility issues)

**Utilities**
- `multer`: File upload handling
- `date-fns`: Date formatting and manipulation
- `nanoid`: Unique ID generation

### Development Tools

- `vite`: Fast build tool and dev server
- `tsx`: TypeScript execution for development
- `esbuild`: Production bundler for server code
- Replit-specific plugins for runtime error handling and cartographer integration

### Environment Configuration

**Required Variables**
- `SESSION_SECRET`: Cryptographic secret for session signing (critical for production)
- `DATABASE_URL`: PostgreSQL connection string (required for production)

**Optional Variables**
- `NODE_ENV`: Set to "production" for production deployments (affects cookie security, logging)

## Critical Bug Fixes Applied

1. **Session Persistence Issue** - Fixed `MemoryStore` not persisting in Render production
   - Solution: Implemented `PostgresSessionStore` that extends EventEmitter
   - Sessions now persist in PostgreSQL database
   - Survives app restarts and pauses

2. **Express-session Compatibility** - Fixed incompatibility with postgres-js driver
   - Removed connect-pg-simple (not compatible with postgres-js)
   - Created custom PostgresSessionStore implementation
   - Uses Drizzle ORM for session operations

## Deployment Notes

### Render Configuration
- **Service Type**: Web Service
- **Build Command**: `npm install; npm run build`
- **Start Command**: `NODE_ENV=production node dist/index.js`
- **Port**: 10000 (auto-detected by Render)
- **Database**: PostgreSQL (free tier, persisted)

### Known Limitations (Free Tier)
- App pauses after 15 minutes of inactivity (auto-reactivates on access)
- Limited storage on server disk
- Database connection may timeout during long operations

### Performance Considerations
- Frontend bundle size warning (572KB gzip) - acceptable for current complexity
- PostCSS warning about missing `from` option - cosmetic, doesn't affect functionality
- Drizzle queries optimized for single instance deployment

## How to Run Locally

```bash
npm install
npm run dev
```

Access at `http://localhost:5000`

## How to Deploy to Render

1. Connect your GitHub repository to Render
2. Create Web Service from repository
3. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A strong random string
   - `NODE_ENV`: production
4. Click "Deploy"
5. Monitor logs for any issues

## Next Steps for Production

1. Change default super-admin password immediately
2. Configure custom domain in Render
3. Set up database backups
4. Monitor application logs for errors
5. Consider upgrading to paid Render plan for always-on instance
