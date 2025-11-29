import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "jersen-storage";

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
 * Upload a file to R2
 */
export async function uploadFile(options: UploadOptions): Promise<string> {
    const fullKey = getProjectKey(options.projectId, options.key);

    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fullKey,
            Body: options.body,
            ContentType: options.contentType || "application/octet-stream",
        })
    );

    return fullKey;
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getDownloadUrl(
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
