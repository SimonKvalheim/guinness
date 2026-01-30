# Next.js + Railway Deployment Research

Research compiled for G-Splits deployment debugging. Focused on the core issue: `DATABASE_URL` environment variable not accessible to the Prisma Neon adapter at runtime despite being set in Railway.

---

## Table of Contents

1. [Root Cause Analysis](#root-cause-analysis)
2. [Railway Environment Variables: Build-time vs Runtime](#railway-environment-variables)
3. [Next.js Standalone Output Pitfalls](#nextjs-standalone-output-pitfalls)
4. [Prisma 7 + Neon Adapter in Docker](#prisma-7--neon-adapter-in-docker)
5. [Dockerfile Best Practices for Railway](#dockerfile-best-practices)
6. [Railway Volume Mounts](#railway-volume-mounts)
7. [railway.toml Configuration](#railwaytoml-configuration)
8. [Checklist: Fixing the G-Splits Deployment](#checklist-fixing-g-splits)
9. [Sources](#sources)

---

## Root Cause Analysis

The G-Splits deployment has `DATABASE_URL` set in Railway's Variables tab but the Prisma Neon adapter receives `undefined` at runtime. Based on research, there are **three likely causes**:

### Cause 1: Next.js Standalone Missing Neon Adapter Packages

The standalone output (`output: 'standalone'`) uses Next.js output tracing to determine which `node_modules` to include. **The tracer often fails to include Prisma adapter packages** like `@prisma/adapter-neon` and `@neondatabase/serverless`. If these packages are missing from the standalone `node_modules`, the database module will fail silently or throw at runtime.

The current Dockerfile copies `node_modules/.prisma` but does NOT copy:
- `node_modules/@prisma/adapter-neon`
- `node_modules/@neondatabase/serverless`
- `node_modules/@prisma/client` (the main package, not just the generated `.prisma`)
- `node_modules/ws` (WebSocket package required by Neon adapter)

**This is very likely the primary cause.**

### Cause 2: Docker `ARG` Leaking into Runtime Stage

The current Dockerfile has:
```dockerfile
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
```

This is in the **builder** stage. In a multi-stage build, `ENV` set in the builder stage does NOT carry over to the runner stage. However, Railway injects service variables into the container environment at runtime automatically. The issue is that if the builder stage bakes in a build-time `DATABASE_URL` value and Next.js inlines it, the runtime `process.env.DATABASE_URL` might return the build-time value (or empty string) instead of the runtime value.

### Cause 3: Module-Level Code Execution at Build Time

Next.js pre-renders pages and executes module-level code during `next build`. If `lib/db.ts` is imported by any server component that gets pre-rendered, the `process.env.DATABASE_URL` could be evaluated at build time (when it's the build ARG value or a placeholder), not at runtime.

The current code uses a Proxy + lazy initialization, which should prevent this. But if any code path triggers `getPrismaClient()` during build, it will capture the build-time value.

---

## Railway Environment Variables

### How Railway Injects Variables

| Stage | How variables are available |
|-------|---------------------------|
| **Build (Nixpacks)** | All service variables are automatically available as env vars |
| **Build (Dockerfile)** | Variables are passed as Docker **build arguments** (`ARG`). You must declare `ARG VAR_NAME` to use them |
| **Runtime** | Variables are automatically injected into the container environment. No `ARG` or `ENV` needed |

### Key Rules

1. **`ARG` is build-only** -- specifying `ARG DATABASE_URL` makes it available during `docker build`, but it does NOT persist into the running container
2. **`ENV` persists into the image** -- `ENV DATABASE_URL=$DATABASE_URL` in a build stage bakes the value into that stage's image layer
3. **Multi-stage builds reset `ARG`/`ENV`** -- the runner stage starts fresh. Railway injects runtime vars directly into the container's environment
4. **You do NOT need `ENV DATABASE_URL` in the runner stage** -- Railway handles this automatically
5. **Reference variables** (like `${{Postgres.DATABASE_URL}}`) are resolved by Railway before injection

### Common Mistake

```dockerfile
# Builder stage
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL  # Bakes build-time value into builder image

# Runner stage
# DATABASE_URL is NOT set here from the builder
# But Railway injects it at runtime -- this should work
# UNLESS Next.js already inlined it during build
```

---

## Next.js Standalone Output Pitfalls

### How Standalone Works

When `output: 'standalone'` is set in `next.config.ts`:
1. Next.js traces all `import`/`require` calls to determine which files are needed
2. It copies only the necessary `node_modules` into `.next/standalone/node_modules`
3. A minimal `server.js` is generated that doesn't need `next start`
4. The idea is to run `node server.js` with only the traced dependencies

### Known Issues

1. **Missing `node_modules`** ([Issue #56357](https://github.com/vercel/next.js/issues/56357)): The output tracer can miss packages, especially:
   - Packages loaded dynamically
   - Native modules
   - Prisma adapters and their dependencies

2. **Environment variables inlined at build time**: `process.env.SOME_VAR` references in server code may be replaced with the build-time value by webpack's `DefinePlugin`. Server-side `process.env` reads should work at runtime, but only if:
   - The code runs in a dynamic context (not pre-rendered)
   - The reference isn't destructured (`const { DATABASE_URL } = process.env` won't work)
   - The module isn't evaluated at build time

3. **`NEXT_PUBLIC_` variables are ALWAYS inlined**: Any variable prefixed with `NEXT_PUBLIC_` is replaced at build time and frozen forever. This does not apply to `DATABASE_URL` (no prefix), but is important to know.

### Fix: `outputFileTracingIncludes`

Next.js provides a config option to explicitly include files in the standalone output:

```js
// next.config.ts
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': [
      'node_modules/@prisma/adapter-neon/**/*',
      'node_modules/@neondatabase/serverless/**/*',
      'node_modules/ws/**/*',
    ],
  },
};
```

Alternatively, manually copy them in the Dockerfile (see [Dockerfile section](#dockerfile-best-practices)).

---

## Prisma 7 + Neon Adapter in Docker

### Prisma 7 Architecture Changes

- Prisma 7 introduced a "Rust-free" architecture using **Driver Adapters**
- The Neon adapter (`@prisma/adapter-neon`) uses `@neondatabase/serverless` for connections
- The `ws` package is required for WebSocket connections (non-browser environments)
- No more Rust query engine binary -- the adapter talks directly to the database

### What Needs to Be in the Runner Stage

For Prisma 7 with the Neon adapter, the runner stage needs:

| Package | Why |
|---------|-----|
| `node_modules/.prisma` | Generated Prisma Client (schema-specific code) |
| `node_modules/@prisma/client` | Core Prisma Client library |
| `node_modules/@prisma/adapter-neon` | The Neon driver adapter |
| `node_modules/@neondatabase/serverless` | Neon's serverless driver (Pool, etc.) |
| `node_modules/ws` | WebSocket implementation for Node.js |

### Common Docker Issue ([Discussion #28759](https://github.com/prisma/prisma/discussions/28759))

Users report that standalone `node_modules` don't include Prisma adapter packages. The fix is to explicitly copy them:

```dockerfile
# Runner stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Explicitly copy Prisma packages that standalone misses
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/adapter-neon ./node_modules/@prisma/adapter-neon
COPY --from=builder /app/node_modules/@neondatabase/serverless ./node_modules/@neondatabase/serverless
COPY --from=builder /app/node_modules/ws ./node_modules/ws
```

### Ensure Packages Are in `dependencies` (Not `devDependencies`)

The Prisma adapter packages must be in `dependencies` in `package.json`, not `devDependencies`. Next.js output tracing only traces `dependencies` for standalone output.

---

## Dockerfile Best Practices

### Recommended Multi-Stage Dockerfile for Next.js + Prisma on Railway

```dockerfile
# Stage 1: Base
FROM node:20-alpine AS base

# Stage 2: Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Only declare ARGs needed for build (NEXT_PUBLIC_ vars)
# Do NOT set ENV DATABASE_URL here -- let Railway inject at runtime
# If prisma generate needs it, use a dummy value:
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build

# Stage 4: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma packages that standalone output misses
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/adapter-neon ./node_modules/@prisma/adapter-neon
COPY --from=builder /app/node_modules/@neondatabase/serverless ./node_modules/@neondatabase/serverless
COPY --from=builder /app/node_modules/ws ./node_modules/ws

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Do NOT set DATABASE_URL here -- Railway injects it at runtime
CMD ["node", "server.js"]
```

### Key Differences from Current Dockerfile

1. **Don't use `ENV DATABASE_URL=$DATABASE_URL` in builder** -- this can cause Next.js to inline the build-time value
2. **Use a placeholder for `prisma generate`** -- it only needs a valid-looking URL to generate the client
3. **Copy all Prisma-related packages explicitly** -- don't rely on standalone tracing
4. **Don't set `DATABASE_URL` in runner stage** -- Railway injects it automatically
5. **Use Node 20 instead of 24** -- Node 24 is very new and may have compatibility issues

---

## Railway Volume Mounts

### How Volumes Work

- Volumes are mounted at **runtime only**, not during build or pre-deploy
- Mount path should include the app path (e.g., `/app/uploads` for Nixpacks builds)
- Only one deployment can mount a volume at a time (causes brief downtime on redeploy)
- Backups are available for Pro users

### Best Practices for File Uploads

1. **Match code path to mount path**: If volume is at `/app/uploads`, set `UPLOAD_DIR=/app/uploads`
2. **Serve files via API route**: Railway doesn't auto-serve volume files. Create a Next.js API route to stream files from the volume path
3. **Consider object storage**: For production, S3/Cloudflare R2 is more robust than Railway volumes
4. **Don't write to volume at build time**: It won't persist

### Serving Uploaded Files

Since uploads are stored outside `public/` on Railway, you need an API route like:

```typescript
// app/api/uploads/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
  const filePath = path.join(uploadDir, params.filename);

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: { 'Content-Type': 'image/jpeg' },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
```

---

## railway.toml Configuration

### Recommended Configuration

```toml
[build]
builder = "dockerfile"
dockerfilePath = "./Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 120
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Health Check Endpoint

Create a health check that verifies database connectivity:

```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';
```

---

## Checklist: Fixing the G-Splits Deployment

Based on this research, here are the specific changes needed:

### 1. Fix the Dockerfile

- [ ] Remove `ENV DATABASE_URL=$DATABASE_URL` from builder stage (or use a placeholder only for `prisma generate`)
- [ ] Add explicit COPY commands for Prisma adapter packages (`@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`, `@prisma/client`)
- [ ] Do NOT set `DATABASE_URL` as `ENV` in the runner stage
- [ ] Consider downgrading from Node 24 to Node 20 for stability

### 2. Fix next.config.ts (Alternative to Dockerfile COPY)

- [ ] Add `outputFileTracingIncludes` to explicitly include Prisma packages in standalone output

### 3. Verify package.json

- [ ] Ensure `@prisma/adapter-neon`, `@neondatabase/serverless`, and `ws` are in `dependencies` (not `devDependencies`)

### 4. Add Health Check

- [ ] Create `/api/health` endpoint
- [ ] Add `railway.toml` with healthcheck configuration

### 5. Verify lib/db.ts

- [ ] Confirm `process.env.DATABASE_URL` is read at function call time (not module scope) -- **already done correctly**
- [ ] Confirm no destructuring of `process.env` -- **already done correctly**
- [ ] The Proxy pattern for lazy initialization is correct

### 6. Railway Configuration

- [ ] Verify `DATABASE_URL` is set in the service's Variables tab (not just the project level)
- [ ] Verify the variable references are resolved (e.g., `${{Postgres.DATABASE_URL}}`)
- [ ] Ensure no `railway.toml` overrides are conflicting

---

## Sources

### Railway Documentation
- [Railway: Build from a Dockerfile](https://docs.railway.com/guides/dockerfiles)
- [Railway: Config as Code (railway.toml)](https://docs.railway.com/reference/config-as-code)
- [Railway: Build Configuration](https://docs.railway.com/guides/build-configuration)
- [Railway: Using Volumes](https://docs.railway.com/guides/volumes)
- [Railway: Volumes Reference](https://docs.railway.com/reference/volumes)

### Railway Community
- [Dockerized Next.js app - not getting environment variables on runtime](https://station.railway.com/questions/dockerized-next-js-app-not-getting-env-00e1af95)
- [Docker Build Not Receiving Environment Variables as ARGs](https://station.railway.com/questions/docker-build-not-receiving-environment-v-be854eea)
- [Environment variables Railway error](https://station.railway.com/questions/environment-variables-railway-error-ee399eac)
- [Environment variables not available during build](https://station.railway.com/questions/environment-variables-not-available-duri-793b3e1a)

### Next.js
- [Next.js: Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables)
- [Next.js: output config (standalone)](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output)
- [Issue #53367: Custom process.env variables not available in docker standalone output](https://github.com/vercel/next.js/issues/53367)
- [Issue #56357: Missing node_modules in standalone output](https://github.com/vercel/next.js/issues/56357)
- [Issue #80194: Since 15.3 environment variables not available in client components using standalone](https://github.com/vercel/next.js/issues/80194)
- [Discussion #44628: Better support for runtime environment variables](https://github.com/vercel/next.js/discussions/44628)
- [Discussion #87229: Runtime environment variables in Next.js](https://github.com/vercel/next.js/discussions/87229)

### Prisma
- [Prisma: How to use Prisma in Docker](https://www.prisma.io/docs/guides/docker)
- [Prisma: How to use Prisma ORM with Next.js](https://www.prisma.io/docs/guides/nextjs)
- [Discussion #28759: Prisma 7 + Docker + Next.js standalone missing node_modules](https://github.com/prisma/prisma/discussions/28759)
- [Discussion #24528: Unable to use @prisma/client with NextJS + Docker](https://github.com/prisma/prisma/discussions/24528)
- [Prisma: Caveats when deploying to AWS platforms](https://www.prisma.io/docs/orm/prisma-client/deployment/caveats-when-deploying-to-aws-platforms)

### Blog Posts & Community
- [Next.js and Prisma in Docker (blog.jonrshar.pe)](https://blog.jonrshar.pe/2024/Dec/24/nextjs-prisma-docker.html)
- [Environment Variables with Containerized Next.js (Medium)](https://medium.com/@scalablecto/environment-variables-with-containerized-next-js-c13cc05ee099)
- [Runtime environment variables in Next.js (nemanjamitic.com)](https://nemanjamitic.com/blog/2025-12-13-nextjs-runtime-environment-variables)
- [Dockerizing a Next.js Application in 2025 (Medium)](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe)
- [NextJs App Deployment with Docker: Complete Guide for 2025](https://codeparrot.ai/blogs/deploy-nextjs-app-with-docker-complete-guide-for-2025)
