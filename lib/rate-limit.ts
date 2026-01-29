import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  interval: number; // in milliseconds
  maxRequests: number;
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (req: NextRequest, identifier: string) => {
      const now = Date.now();
      const key = `${identifier}`;

      if (!store[key] || now > store[key].resetTime) {
        store[key] = {
          count: 1,
          resetTime: now + config.interval,
        };
        return { success: true, remaining: config.maxRequests - 1 };
      }

      if (store[key].count >= config.maxRequests) {
        return {
          success: false,
          remaining: 0,
          reset: store[key].resetTime,
        };
      }

      store[key].count++;
      return {
        success: true,
        remaining: config.maxRequests - store[key].count,
      };
    },
  };
}

// Pre-configured rate limiters
export const commentRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 10,
});

export const uploadRateLimit = rateLimit({
  interval: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5,
});

export const authRateLimit = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});
