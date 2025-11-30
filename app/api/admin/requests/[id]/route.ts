import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Project from "@/models/Project";

// Add your Clerk user ID here
const SUPER_ADMIN_USER_IDS = [
    process.env.SUPER_ADMIN_USER_ID || "",
];

async function isSuperAdmin(userId: string) {
    return SUPER_ADMIN_USER_IDS.includes(userId);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        const { id } = await params;

        if (!userId || !(await isSuperAdmin(userId))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { status, adminNotes } = body;

        await connectDB();

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

        const productionRequest = await ProductionRequest.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!productionRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Update project production status based on request status
        const productionStatusMap: Record<string, string> = {
            pending: "requested",
            reviewing: "requested",
            quoted: "quoted",
            accepted: "in_production",
            in_progress: "in_production",
            completed: "deployed",
            rejected: "none",
        };

        if (status && productionStatusMap[status]) {
            await Project.findByIdAndUpdate(productionRequest.projectId, {
                productionStatus: productionStatusMap[status],
            });
        }

        return NextResponse.json({ success: true, request: productionRequest });
    } catch (error) {
        console.error("Error updating production request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        const { id } = await params;

        if (!userId || !(await isSuperAdmin(userId))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const productionRequest = await ProductionRequest.findById(id).lean();

        if (!productionRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({ request: productionRequest });
    } catch (error) {
        console.error("Error fetching production request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
