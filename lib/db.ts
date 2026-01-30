import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Create Neon adapter - works with any PostgreSQL database, not just Neon
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Lazy initialization - don't create client until first access
function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export a Proxy to intercept all property accesses and ensure client is initialized
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
