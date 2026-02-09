# Refote

## Overview

Refote is a social coffee and tea check-in application for Saudi Arabia, similar to Untappd but for specialty beverages. Users can log drinks they've tried at cafes or from roasters, rate them, add tasting notes, and share with others. The app features a photo-forward, mobile-first design inspired by Instagram, Untappd, and Airbnb.

**Key Features:**

- Bilingual support (Arabic/English) with automatic RTL/LTR layouts
- 6,246 real Saudi café locations across Jeddah, Medina, and Riyadh
- Geolocation-based nearby café discovery with distance sorting
- City filters for browsing cafés in specific Saudi cities
- No maps - distance-based list view only

The application is built as a full-stack TypeScript project with a React frontend and Express backend. Uses in-memory storage with café data loaded from JSON.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite with HMR support

The frontend follows a mobile-first design pattern with a fixed bottom navigation bar. Pages are organized under `client/src/pages/` with reusable components in `client/src/components/`. The UI uses a warm coffee-themed color palette with CSS variables for theming (light/dark mode support).

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **API Design**: RESTful JSON API under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)

The server uses a simple storage interface pattern (`server/storage.ts`) that abstracts data operations. Routes are registered in `server/routes.ts`. The architecture supports both development (Vite dev server) and production (static file serving) modes.

### Data Models

Core entities defined in `shared/schema.ts`:

- **Users**: Profile information with avatar/cover images
- **Cafes**: Physical coffee shop locations
- **Roasters**: Coffee/tea roasting companies
- **Drinks**: Beverage types (coffee/tea with styles)
- **Check-ins**: User reviews with ratings, notes, and photos
- **Likes/Follows**: Social interaction tables

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Design System

The app follows specific design guidelines documented in `design_guidelines.md`:

- Typography: Inter (body) and DM Serif Display (headings)
- Mobile-first responsive layouts
- Card-based UI with check-in cards as primary content units
- Five-tab bottom navigation (Home, Discover, Check-In, Activity, Profile)

## External Dependencies

### Data Storage

- **In-Memory Storage**: MVP uses in-memory storage with sample data for cafes, roasters, drinks, and check-ins
- **Drizzle ORM**: Schema definitions ready for PostgreSQL migration when needed

### UI Component Libraries

- **shadcn/ui**: Pre-built accessible components (Radix UI primitives)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **cmdk**: Command palette component

### Third-Party Services

- Google Fonts CDN for Inter and DM Serif Display typography
- Potential integrations noted in build allowlist: Stripe, OpenAI, Google Generative AI, Nodemailer

### Development Tools

- **tsx**: TypeScript execution for development
- **esbuild**: Production server bundling
- **Vite plugins**: Replit-specific development enhancements
