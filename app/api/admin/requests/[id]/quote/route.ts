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

export async function POST(
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
        const { amount, currency, description, estimatedDays } = body;

        if (!amount || !estimatedDays) {
            return NextResponse.json({ error: "Amount and estimated days are required" }, { status: 400 });
        }

        await connectDB();

        const quote = {
            amount,
            currency: currency || "USD",
            description: description || "",
            estimatedDays,
            createdAt: new Date(),
        };

        const productionRequest = await ProductionRequest.findByIdAndUpdate(
            id,
            { 
                quote, 
                status: "quoted",
                updatedAt: new Date() 
            },
            { new: true }
        );

        if (!productionRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Update project production status
        await Project.findByIdAndUpdate(productionRequest.projectId, {
            productionStatus: "quoted",
        });

        // TODO: Send email notification to user about the quote
        // You could integrate with SendGrid, Resend, etc.

        return NextResponse.json({ success: true, request: productionRequest });
    } catch (error) {
        console.error("Error sending quote:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
