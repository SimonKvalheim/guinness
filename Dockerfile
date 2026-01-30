# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source files
COPY . .

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL (required for Prisma) and Prisma CLI globally
RUN apk add --no-cache openssl
RUN npm install -g prisma

# Copy built application and dependencies from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# Explicitly copy Prisma runtime packages (standalone may miss these)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@neondatabase ./node_modules/@neondatabase
COPY --from=builder /app/node_modules/ws ./node_modules/ws

# Remove any env files (Railway injects environment at runtime)
RUN rm -f .env .env.local .env.production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
