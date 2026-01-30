# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and source code
COPY package.json package-lock.json* ./
COPY . .

# Install dependencies
RUN npm ci

# Skip environment validation during build
ENV SKIP_ENV_VALIDATION=1

# Use placeholder DATABASE_URL for prisma generate (only needs valid URL format)
# Railway will inject the real DATABASE_URL at runtime
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Generate Prisma Client with placeholder
RUN npx prisma generate

# Build the application
# Do NOT set ENV DATABASE_URL here to avoid Next.js inlining build-time value
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Install Prisma CLI globally (critical for migrations)
RUN npm install -g prisma

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# Explicitly copy Prisma packages for runtime (Neon adapter + dependencies)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@neondatabase ./node_modules/@neondatabase
COPY --from=builder /app/node_modules/ws ./node_modules/ws

# Remove any env files (Railway injects environment at runtime)
RUN rm -f .env .env.local .env.production

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
