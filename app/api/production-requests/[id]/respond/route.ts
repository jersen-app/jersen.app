import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import ProductionRequest from "@/models/ProductionRequest";
import Project from "@/models/Project";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, orgId } = await auth();
        const { id } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body;

        if (!action || !["accept", "decline"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        await connectDB();

        // Find the request and verify ownership
        const productionRequest = await ProductionRequest.findById(id);
        
        if (!productionRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (productionRequest.orgId !== orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (productionRequest.status !== "quoted") {
            return NextResponse.json({ error: "Quote can only be responded to when status is 'quoted'" }, { status: 400 });
        }

        if (action === "accept") {
            // Update request status to accepted
            productionRequest.status = "accepted";
            await productionRequest.save();

            // Update project production status
            await Project.findByIdAndUpdate(productionRequest.projectId, {
                productionStatus: "in_production",
            });

            return NextResponse.json({ 
                success: true, 
                message: "Quote accepted! Our team will begin working on your project.",
                status: "accepted"
            });
        } else {
            // Decline the quote
            productionRequest.status = "rejected";
            await productionRequest.save();

            // Reset project production status
            await Project.findByIdAndUpdate(productionRequest.projectId, {
                productionStatus: "none",
            });

            return NextResponse.json({ 
                success: true, 
                message: "Quote declined. You can submit a new request anytime.",
                status: "rejected"
            });
        }
    } catch (error) {
        console.error("Error responding to quote:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
