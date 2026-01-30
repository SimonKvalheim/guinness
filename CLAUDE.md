# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

G-Splits is a mobile-first Next.js application where users upload photos of Guinness splits, receive AI-generated ratings from Claude Vision, and compete on leaderboards. The app uses Next.js 14+ with App Router, PostgreSQL with Prisma ORM, and NextAuth.js for authentication.

## Development Commands

### Core Commands
```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production (runs prisma generate first)
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database Commands
```bash
npx prisma db push       # Push schema changes to database (development)
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open Prisma Studio GUI
npm run db:migrate       # Deploy migrations (production)
```

### Important Notes
- Always run `npx prisma generate` after schema changes
- Use `prisma db push` in development, not `migrate` (no migration files are maintained)
- The build process automatically runs `prisma generate` via postinstall hook

## Architecture

### Next.js App Router Structure

The project uses Next.js App Router with route groups:

- `app/(auth)/` - Authentication pages (login, register) with auth-specific layout
- `app/(app)/` - Protected app pages (feed, upload, profile, leaderboard, split details)
- `app/api/` - API routes (RESTful endpoints)
- `app/page.tsx` - Landing page (root)

Route groups `(auth)` and `(app)` allow different layouts without affecting URL structure.

### Data Model

Three core models in [prisma/schema.prisma](prisma/schema.prisma):

- **User**: Authentication + profile (email, passwordHash, username, displayName, bio, avatarUrl)
- **Split**: Uploaded photos with AI ratings (imageUrl, caption, aiRating, aiFeedback, userId)
- **Comment**: User comments on splits (content, userId, splitId)

All use `@id @default(cuid())` for IDs. Cascade deletes ensure referential integrity.

### Database Configuration (Prisma 7)

**Critical**: This project uses Prisma 7 with the Neon adapter ([lib/db.ts:11-27](lib/db.ts#L11-L27)):

- **Adapter required**: Prisma 7 requires `@prisma/adapter-neon` with `@neondatabase/serverless`
- **Works with any PostgreSQL**: Despite the name, the Neon adapter works with Railway PostgreSQL, local PostgreSQL, or any PostgreSQL database
- **WebSocket configuration**: Uses `ws` package and sets `neonConfig.webSocketConstructor = ws`
- **Build-time placeholder**: Uses a placeholder `DATABASE_URL` during build if not set, allowing Next.js to compile without database access
- **Connection pooling**: The adapter creates a connection pool via `@neondatabase/serverless`

When modifying database code:
- Always use the adapter pattern shown in [lib/db.ts](lib/db.ts)
- Never remove the Neon adapter imports or configuration
- The singleton pattern prevents multiple Prisma instances in development

### Authentication Flow

NextAuth.js with JWT strategy ([lib/auth.ts](lib/auth.ts)):

1. **Credentials Provider**: Email/password authentication with bcrypt
2. **JWT Strategy**: Session stored in JWT tokens (no database sessions)
3. **Custom Pages**: Custom login page at `/login`
4. **Session Callbacks**: Extend session with `user.id` and `user.username`
5. **Protected Routes**: Use [lib/session.ts](lib/session.ts) helpers:
   - `getCurrentUser()` - Returns user or null
   - `requireAuth()` - Throws if not authenticated

### AI Rating System

Claude Vision integration ([lib/claude.ts](lib/claude.ts)):

- **Model**: `claude-3-5-sonnet-20241022` (Vision model)
- **Input**: Base64-encoded image (JPEG, PNG, WebP, GIF)
- **Output**: JSON with `rating` (1.0-10.0) and `feedback` (2-3 sentences)
- **Prompt Engineering**: Irish bartender persona with specific rating criteria
- **Error Handling**: Fallback to 5.0 rating with friendly message if API fails
- **Two Functions**:
  - `rateGuinnessSplit(imagePath)` - Reads from filesystem
  - `rateGuinnessSplitFromBuffer(buffer, mediaType)` - Accepts buffer directly

### Image Upload & Storage

File handling with Sharp ([lib/storage.ts](lib/storage.ts)):

- **Max Size**: 10MB
- **Allowed Types**: JPEG, PNG, WebP, HEIC
- **Processing**: Resize to max 1920x1920, convert to JPEG at 85% quality
- **Storage Path**: `UPLOAD_DIR` environment variable (production: `/app/uploads` on Railway volume, development: `./public/uploads`)
- **UUID Filenames**: Prevents collisions and obscures upload order
- **Functions**:
  - `saveUploadedImage(file)` - From File object
  - `saveImageBuffer(buffer)` - From Buffer
  - `validateImage(file)` - Pre-upload validation

### API Route Patterns

Consistent patterns across API routes:

1. **Authentication**: Use `requireAuth()` from [lib/session.ts](lib/session.ts) to protect routes
2. **Error Handling**: Return `NextResponse.json({ error: 'message' }, { status: code })`
3. **Success Responses**: Return data directly with appropriate status code
4. **Validation**: Use Zod schemas or manual validation before database operations

Example structure (see [app/api/splits/upload/route.ts](app/api/splits/upload/route.ts)):
```typescript
export async function POST(request: Request) {
  try {
    const user = await requireAuth(); // Throws if not authenticated
    // ... validation and processing
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

### Component Organization

- `components/ui/` - Reusable UI components (buttons, inputs, cards)
- `components/` - Feature-specific components:
  - `split-card.tsx` - Split display component
  - `bottom-nav.tsx` - Mobile navigation
  - `auth/` - Auth-related components
  - `providers.tsx` - Client-side providers wrapper

### Environment Variables

Required variables (see [.env.example](.env.example)):

- `DATABASE_URL` - PostgreSQL connection string (can be omitted during build)
- `NEXTAUTH_SECRET` - Auth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL
- `ANTHROPIC_API_KEY` - Claude API key
- `UPLOAD_DIR` - File storage path (defaults to `./public/uploads`)

Railway-specific:
- `RAILWAY_VOLUME_PATH` - Mount path for persistent storage (`/app/uploads`)

## Key Design Patterns

### Singleton Pattern for Prisma
The Prisma client uses a singleton pattern with global caching to prevent multiple instances in development hot-reloading ([lib/db.ts:29-31](lib/db.ts#L29-L31)).

### Image Processing Pipeline
All uploaded images go through: validation → buffer conversion → Sharp optimization → UUID naming → filesystem storage. This ensures consistent quality and prevents attacks.

### Fallback-First AI Integration
The Claude integration always returns a valid rating, using fallback values when the API fails. This prevents upload failures due to AI service issues.

### JWT Session Strategy
Uses JWT tokens instead of database sessions to reduce database queries and simplify horizontal scaling.

## Railway Deployment Notes

- **Volume Required**: Uploads need persistent storage mounted at `/app/uploads`
- **Database**: Uses Railway PostgreSQL with the Neon adapter
- **Build Process**: Requires `DATABASE_URL` placeholder for Prisma generation
- **Environment**: Set `UPLOAD_DIR=/app/uploads` in production

## Common Patterns

### Adding a New API Route
1. Create route handler in `app/api/[resource]/route.ts`
2. Use `requireAuth()` if authentication required
3. Validate input with Zod or manual checks
4. Return consistent error format
5. Update this documentation if it's a major endpoint

### Adding a New Database Model
1. Add model to [prisma/schema.prisma](prisma/schema.prisma)
2. Run `npx prisma db push`
3. Run `npx prisma generate`
4. Add TypeScript types if needed
5. Consider cascade delete relationships

### Working with Images
- Always use functions from [lib/storage.ts](lib/storage.ts)
- Never store original uploads; always optimize with Sharp
- Use `/uploads/[filename]` URLs for client-side access
- Remember images are stored outside `public/` in production (volume mount)
