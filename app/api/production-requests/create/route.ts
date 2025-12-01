import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Project from "@/models/Project";

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, projectName, description, budgetRange, priority } = body;

        if (!projectId || !projectName || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Verify project exists and belongs to user's org or user
        const query = orgId 
            ? { _id: projectId, orgId } 
            : { _id: projectId, userId };
        const project = await Project.findOne(query);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Create the production request
        const productionRequest = await ProductionRequest.create({
            projectId,
            projectName,
            orgId: orgId || null,
            userId,
            userEmail: user.emailAddresses[0]?.emailAddress || "",
            userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown",
            description,
            budgetRange: budgetRange || "need_quote",
            priority: priority || "medium",
            status: "pending",
        });

        // Update project production status
        await Project.findByIdAndUpdate(projectId, {
            productionStatus: "requested",
        });

        return NextResponse.json({
            success: true,
            requestId: productionRequest._id,
        });
    } catch (error) {
        console.error("Error creating production request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Get requests for user's org
        const requests = await ProductionRequest.find({ orgId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error fetching production requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
