# Sentinel Pro - Print Management System

## Project Status: READY FOR PRODUCTION ✅

**Deployment Target:** Render.com  
**Build Status:** ✅ Passing  
**Database:** PostgreSQL (External Render.com only)  
**Replit Dependencies:** ❌ None  
**Production Ready:** ✅ Yes  

## Latest Changes (Dec 01, 2025 - FINAL PRODUCTION VERSION)

- **REMOVED Replit PostgreSQL:** Now uses only DATABASE_URL for Render.com PostgreSQL
- **Fixed Periféricos display:** Added companyId filtering - periféricos now appear in list correctly
- **Migration to Render.com:** All code ready for deployment without Replit dependencies
- **SSL Always Required:** Production-ready configuration for external databases

## Overview

Sentinel Pro is a multi-tenant web platform for small and medium-sized businesses to manage print operations. The system provides role-based access control, printer management, print job tracking, and consumption analytics. It's deployed on Render.com with PostgreSQL for data persistence and includes full authentication, file upload capabilities, and real-time dashboards.

**Complete Feature Set:**
- ✅ Multi-tenant architecture with company isolation
- ✅ Role-based access (Super Admin, Admin, Operator, Viewer)
- ✅ Printer management and print job tracking
- ✅ Insumos (supplies) inventory with stock removal and pricing
- ✅ Toner/Tinta inventory management
- ✅ Periféricos (equipment purchases and maintenance tracking)
- ✅ Consumption analytics with monthly expense dashboard
- ✅ CSV export for reports
- ✅ Smart alerts system (admin only)
- ✅ 10+ database tables with full schema

**Technology Stack:**
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + TypeScript + Drizzle ORM
- Database: PostgreSQL (Render.com)
- Build: esbuild + Vite (production bundling)
- Production: dist/index.js (68.3KB) - optimized and ready

## Deployment to Render.com

### Steps:
1. Create PostgreSQL database on Render.com
2. Copy DATABASE_URL from Render console
3. In Render web service, add environment variable: `DATABASE_URL=<your-url>`
4. Deploy: `npm install && npm run build && node dist/index.js`

### Build Process:
- Frontend: `vite build` → `/dist/public`
- Backend: `esbuild server/index-prod.ts` → `/dist/index.js`
- Start: `node dist/index.js` on PORT 10000

## Database Architecture

**11 Tables:**
1. companies - Multi-tenant isolation
2. users - Authentication and roles
3. departments - Organizational structure
4. printers - Printer registry
5. paper_types - Insumos (supplies) with pricing
6. toner_inventory - Toner/Tinta tracking
7. maintenance_logs - Periféricos + maintenance (with companyId)
8. print_jobs - Print job history
9. consumption_expenses - Automated expense tracking
10. alerts - Smart notifications
11. session - Express session storage

**Auto-migrations on startup:**
- Tables created with `IF NOT EXISTS`
- Missing columns added with `ALTER TABLE IF NOT EXISTS`
- Automatic schema sync without manual migrations

## Key Configuration

**Environment Variables:**
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
PORT=10000 (for Render.com)
NODE_ENV=production
```

**Features:**
- SSL Required: Always enabled for external databases
- Session Storage: PostgreSQL-backed via connect-pg-simple
- Authentication: JWT + Session hybrid approach
- File Uploads: Multer with size/type validation

## User Preferences

Preferred communication style: Simple, everyday language. No emojis unless requested.

## Production Notes

The application is fully prepared for production deployment on Render.com:
- ✅ All Replit-specific code removed
- ✅ DATABASE_URL is only external dependency
- ✅ SSL always required and configured
- ✅ Database schema auto-migrates on startup
- ✅ No manual migrations needed
- ✅ Ready for CI/CD deployment
