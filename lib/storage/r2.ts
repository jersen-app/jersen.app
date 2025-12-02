import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "jersen-vercel";
const PUBLIC_GATEWAY = process.env.PUBLIC_GATEWAY || "https://gateway.jersen.app";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn("R2 credentials not configured. Storage provider will not work.");
}

const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || "",
    },
});

export interface UploadOptions {
    projectId: string;
    key: string;
    body: Buffer;
    contentType?: string;
}

export interface DownloadOptions {
    projectId: string;
    key: string;
}

export interface DeleteOptions {
    projectId: string;
    key: string;
}

/**
 * Get the full key with project prefix
 */
function getProjectKey(projectId: string, key: string): string {
    return `projects/${projectId}/${key}`;
}

/**
 * Get the public URL for a file via the Cloudflare gateway
 */
export function getPublicUrl(projectId: string, key: string): string {
    const fullKey = getProjectKey(projectId, key);
    return `${PUBLIC_GATEWAY}/${fullKey}`;
}

/**
 * Upload a file to R2
 * Returns both the key and the public URL
 */
export async function uploadFile(options: UploadOptions): Promise<{ key: string; url: string }> {
    const fullKey = getProjectKey(options.projectId, options.key);

    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fullKey,
            Body: options.body,
            ContentType: options.contentType || "application/octet-stream",
        })
    );

    return {
        key: fullKey,
        url: getPublicUrl(options.projectId, options.key),
    };
}

/**
 * Get a presigned URL for downloading a file (for private files)
 */
export async function getSignedDownloadUrl(
    options: DownloadOptions,
    expiresIn: number = 3600
): Promise<string> {
    const fullKey = getProjectKey(options.projectId, options.key);

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fullKey,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get the public download URL for a file (via Cloudflare gateway)
 * This is the preferred method as it doesn't consume Vercel bandwidth
 */
export function getDownloadUrl(options: DownloadOptions): string {
    return getPublicUrl(options.projectId, options.key);
}

/**
 * Delete a file from R2
 */
export async function deleteFile(options: DeleteOptions): Promise<void> {
    const fullKey = getProjectKey(options.projectId, options.key);

    await r2Client.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fullKey,
        })
    );
}
