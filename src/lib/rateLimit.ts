import crypto from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Fallback in-memory rate limiter for local development and testing
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, reset: Math.ceil(resetAt / 1000) };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: Math.ceil(record.resetAt / 1000) };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetAt / 1000),
  };
}

// IP Hash generation (never stores raw IP)
export function getIpHash(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "fallback-ip-salt-for-dev-privacy";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

let upstashRedis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {
    upstashRedis = null;
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (upstashRedis) {
    try {
      const ratelimit = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      });
      const result = await ratelimit.limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: Math.ceil(result.reset / 1000),
      };
    } catch {
      // Fallback to in-memory on redis connection error
      return memoryRateLimit(key, limit, windowSeconds);
    }
  }

  return memoryRateLimit(key, limit, windowSeconds);
}
