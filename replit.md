# Sentinel Pro - Print Management System

## Project Status: READY FOR PRODUCTION ✅

**Deployment Target:** Render.com  
**Build Status:** ✅ Passing  
**Database:** PostgreSQL (External URL required)  
**Replit Dependencies:** ❌ None  
**Production Ready:** ✅ Yes

## Overview

Sentinel Pro is a multi-tenant web platform for small and medium-sized businesses to manage print operations. The system provides role-based access control, printer management, print job tracking, and consumption analytics. It's deployed on Render.com with PostgreSQL for data persistence and includes full authentication, file upload capabilities, and real-time dashboards.

**Latest Changes (Nov 30, 2025 - FINAL POLISH):**
- ✅ **UI/UX FINALIZED:**
  - ✅ Renamed "Tipos de Papel" → **"Insumos"** (unified supplies inventory: paper + toner + consumables)
  - ✅ Renamed "Mantenimiento" → **"Periféricos"** (peripheral purchases + maintenance with cost tracking)
  - ✅ **PRICE VISIBILITY RESTORED** - Precio/Hoja column now visible in Insumos table
  - ✅ Removed "Precio por Hoja" label (no duplicate terminology)
  - ✅ Added **"Gastos Mensuales"** metric in Consumption page (peripherals + supplies expenses)
  - ✅ Updated sidebar navigation - **Single "Consumo" section** (no duplicates)
  - ✅ Removed Analytics section from sidebar (consolidated into Consumo)
- ✅ **Periféricos Form Restructured:**
  - ✅ Category: Purchase (🛒) or Maintenance (🔧)
  - ✅ Description, Cost, Date, Notes fields
  - ✅ Total expenses summary card
  - ✅ Costs automatically feed into monthly expenses dashboard
- ✅ **Insumos Form Enhanced:**
  - ✅ Added "Precio por Hoja ($)" field in create/edit forms
  - ✅ Price displayed as currency ($X.XX) in table
  - ✅ Optional field (can be empty for unmeasured consumables)
- ✅ Extended database from 4 to 10 tables (with alerts + migration scripts)
- ✅ Added 4+ CRUD forms (Departments, Insumos, Periféricos, Toner/Tinta Inventory)
- ✅ **INNOVATION FEATURES:**
  - ✅ **Unified Consumption Dashboard** - real-time metrics, charts, trends (ADMIN ONLY)
  - ✅ **Smart Alerts System** - automated notifications (ADMIN ONLY)
  - ✅ **CSV Export** - consumption reports with date filtering (ADMIN ONLY)
  - ✅ **Cost Tracking** - monthly peripheral + supply expenses integrated
- ✅ Build: dist/index.js (64.1KB) ✅ Production-ready
- ✅ Database migrations automatic on startup
- ✅ **FULLY READY FOR RENDER.COM DEPLOYMENT** 🚀

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

**Monorepo Architecture**: The project uses a unified codebase with separate client and server directories, sharing TypeScript types and database schemas through a `/shared` folder.

- **Frontend**: React + TypeScript (Vite-based SPA)
- **Backend**: Express.js server with TypeScript
- **Shared Layer**: Common database schemas and type definitions

**Build Strategy**: The application uses Vite for frontend bundling and esbuild for server-side compilation. Production builds create a `/dist` folder containing both the static frontend (`/dist/public`) and the bundled server (`/dist/index.js`).

### Database Architecture

