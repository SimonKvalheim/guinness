import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Prisma 7, we need to use an adapter
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  // During build time, DATABASE_URL might not be available
  // Create a client that will only fail when actually used, not during import
  if (!connectionString) {
    // Return a basic client that will fail at query time with a helpful error
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

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
