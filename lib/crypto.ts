import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

/**
 * Generate a new API key for a project
 * Format: jersen_proj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function generateApiKey(): string {
    const key = nanoid(32); // 32 character random string
    return `jersen_proj_${key}`;
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
