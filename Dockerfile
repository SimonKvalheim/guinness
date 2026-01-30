# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and source code first (needed for Prisma schema)
COPY package-lock.json ./
COPY . .

# Install dependencies
RUN npm ci

# Skip environment validation during build
ENV SKIP_ENV_VALIDATION=1

# Generate Prisma client
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

RUN apk add openssl
# Prisma is used in prod deployment
RUN npm install -g prisma

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/public ./public/

# Remove any env file
RUN rm -f .env

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
