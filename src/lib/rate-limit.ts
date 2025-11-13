/**
 * Simple in-memory rate limiter for API endpoints
 * Uses Map to store rate limit counters with expiration
 */

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

type RateLimitOptions = {
  key: string;
  limit: number;
  window: number; // in seconds
};

export async function rateLimit({
  key,
  limit,
  window,
}: RateLimitOptions): Promise<void> {
  const now = Date.now();
  const windowMs = window * 1000;
  const resetTime = now + windowMs;

  // Get current rate limit data
  const current = rateLimitStore.get(key);

  // If no entry exists or the window has expired, create/reset
  if (!current || now >= current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime });
    return;
  }

  // If limit exceeded, throw error
  if (current.count >= limit) {
    const error = new Error("Rate limit exceeded");
    (error as any).status = 429;
    throw error;
  }

  // Increment count
  rateLimitStore.set(key, {
    count: current.count + 1,
    resetTime: current.resetTime,
  });

  // Clean up old entries periodically
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now >= data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimits() {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(key: string) {
  return rateLimitStore.get(key) || null;
}
