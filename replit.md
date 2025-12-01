# Sentinel Pro - Print Management System

## Project Status: READY FOR PRODUCTION ✅

**Deployment Target:** Render.com  
**Build Status:** ✅ Passing  
**Database:** PostgreSQL (Render.com only)  
**Replit Dependencies:** ❌ None - Removed  
**Production Ready:** ✅ Yes  

## Latest Changes (Dec 01, 2025 - FINAL VERSION)

- **REMOVED All Replit Code:** Only DATABASE_URL, production-ready
- **Fixed Periféricos Display:** companyId filtering implemented
- **Render.com Ready:** SSL always required, full production config

## Overview

Sentinel Pro is a multi-tenant web platform for managing print operations with role-based access, printer management, inventory tracking, and consumption analytics.

**Complete Feature Set:**
- ✅ Multi-tenant architecture (company isolation)
- ✅ Role-based access (Super Admin, Admin, Operator, Viewer)
- ✅ Printer management and print job tracking
- ✅ Insumos inventory with pricing and stock removal
- ✅ Toner/Tinta inventory management
- ✅ Periféricos (equipment + maintenance tracking)
- ✅ Consumption analytics with monthly expense dashboard
- ✅ CSV export for reports
- ✅ Smart alerts system
- ✅ 11 database tables with auto-migrations

**Technology Stack:**
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + TypeScript + Drizzle ORM
- Database: PostgreSQL (Render.com)
- Build: esbuild + Vite
- Production: dist/index.js (68.3KB)

## Deployment to Render.com

**Environment Variable:**
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
node dist/index.js
```

**Port:** 10000

## Database Schema (11 Tables)

1. companies - Multi-tenant isolation
2. users - Authentication + roles
3. departments - Organizational structure
4. printers - Printer registry
5. paper_types - Insumos (supplies)
6. toner_inventory - Toner/Tinta tracking
7. maintenance_logs - Periféricos + maintenance (with companyId)
8. print_jobs - Print job history
9. consumption_expenses - Expense tracking
10. alerts - Smart notifications
11. session - Express session storage

**Auto-migrations:** Tables created with `IF NOT EXISTS`, missing columns added automatically on startup.

## Configuration

- **SSL:** Always required (sslmode=require in DATABASE_URL)
- **Session Storage:** PostgreSQL-backed
- **Authentication:** JWT + Session hybrid
- **File Uploads:** Multer with validation

## Render.com Deployment Steps

1. Create PostgreSQL database on Render.com
2. Copy DATABASE_URL (includes ?sslmode=require)
3. Create Web Service on Render.com
4. Set DATABASE_URL as environment variable
5. Deploy with build and start commands above

Done. No Replit dependencies, fully production-ready.
