import { NextRequest, NextResponse } from "next/server";
import { regenerateApiKey } from "@/lib/actions/api-keys";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { apiKey } = await regenerateApiKey(id);
        return NextResponse.json({ apiKey });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

