import mongoose from "mongoose";
import { nanoid } from "nanoid";

const MONGO_URI = process.env.MONGO_URI;

/**
 * Generate database credentials for a project
 */
export function generateDbCredentials() {
    return {
        username: `proj_${nanoid(16)}`,
        password: nanoid(32),
    };
}

/**
 * Provision a new database for a project
 * Creates a database with format: jersen_proj_{projectId}
 */
export async function provisionDatabase(projectId: string) {
    const dbName = `jersen_proj_${projectId}`;
    const credentials = generateDbCredentials();

    try {
        // Connect to admin database
        const adminConn = await mongoose.createConnection(MONGO_URI!).asPromise();

        // Create database user with access to project database
        await adminConn.db.admin().command({
            createUser: credentials.username,
            pwd: credentials.password,
            roles: [
                {
                    role: "readWrite",
                    db: dbName,
                },
            ],
        });

        await adminConn.close();

        return {
            dbName,
            credentials,
        };
    } catch (error: any) {
        console.error("Database provisioning error:", error);
        throw new Error(`Failed to provision database: ${error.message}`);
    }
}

/**
 * Get connection string for a project database
 */
export function getProjectConnectionString(
    dbName: string,
    credentials: { username: string; password: string }
): string {
    const baseUri = MONGO_URI!;
    const uriParts = baseUri.split("@");

    if (uriParts.length !== 2) {
        throw new Error("Invalid MongoDB URI format");
    }

    // Build connection string with project credentials
    return `mongodb+srv://${credentials.username}:${credentials.password}@${uriParts[1]}/${dbName}`;
}
