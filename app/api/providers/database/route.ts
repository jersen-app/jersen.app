import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/middleware/validateApiKey";
import mongoose from "mongoose";
import { getProjectConnectionString } from "@/lib/database/provisioner";

// Helper to get project database connection
async function getProjectDb(project: any) {
    if (!project.providers?.database?.enabled) {
        throw new Error("Database provider is not enabled for this project");
    }

    if (!project.providers.database.dbName || !project.providers.database.credentials) {
        throw new Error("Database not provisioned for this project");
    }

    const connectionString = getProjectConnectionString(
        project.providers.database.dbName,
        project.providers.database.credentials
    );

    // Create connection
    const conn = await mongoose.createConnection(connectionString).asPromise();
    return conn;
}

// POST /api/providers/database/insert
export async function POST(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    try {
        const body = await request.json();
        const { collection, document } = body;

        if (!collection || !document) {
            return NextResponse.json(
                { error: "Missing required fields: collection, document" },
                { status: 400 }
            );
        }

        const conn = await getProjectDb(project);
        const result = await conn.db.collection(collection).insertOne(document);
        await conn.close();

        return NextResponse.json({
            success: true,
            insertedId: result.insertedId,
        });
    } catch (error: any) {
        console.error("Database insert error:", error);
        return NextResponse.json(
            { error: error.message || "Insert failed" },
            { status: 500 }
        );
    }
}

// GET /api/providers/database/find?collection=xxx&query={}
export async function GET(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    try {
        const { searchParams } = new URL(request.url);
        const collection = searchParams.get("collection");
        const queryStr = searchParams.get("query") || "{}";
        const limitStr = searchParams.get("limit") || "100";

        if (!collection) {
            return NextResponse.json(
                { error: "Missing collection parameter" },
                { status: 400 }
            );
        }

        const query = JSON.parse(queryStr);
        const limit = parseInt(limitStr, 10);

        const conn = await getProjectDb(project);
        const documents = await conn.db
            .collection(collection)
            .find(query)
            .limit(limit)
            .toArray();
        await conn.close();

        return NextResponse.json({
            success: true,
            documents,
            count: documents.length,
        });
    } catch (error: any) {
        console.error("Database find error:", error);
        return NextResponse.json(
            { error: error.message || "Find failed" },
            { status: 500 }
        );
    }
}

// PATCH /api/providers/database/update
export async function PATCH(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    try {
        const body = await request.json();
        const { collection, query, update } = body;

        if (!collection || !query || !update) {
            return NextResponse.json(
                { error: "Missing required fields: collection, query, update" },
                { status: 400 }
            );
        }

        const conn = await getProjectDb(project);
        const result = await conn.db
            .collection(collection)
            .updateMany(query, { $set: update });
        await conn.close();

        return NextResponse.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        });
    } catch (error: any) {
        console.error("Database update error:", error);
        return NextResponse.json(
            { error: error.message || "Update failed" },
            { status: 500 }
        );
    }
}

// DELETE /api/providers/database
export async function DELETE(request: NextRequest) {
    const auth = await validateApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const { project } = auth;

    try {
        const { searchParams } = new URL(request.url);
        const collection = searchParams.get("collection");
        const queryStr = searchParams.get("query") || "{}";

        if (!collection) {
            return NextResponse.json(
                { error: "Missing collection parameter" },
                { status: 400 }
            );
        }

        const query = JSON.parse(queryStr);

        const conn = await getProjectDb(project);
        const result = await conn.db.collection(collection).deleteMany(query);
        await conn.close();

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
        });
    } catch (error: any) {
        console.error("Database delete error:", error);
        return NextResponse.json(
            { error: error.message || "Delete failed" },
            { status: 500 }
        );
    }
}