**ORM Choice**: Drizzle ORM with PostgreSQL dialect. The system uses the `@neondatabase/serverless` package but connects to standard PostgreSQL databases (including Render.com's PostgreSQL service).

**Schema Design**: 
- Multi-tenant isolation through `company_id` foreign keys
- Role-based access control with 4 levels: Super Admin, Admin, Operator, Viewer
- Circular reference pattern between `companies` and `users` tables (companies have admin_id → users, users have company_id → companies)

**Core Tables**:
- `companies`: Tenant isolation root with admin reference
- `users`: Authentication and role management with company association
- `printers`: Printer registry per company
- `print_jobs`: Print tracking with file metadata and user/printer references
- `session`: PostgreSQL session store for Express sessions

**Schema Management**: Uses raw SQL for initial table creation with `CREATE TABLE IF NOT EXISTS` pattern plus automatic `ALTER TABLE` migrations for missing columns. Auto-migration runs on application startup to sync schema. Drizzle Kit is available for migrations (`db:push` script) but not actively used in production deployment.

### Authentication & Session Management

**Authentication Strategy**: JWT-based authentication with PostgreSQL session persistence using `connect-pg-simple`.

**Session Storage**: Database-backed sessions via `connect-pg-simple` package, storing session data in a dedicated `session` table with expiration indexing.

**Password Security**: bcrypt for password hashing with configurable rounds.

**Authorization Levels**:
1. Super Admin: Platform-wide access, no company restriction
2. Admin: Company-level administrative access
3. Operator: Read/write operations within company
4. Viewer: Read-only access within company

### Frontend Architecture

**UI Framework**: React with shadcn/ui component library (Radix UI primitives + Tailwind CSS).

**Design System**: Material Design/Fluent Design hybrid approach using:
- **Typography**: Inter (body) and Plus Jakarta Sans (headings)
- **Styling**: Tailwind CSS with custom HSL-based color system
- **Component Library**: shadcn/ui configured with "new-york" style variant

**State Management**: TanStack Query (React Query) for server state and caching.

**Form Handling**: React Hook Form with Zod resolvers for validation.

**Routing**: React Router (implied by SPA structure).

**Key Design Decisions**:
- Responsive-first approach with mobile breakpoints
- Accessibility through Radix UI primitives
- Consistent spacing using Tailwind's 2/4/6/8 unit system
- Card-based layouts for data density

### Backend Architecture

**Server Framework**: Express.js with TypeScript, ESM module format.

**Development vs Production**:
- Development: `server/index-dev.ts` with hot reload via tsx
- Production: `server/index-prod.ts` compiled to `dist/index.js` via esbuild

**API Design**: RESTful endpoints organized by domain (auth, printers, print jobs, dashboard).

**File Upload Handling**: Multer middleware for print job file uploads with file metadata tracking (name, path, size, page count, color mode).

**Database Client**: Uses `postgres` package (imported from `@neondatabase/serverless`) for PostgreSQL connections with SSL/TLS requirements in production.

**Session Middleware**: express-session with PostgreSQL store, configured for production with secure cookies and proper domain settings.

**Error Handling**: Centralized error logging with specific handlers for database operations.

### Deployment Architecture

**Hosting Platform**: Render.com with free tier configuration.

**Environment Constraints**:
- 15-minute inactivity pause (free tier)
- Auto-wake on request
- SSL/TLS required for database connections

**Build Process**:
1. `npm install` - Install dependencies
2. `vite build` - Build React frontend to `/dist/public`
3. `esbuild server/index-prod.ts` - Bundle server to `/dist/index.js`

**Runtime Configuration**:
- Port binding via `PORT` environment variable (default: 10000)
- Database connection via `DATABASE_URL` environment variable
- SSL enforcement for PostgreSQL connections
- Static file serving from `/dist/public`

**Database Initialization**: On application startup, the server runs SQL schema creation scripts with idempotent `IF NOT EXISTS` clauses to ensure table structure without migration conflicts.

## External Dependencies

### Database

**PostgreSQL**: Primary data store hosted on Render.com with SSL/TLS requirement. Connection managed through `@neondatabase/serverless` package but compatible with standard PostgreSQL.

### Third-Party Packages

**Core Runtime**:
- `express` - Web server framework
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store
- `postgres` - PostgreSQL client (via @neondatabase/serverless)
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation/validation
- `multer` - File upload handling

**ORM & Database**:
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - Schema migrations tool
- `@neondatabase/serverless` - PostgreSQL client adapter

**Frontend Framework**:
- `react` + `react-dom` - UI library
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form handling
- `@hookform/resolvers` - Form validation integration
- `zod` - Schema validation

**UI Components** (Radix UI ecosystem):
- `@radix-ui/react-*` - Primitive component library (dialogs, dropdowns, forms, etc.)
- `class-variance-authority` - Component variant styling
- `clsx` + `tailwind-merge` - Conditional className utilities
- `cmdk` - Command palette component

**Development Tools**:
- `vite` - Frontend build tool
- `@vitejs/plugin-react` - React integration for Vite
- `esbuild` - Server bundler
- `tsx` - TypeScript executor for development
- `typescript` - Type system
- `tailwindcss` - CSS framework
- `postcss` + `autoprefixer` - CSS processing

### Build & Deployment Services

**Render.com**: 
- Web service hosting
- PostgreSQL database hosting
- Automatic deployments from GitHub
- Free tier with 15-minute sleep timeout

**GitHub**: Source code repository with automatic deployment triggers to Render.com.

### Notable Configuration

**Module System**: ESM ("type": "module") across entire project.

**Path Aliases**: 
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

**TypeScript**: Strict mode disabled, bundler module resolution for compatibility with Vite and esbuild.

**Security Notes**: 
- CORS configuration required for production
- Session cookies require secure flag in production
- Database connections require SSL/TLS
- File uploads should include size limits and type validation