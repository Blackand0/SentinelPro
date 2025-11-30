# Sentinel Pro Design Guidelines

## Design Approach

**Selected System**: Material Design / Fluent Design Hybrid
- **Justification**: Enterprise productivity tool requiring clarity, data density, and professional aesthetics. Material's elevation system and Fluent's information hierarchy principles create ideal foundation for business dashboards and forms.
- **Key Principles**: Data clarity first, minimal cognitive load, consistent interaction patterns, professional trust signals

## Typography System

**Font Family**: 
- Primary: Inter (Google Fonts) - body text, forms, data tables
- Display: Plus Jakarta Sans (Google Fonts) - headings, dashboard titles

**Hierarchy**:
- Page Titles: text-4xl font-bold (Plus Jakarta Sans)
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Table Headers: text-sm font-semibold uppercase tracking-wide
- Helper Text: text-sm
- Labels: text-sm font-medium

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section margins: mt-8, mb-8
- Card spacing: gap-6, space-y-4
- Form field gaps: space-y-4
- Grid gaps: gap-4, gap-6

**Container System**:
- Dashboard: max-w-7xl mx-auto px-6
- Forms: max-w-2xl mx-auto
- Data tables: w-full with horizontal scroll on mobile

## Core Components

### Navigation
**Top Navigation Bar**: Fixed header, h-16, shadow-sm
- Logo left, user profile dropdown right
- Role indicator badge next to username
- Quick actions (New Print Job, Search) center-right

**Sidebar Navigation**: Fixed left sidebar, w-64, hidden on mobile
- Collapsible menu groups (Dashboard, Print Jobs, Management, Reports)
- Active state with subtle background
- Icon + label format using Heroicons

### Dashboard Layout
**Grid System**: 
- Stats cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Main content: grid-cols-1 lg:grid-cols-3 gap-6 (2/3 for table, 1/3 for filters/summary)

**Stat Cards**: Elevated cards with rounded-lg, p-6
- Large number display (text-3xl font-bold)
- Label below (text-sm)
- Icon top-right (h-12 w-12)
- Subtle border with hover elevation

### Data Tables
**Structure**: Full-width responsive table with alternating row backgrounds
- Header: sticky top-0, font-semibold, uppercase text-xs
- Rows: hover:bg-gray-50 transition, py-4 px-6
- Actions column: right-aligned icon buttons
- Pagination: bottom-center with page numbers + prev/next

### Forms
**Layout**: Single column, max-w-2xl
- Label above input (text-sm font-medium, mb-2)
- Input fields: h-10, rounded-md, border, px-4, focus:ring-2
- File upload: Drag-and-drop zone with bordered-dashed, p-8, text-center
- Button groups: flex gap-4, primary right-aligned

**Field Groups**:
- Related fields: grid-cols-1 md:grid-cols-2 gap-4
- Date/time pickers: adjacent with consistent height
- Dropdowns: Custom styled with chevron icon

### Search & Filters
**Filter Panel**: Sticky sidebar or collapsible accordion
- Date range picker (from/to)
- User dropdown (multi-select)
- Printer dropdown (multi-select)
- Quick filter chips for common searches
- Clear all filters button

### Document Preview
**Modal/Drawer**: Full-height drawer from right, w-1/2 min-w-96
- Document viewer top 2/3
- Metadata panel bottom 1/3
- Download and close actions in header

### Alert System
**Toast Notifications**: Fixed top-right, slide-in animation
- Success: checkmark icon, auto-dismiss 3s
- Warning: alert triangle icon, manual dismiss
- Error: X circle icon, manual dismiss
- Width: max-w-md, p-4, rounded-lg, shadow-lg

### Authentication Pages
**Login/Register**: Centered card, max-w-md
- Logo and title centered above
- Form in elevated card with p-8, rounded-xl
- Footer links below (Privacy, Terms)
- No hero image - clean, professional business aesthetic

## Component Specifications

**Buttons**:
- Primary: px-6 py-2.5, rounded-md, font-medium
- Secondary: outlined with border-2
- Icon buttons: p-2, rounded-full, hover:bg-gray-100
- Disabled state: opacity-50, cursor-not-allowed

**Cards**: 
- Elevation: border with shadow-sm
- Padding: p-6
- Corner radius: rounded-lg
- Hover: subtle shadow-md transition

**Badges**:
- Status indicators: px-3 py-1, rounded-full, text-xs font-medium
- Role badges: px-2 py-0.5, rounded, text-xs

**Icons**: Heroicons (outline for navigation, solid for actions)

## Page-Specific Layouts

**Dashboard**: 
- Stats row at top (4 cards)
- Recent prints table below (with inline filters)
- Right sidebar: consumption summary + alerts panel

**Print Job Registration**:
- Stepper indicator at top showing progress
- Form sections with clear separation (space-y-8)
- File upload prominent in step 2
- Review summary in step 3 before submit

**Print History**:
- Advanced filter panel left (w-64, collapsible on mobile)
- Table with infinite scroll or pagination
- Bulk actions toolbar when rows selected

**User Management** (Admin):
- Table with inline edit capability
- Add user button top-right
- Role assignment dropdown in table

**Consumption Reports**:
- Chart.js integration for usage graphs
- Date range selector prominent
- Export to CSV/PDF button

## Responsive Behavior
- Mobile (< 768px): Stack all grids, hide sidebar (hamburger menu), cards full-width
- Tablet (768-1024px): 2-column grids, collapsible sidebar
- Desktop (> 1024px): Full layout with sidebar, 4-column stats

## Accessibility
- All form inputs with associated labels
- Focus states with ring-2 ring-offset-2
- ARIA labels for icon-only buttons
- Keyboard navigation for tables and modals
- Minimum touch target 44x44px

This design creates a professional, data-focused interface that prioritizes usability and clarity for business users managing print operations.