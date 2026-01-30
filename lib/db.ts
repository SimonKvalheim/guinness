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

  // Use Neon adapter only for Neon databases (connection string contains 'neon' or uses prisma+postgres)
  const useNeonAdapter = connectionString.includes('neon') || connectionString.startsWith('prisma+postgres');

  if (useNeonAdapter) {
    // Configure WebSocket for serverless environment
    neonConfig.webSocketConstructor = ws;

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } else {
    // Use standard Prisma Client for regular PostgreSQL (like Railway)
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
