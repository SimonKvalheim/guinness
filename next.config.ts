import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Explicitly include Prisma packages in standalone output
  // Next.js output tracing often misses these packages
  outputFileTracingIncludes: {
    '/*': [
      'node_modules/@prisma/adapter-neon/**/*',
      'node_modules/@neondatabase/serverless/**/*',
      'node_modules/@prisma/client/**/*',
      'node_modules/ws/**/*',
    ],
  },
};

export default nextConfig;
