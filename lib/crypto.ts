import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || "jersen-secret-key"
);

/**
 * Generate a new API key for a project
 * Format: jersen_proj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function generateApiKey(): string {
    const key = nanoid(32); // 32 character random string
    return `jersen_proj_${key}`;
}

/**
 * Create a secure JWT token for session data
 */
export async function createSecureToken(payload: string, expiresIn = "7d"): Promise<string> {
    const data = JSON.parse(payload);
    
    const token = await new SignJWT(data)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verify and decode a secure JWT token
 */
export async function verifySecureToken<T = Record<string, unknown>>(token: string): Promise<T | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as T;
    } catch {
        return null;
    }
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(apiKey, salt);
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(
    apiKey: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
}
