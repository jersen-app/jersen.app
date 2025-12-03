import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { checkCredits, consumeCredit } from "@/lib/subscription";
import { transcribeRatelimit, checkRateLimit, getRateLimitIdentifier } from "@/lib/ratelimit";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
};

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(userId, req);
    const rateLimited = await checkRateLimit(transcribeRatelimit, rateLimitId);
    if (rateLimited) return rateLimited;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization required", message: "Please select an organization to use AI features." },
        { status: 400 }
      );
    }

    // Check credits before processing
    const creditCheck = await checkCredits(orgId);
    
    if (!creditCheck.allowed) {
      return NextResponse.json({
        error: "Credit limit reached",
        message: creditCheck.reason,
        subscription: creditCheck.subscription,
        remainingCredits: creditCheck.remainingCredits,
        hourlyRemaining: creditCheck.hourlyRemaining,
      }, {
        status: 429,
      });
    }

    const { audio, mimeType } = await req.json();

    if (!audio) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    const genAI = getGenAI();
    // Use Gemini 2.0 Flash for audio transcription
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // First, transcribe the audio
    const transcriptionResult = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audio,
        },
      },
      {
        text: `Transcribe this audio exactly as spoken. The audio may be in Khmer (ភាសាខ្មែរ), English, or a mix of both languages. 
        
Important:
- Transcribe accurately in the original language(s) spoken
- Preserve any code-related terms in English
- If there are technical terms, keep them as-is
- Return ONLY the transcription, nothing else`,
      },
    ]);

    const transcribedText = transcriptionResult.response.text().trim();

    if (!transcribedText) {
      return NextResponse.json(
        { error: "Could not transcribe audio" },
        { status: 400 }
      );
    }

    // Now improve the transcription to make it a better prompt
    const improvementResult = await model.generateContent([
      {
        text: `You are helping format voice input for Jersen AI, a code generation assistant that builds web applications.

CONTEXT ABOUT JERSEN AI:
- Jersen AI already has access to the user's project files, framework, and codebase
- It can create, edit, and delete files directly
- It uses Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui components
- It has tools to search files, read code, validate changes, and discover existing components
- Users are talking TO their existing project - they don't need to specify frameworks or storage methods
- The AI figures out the technical details from the existing codebase

USER'S VOICE INPUT (may be in Khmer, English, or mixed):
"${transcribedText}"

YOUR TASK:
1. Convert to a clear, concise instruction that tells the AI WHAT to do (not HOW)
2. If in Khmer, translate to English while preserving the intent
3. Remove filler words, hesitations, and unnecessary clarifications
4. Keep it as a direct request/instruction - the user is talking to their AI coding assistant
5. DO NOT add questions like "what framework?" or "how should it be stored?" - the AI already knows
6. DO NOT over-explain or add unnecessary technical suggestions
7. Keep the user's voice and intent - just clean it up

EXAMPLES:
- "add a login page" → "Add a login page with email and password authentication"
- "ខ្ញុំចង់បន្ថែម dark mode" → "Add dark mode toggle to the application"
- "make the button bigger and change color to blue" → "Make the button larger and change its color to blue"
- "umm I want like a dashboard that shows user stats" → "Create a dashboard that displays user statistics"

Return ONLY the cleaned-up request. Keep it brief and actionable.`,
      },
    ]);

    const improvedText = improvementResult.response.text().trim();

    // Consume credit after successful transcription
    await consumeCredit(
      orgId,
      userId,
      "transcribe", // Use "transcribe" as projectId for tracking
      "transcribe",
      1,
      {
        audioMimeType: mimeType,
        model: "gemini-2.0-flash-exp",
      }
    );

    return NextResponse.json({
      text: transcribedText,
      improvedText: improvedText || transcribedText,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
