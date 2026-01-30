import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Prisma 7, we need to use an adapter
const createPrismaClient = () => {
  // Use a placeholder during build if DATABASE_URL is not set
  // This allows Next.js to build without a real database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://build:build@localhost:5432/build';

  // Configure WebSocket for serverless environment (required for Neon adapter)
  neonConfig.webSocketConstructor = ws;

  // Create Neon adapter - works with any PostgreSQL database, not just Neon
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
