import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import mongoose from "mongoose";

// Separate database for all project data
const PROJECT_DB_URI = process.env.PROJECT_DB_URI || process.env.MONGO_URI;

// Check if origin is a valid E2B sandbox URL
function isValidE2BSandbox(origin: string | null): boolean {
    if (!origin) return false;
    return /^https:\/\/3000-[a-z0-9]+\.e2b\.app$/.test(origin);
}

// Get CORS headers for E2B sandboxes
function getCorsHeaders(origin: string | null): Record<string, string> {
    const isAllowed = isValidE2BSandbox(origin);
    return {
        "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-jersen-api-key",
        "Access-Control-Allow-Credentials": "true",
    };
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    return new NextResponse(null, { 
        status: 204, 
        headers: getCorsHeaders(origin)
    });
}

// Cached connection for project database
let projectDbConnection: mongoose.Connection | null = null;

// Get connection to the shared project database
async function getProjectDb() {
    if (projectDbConnection && projectDbConnection.readyState === 1) {
        return projectDbConnection;
    }

    if (!PROJECT_DB_URI) {
        throw new Error("PROJECT_DB_URI is not configured");
    }

    // Connect to the projectdb database
    projectDbConnection = await mongoose.createConnection(PROJECT_DB_URI, {
        dbName: "projectdb",
    }).asPromise();

    return projectDbConnection;
}

// Get collection name with project prefix for isolation
function getCollectionName(projectId: string, collection: string): string {
    return `proj_${projectId}_${collection}`;
}

// POST /api/providers/database
export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;

    try {
        const body = await request.json();
        const { collection, document } = body;

        if (!collection || !document) {
            return NextResponse.json(
                { error: "Missing required fields: collection, document" },
                { status: 400, headers: corsHeaders }
            );
        }

        const conn = await getProjectDb();
        const fullCollectionName = getCollectionName(project._id.toString(), collection);
        const result = await conn.db!.collection(fullCollectionName).insertOne(document);

        return NextResponse.json({
            success: true,
            insertedId: result.insertedId,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Database insert error:", error);
        return NextResponse.json(
            { error: error.message || "Insert failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// GET /api/providers/database?collection=xxx&query={}
export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;

    try {
        const { searchParams } = new URL(request.url);
        const collection = searchParams.get("collection");
        const queryStr = searchParams.get("query") || "{}";
        const limitStr = searchParams.get("limit") || "100";

        if (!collection) {
            return NextResponse.json(
                { error: "Missing collection parameter" },
                { status: 400, headers: corsHeaders }
            );
        }

        const query = JSON.parse(queryStr);
        const limit = parseInt(limitStr, 10);

        const conn = await getProjectDb();
        const fullCollectionName = getCollectionName(project._id.toString(), collection);
        const documents = await conn.db!
            .collection(fullCollectionName)
            .find(query)
            .limit(limit)
            .toArray();

        return NextResponse.json({
            success: true,
            documents,
            count: documents.length,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Database find error:", error);
        return NextResponse.json(
            { error: error.message || "Find failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// PATCH /api/providers/database
export async function PATCH(request: NextRequest) {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;

    try {
        const body = await request.json();
        const { collection, query, update } = body;

        if (!collection || !query || !update) {
            return NextResponse.json(
                { error: "Missing required fields: collection, query, update" },
                { status: 400, headers: corsHeaders }
            );
        }

        const conn = await getProjectDb();
        const fullCollectionName = getCollectionName(project._id.toString(), collection);
        
        // Handle both $set style and direct field updates
        const updateOp = update.$set ? update : { $set: update };
        const result = await conn.db!
            .collection(fullCollectionName)
            .updateMany(query, updateOp);

        return NextResponse.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Database update error:", error);
        return NextResponse.json(
            { error: error.message || "Update failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// DELETE /api/providers/database?collection=xxx&query={}
export async function DELETE(request: NextRequest) {
    const origin = request.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) {
        const headers = new Headers(auth.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(auth.body, { status: auth.status, headers });
    }

    const { project } = auth;

    try {
        const { searchParams } = new URL(request.url);
        const collection = searchParams.get("collection");
        const queryStr = searchParams.get("query") || "{}";

        if (!collection) {
            return NextResponse.json(
                { error: "Missing collection parameter" },
                { status: 400, headers: corsHeaders }
            );
        }

        const query = JSON.parse(queryStr);

        const conn = await getProjectDb();
        const fullCollectionName = getCollectionName(project._id.toString(), collection);
        const result = await conn.db!.collection(fullCollectionName).deleteMany(query);

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Database delete error:", error);
        return NextResponse.json(
            { error: error.message || "Delete failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}
