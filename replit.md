# India's First Smart Amazon Affiliate Bot

## Overview

India's First Smart Amazon Affiliate Bot is a web application that automates the creation and distribution of Amazon affiliate marketing messages. The platform scrapes Amazon product data, generates viral marketing content optimized for WhatsApp and Telegram, and automatically exports campaigns to Google Sheets for tracking. It features product discovery across multiple categories with Hindi-English hybrid messaging to target Indian markets.

**Creator:** Yanik Jain | **Email:** salelooterz@gmail.com

## Recent Updates (December 1, 2025)

### Latest Features
- **Pricing Model**: ₹1,299 lifetime access with 10 days free trial and owner exemption
- **Daily Limits**: 50 products per day (previously 50/week)
- **Google OAuth**: Users can login with Google email and auto-export to marketing sheet
- **Email Marketing**: All Google login emails automatically stored in marketing sheet
- **Payment Tracking**: Users marked as paid after completing ₹1,299 payment
- **Owner Exemption**: "Yanik Jain" account has no payment requirement and unlimited daily limit
- **Free Trial**: All new users get 10 days free access before requiring payment

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript using Vite as the build tool
- Routing handled by Wouter (lightweight client-side router)
- State management via @tanstack/react-query for server state
- UI built with Radix UI primitives and shadcn/ui components
- Styling with Tailwind CSS v4 (using @tailwindcss/vite plugin)
- Animations powered by Framer Motion

**Pages:**
- Login.tsx: Traditional login + Google OAuth option
- Signup.tsx: User registration
- Home.tsx: Main dashboard with product scraping
- Pricing.tsx: ₹3,999 lifetime access page (for unpaid users)

**Design System:**
- Custom design tokens defined in CSS variables for theming
- Component library follows the "New York" shadcn style variant
- Dark-mode-first color scheme with neutral base colors
- Custom fonts: Space Grotesk for headings, Inter for body text, JetBrains Mono for code
- Icon system using Lucide React

**Build Configuration:**
- Path aliases configured for clean imports (@/, @shared/, @assets/)
- Development features include Replit-specific plugins for error overlays and dev banners
- Custom Vite plugin (metaImagesPlugin) for dynamic OpenGraph image URL injection
- Production builds output to dist/public directory

### Backend Architecture

**Technology Stack:**
- Express.js server running on Node.js
- TypeScript with ES modules
- HTTP server creation using Node's native http module
- In-memory storage implementation (MemStorage) for development/testing

**API Design:**
- RESTful endpoints under /api prefix
- Zod schemas for request validation
- Endpoints for product scraping, discovery, automation creation, and authentication
- Category-based product discovery with configurable limits
- Payment tracking and daily limit enforcement

**Core Services:**

1. **Authentication (server/routes.ts)**
   - Traditional username/password login
   - Google OAuth login with email capture
   - User email auto-export to marketing sheet
   - Owner exemption for Yanik Jain account

2. **Web Scraper (server/scraper.ts)**
   - Scrapes Amazon India product pages using Axios and Cheerio
   - Extracts: title, price, original price, discount, rating, reviews, images, features, ASIN
   - Bot detection avoidance: rotating user agents, delays between requests
   - Fallback mechanisms for blocked responses

3. **Product Discovery (server/productDiscovery.ts)**
   - Pre-configured search terms across 6 categories: electronics, mobile, home, fashion, beauty, fitness
   - Support for "all categories" and "hot deals" discovery modes
   - Amazon India search integration

4. **Message Generator (server/messageGenerator.ts)**
   - Generates platform-specific marketing messages (WhatsApp & Telegram)
   - Viral hooks library in Hindi/English hybrid format
   - Automatic affiliate tag injection
   - Price formatting for Indian Rupees
   - Different formatting for each platform (emoji usage, markdown syntax)

### Data Storage Solutions

**Database:**
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Drizzle ORM for type-safe database operations
- Schema defined in shared/schema.ts with two main tables:
  - `users`: Extended user model with email, isPaid, paidAt, createdAt
  - `automations`: Campaign tracking (product details, messages, timestamps, spreadsheet references)

**Development Storage:**
- In-memory storage fallback (MemStorage class) using Maps
- Implements same interface (IStorage) as production database layer
- Suitable for local development without database setup

**Migration Management:**
- Drizzle Kit configured for schema migrations
- Migration files output to ./migrations directory
- Database push command: `npm run db:push`

### External Dependencies

**Google Sheets Integration:**
- Uses official Google APIs Node.js client
- Replit Connectors system for OAuth authentication
- Auto-token refresh handling
- Functions:
  - `getOrCreateSheet()`: Creates per-user product automation sheet
  - `appendToSheet()`: Logs scrapped products with messages
  - `appendToMarketingSheet()`: Stores user emails for marketing campaigns

**Google OAuth:**
- Email-based login without password requirement
- Automatic user creation from email
- Marketing email auto-export to tracking sheet

**Payment Processing:**
- Razorpay integration ready (backend payment endpoint exists)
- ₹3,999 lifetime access model
- Owner exemption: Yanik Jain (any username containing "Yanik" case-insensitive)

**Amazon Web Scraping:**
- Axios HTTP client with custom headers and retry logic
- Cheerio for HTML parsing and DOM traversal
- Targets Amazon India (.in domain)
- Extracts structured product data from search results and product pages

**Development Integrations:**
- Replit-specific tooling: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner
- Environment-based feature flags for Replit deployment detection
- Automatic deployment URL detection for meta tag updates

**Third-Party UI Libraries:**
- Extensive use of Radix UI primitives for accessible components
- React Hook Form with Zod resolvers for form validation
- date-fns for date manipulation
- class-variance-authority and clsx for dynamic className generation
- cmdk for command palette functionality

**Build and Development Tools:**
- esbuild for server-side bundling (selective dependency bundling for cold start optimization)
- PostCSS with Tailwind and Autoprefixer
- TypeScript with strict mode and bundler module resolution
- Conditional bundling of server dependencies (allowlist approach)

## Technical Details

### Daily Limit System
- Counts products scraped in the current day (UTC midnight reset)
- Paid users: 50 products/day
- Owner: Unlimited
- Free trial users: 50 products/day for first 10 days

### Payment Flow
- New users get 10 days free trial automatically
- After 10 days, unpaid users redirected to /pricing page
- Users click "Pay ₹1,299 Now" for lifetime access
- Backend endpoint `/api/payment/complete` marks user as paid
- Lifetime access granted immediately

### Email Marketing System
- Google OAuth login captures email address
- Emails automatically appended to marketing sheet
- Format: [email, name]
- Ready for outreach campaigns

### Owner Features
- Username detection: "Yanik Jain" (case-insensitive partial match)
- No payment required
- No daily limit on scraping
- Full bot access
