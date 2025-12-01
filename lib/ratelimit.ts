import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Check if Redis is configured
const isRedisConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN
);

// Create Redis client only if configured
const redis = isRedisConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

/**
 * Rate limit configurations for different endpoints
 */

// General API rate limit: 100 requests per minute
export const generalRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        analytics: true,
        prefix: "ratelimit:general",
    })
    : null;

// AI Chat rate limit: 20 requests per minute (more expensive operations)
export const aiChatRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        analytics: true,
        prefix: "ratelimit:ai-chat",
    })
    : null;

// AI Chat daily limit: 500 requests per day per user
export const aiChatDailyRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(500, "1 d"),
        analytics: true,
        prefix: "ratelimit:ai-chat-daily",
    })
    : null;

// Sandbox operations: 30 per minute (creating/destroying sandboxes)
export const sandboxRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:sandbox",
    })
    : null;

// Auth operations: 10 per minute (login, signup attempts)
export const authRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:auth",
    })
    : null;

// Transcription: 10 per minute
export const transcribeRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:transcribe",
    })
    : null;

// Project creation: 10 per hour
export const projectCreationRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "ratelimit:project-create",
    })
    : null;

// Strict rate limit for sensitive operations: 5 per minute
export const strictRatelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "ratelimit:strict",
    })
    : null;

/**
 * Check rate limit and return response if exceeded
 * @param ratelimit - The rate limiter to use
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @returns null if allowed, NextResponse if rate limited
 */
export async function checkRateLimit(
    ratelimit: Ratelimit | null,
    identifier: string
): Promise<NextResponse | null> {
    // If Redis is not configured, allow all requests (dev mode)
    if (!ratelimit) {
        return null;
    }

    try {
        const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

        if (!success) {
            return NextResponse.json(
                {
                    error: "Too many requests",
                    message: "Rate limit exceeded. Please try again later.",
                    limit,
                    remaining: 0,
                    reset: new Date(reset).toISOString(),
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": reset.toString(),
                        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
                    },
                }
            );
        }

        return null;
    } catch (error) {
        // If rate limiting fails, log error but allow request (fail open)
        console.error("Rate limit check failed:", error);
        return null;
    }
}

/**
 * Get rate limit headers to add to successful responses
 */
export async function getRateLimitHeaders(
    ratelimit: Ratelimit | null,
    identifier: string
): Promise<Record<string, string>> {
    if (!ratelimit) {
        return {};
    }

    try {
        const { limit, remaining, reset } = await ratelimit.limit(identifier);
        return {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
        };
    } catch {
        return {};
    }
}

/**
 * Create a custom rate limiter with specific limits
 */
export function createRatelimit(
    requests: number,
    window: `${number} ${"s" | "m" | "h" | "d"}`
): Ratelimit | null {
    if (!redis) return null;

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
    });
}

/**
 * IP-based rate limiting helper
 * Extracts IP from request headers (works with Vercel)
 */
export function getClientIP(request: Request): string {
    // Vercel provides the real IP in x-forwarded-for
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    // Fallback headers
    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    // Vercel also provides this
    const vercelIP = request.headers.get("x-vercel-forwarded-for");
    if (vercelIP) {
        return vercelIP.split(",")[0].trim();
    }

    return "unknown";
}

/**
 * Combined identifier for better rate limiting
 * Uses both user ID and IP to prevent abuse
 */
export function getRateLimitIdentifier(userId: string | null, request: Request): string {
    const ip = getClientIP(request);
    if (userId) {
        return `user:${userId}`;
    }
    return `ip:${ip}`;
}
