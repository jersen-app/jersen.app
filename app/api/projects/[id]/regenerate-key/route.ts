import { NextRequest, NextResponse } from "next/server";
import { regenerateApiKey } from "@/lib/actions/api-keys";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { apiKey } = await regenerateApiKey(params.id);
        return NextResponse.json({ apiKey });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
