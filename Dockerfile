# Use Node.js 20 for better stability
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
# Copy Prisma files needed for postinstall script
COPY prisma ./prisma
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use placeholder DATABASE_URL for prisma generate (only needs valid URL format)
# Railway will inject the real DATABASE_URL at runtime
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Generate Prisma Client with placeholder
RUN npx prisma generate

# Build the application
# Do NOT set ENV DATABASE_URL here to avoid Next.js inlining build-time value
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Explicitly copy Prisma packages that standalone output misses
# This is critical for Prisma 7 with Neon adapter to work
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/adapter-neon ./node_modules/@prisma/adapter-neon
COPY --from=builder /app/node_modules/@neondatabase/serverless ./node_modules/@neondatabase/serverless
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy prisma.config.ts and schema for migrations (releaseCommand)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Do NOT set DATABASE_URL here - Railway injects it at runtime
CMD ["node", "server.js"]
