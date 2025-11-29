import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
};

export async function POST(req: NextRequest) {
  try {
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
        text: `You are an AI assistant helping to improve user requests for a coding AI assistant called Jersen AI.

The user spoke the following (transcribed from voice, may be in Khmer or English):
"${transcribedText}"

Your task:
1. If the text is in Khmer, understand the intent and provide a clear, well-structured English version that a coding AI can understand better
2. If the text is in English, clean it up and make it more precise
3. If it's a mix, unify it into a clear request
4. Add any helpful context or clarification that would help the AI understand what the user wants to build
5. Keep technical terms, framework names, and code-related vocabulary intact
6. Make it conversational but clear

Return ONLY the improved text, nothing else. If the original is already clear and well-formed, return it as-is with minor improvements.`,
      },
    ]);

    const improvedText = improvementResult.response.text().trim();

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
