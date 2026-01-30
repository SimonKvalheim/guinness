import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInitialized: boolean;
};

// Configure WebSocket for serverless environment (required for Neon adapter)
// This needs to be done before creating the Pool
neonConfig.webSocketConstructor = ws;

// For Prisma 7, we need to use an adapter
const createPrismaClient = () => {
  // IMPORTANT: Read DATABASE_URL at function call time, not module load time
  // This ensures we get the runtime value, not the build-time value
  const connectionString = process.env.DATABASE_URL;

  // Use a placeholder during build if DATABASE_URL is not set
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      console.error('DATABASE_URL is not set in production environment!');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    }
    // Fallback for build time
    const fallback = 'postgresql://build:build@localhost:5432/build';
    console.log('Using fallback DATABASE_URL:', fallback);
    const pool = new Pool({ connectionString: fallback });
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({
      adapter,
      log: ['error'],
    });
  }

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
