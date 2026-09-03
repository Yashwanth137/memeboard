interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryBucket>();

// Periodic cleanup of expired in-memory buckets every 60s
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      if (bucket.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Checks rate limits.
 * If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses Upstash REST API.
 * Otherwise, falls back to in-memory sliding-window token bucket.
 */
export async function rateLimit(
  key: string,
  limit: number = 30,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis (if configured in production)
  if (upstashUrl && upstashToken) {
    try {
      // Atomic INCR + EXPIRE pipeline via Upstash REST API
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${key}`],
          ['EXPIRE', `ratelimit:${key}`, windowSeconds, 'NX'],
          ['TTL', `ratelimit:${key}`],
        ]),
        signal: AbortSignal.timeout(1500),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const currentCount = results[0]?.result || 1;
        const ttlSeconds = results[2]?.result || windowSeconds;
        const resetTime = Date.now() + ttlSeconds * 1000;

        return {
          success: currentCount <= limit,
          limit,
          remaining: Math.max(0, limit - currentCount),
          reset: resetTime,
        };
      }
    } catch {
      // Fallback to in-memory on Upstash failure
    }
  }

  // 2. In-Memory Fallback (local dev / tests)
  const now = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
    };
  }

  bucket.count += 1;
  const isAllowed = bucket.count <= limit;

  return {
    success: isAllowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: bucket.resetAt,
  };
}
