# Sentinel Pro - Print Management System

## Overview

Sentinel Pro is a comprehensive document printing management and tracking platform designed for small and medium businesses. The application provides role-based access control, print job tracking with digital archiving, consumption analytics, and real-time monitoring dashboards. The entire user interface is in Spanish, catering to Spanish-speaking business environments.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Session Management**: express-session with session regeneration to prevent fixation attacks
- **File Handling**: Multer middleware for multipart form uploads (stored in `/uploads` directory)
- **Password Security**: bcrypt for hashing with configurable salt rounds

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

**Current Implementation (MVP)**
- In-memory storage via MemStorage class implementing IStorage interface
- Data structure uses Maps for O(1) lookups
- Data lost on server restart (intentional for MVP)

**Planned Migration**
- Drizzle ORM configuration present for PostgreSQL
- Schema defined in `shared/schema.ts` using drizzle-orm/pg-core
- Migration framework configured via drizzle-kit
- Database URL expected via `DATABASE_URL` environment variable

**Data Models**
- **Companies**: Multi-tenant organization records
- **Users**: Authentication credentials, profile data, role assignment, company association
- **Printers**: Device inventory with name, location, status
- **Print Jobs**: Document metadata (name, pages, copies, color mode), user/printer relationships, file references, timestamps

### Security Implementation

**Session Security**
- Session regeneration after login prevents session fixation
- Secure session secret required via `SESSION_SECRET` environment variable
- Cookie configuration adapts to NODE_ENV (secure flag in production)

**CSRF Protection**
- Token-based protection middleware present but not fully implemented
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

**Database (Planned)**
- PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)
- Connection pooling and serverless-optimized queries
- Requires `DATABASE_URL` environment variable

**Authentication**
- express-session with connect-pg-simple for session storage (when database is provisioned)
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
- `connect-pg-simple`: PostgreSQL session store

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
- `DATABASE_URL`: PostgreSQL connection string (required when migrating from in-memory storage)

**Optional Variables**
- `NODE_ENV`: Set to "production" for production deployments (affects cookie security, logging)