import { nanoid } from "nanoid";

const MONGO_URI = process.env.MONGO_URI;

/**
 * Generate database credentials for a project
 * These are stored for reference but the main app connection is used
 */
export function generateDbCredentials() {
    return {
        username: `proj_${nanoid(16)}`,
        password: nanoid(32),
    };
}

/**
 * Provision a "virtual" database namespace for a project
 * 
 * Note: MongoDB Atlas doesn't allow programmatic user creation via the driver.
 * Instead, we use collection namespacing within the same database.
 * Each project gets collections prefixed with: proj_{projectId}_
 * 
 * For true database isolation, use MongoDB Atlas Admin API to create users,
 * or use self-hosted MongoDB.
 */
export async function provisionDatabase(projectId: string) {
    const dbName = `jersen_proj_${projectId}`;
    const credentials = generateDbCredentials();
    const collectionPrefix = `proj_${projectId}_`;

    // No need to create a separate user on Atlas
    // The project will use the main connection with collection namespacing
    
    return {
        dbName,
        credentials,
        collectionPrefix,
        // Flag to indicate this uses the shared connection
        useSharedConnection: true,
    };
}

/**
 * Get connection string for a project database
 * 
 * For Atlas, we return the main connection string since we use collection namespacing.
 * For self-hosted MongoDB with real user isolation, build a custom connection string.
 */
export function getProjectConnectionString(
    dbName: string,
    credentials: { username: string; password: string },
    useSharedConnection: boolean = true
): string {
    if (useSharedConnection) {
        // Return main connection - project isolation is done via collection prefix
        return MONGO_URI!;
    }

    // For self-hosted MongoDB with real user isolation:
    const baseUri = MONGO_URI!;
    const uriParts = baseUri.split("@");

    if (uriParts.length !== 2) {
        throw new Error("Invalid MongoDB URI format");
    }

    // Build connection string with project credentials
    return `mongodb+srv://${credentials.username}:${credentials.password}@${uriParts[1]}/${dbName}`;
}
