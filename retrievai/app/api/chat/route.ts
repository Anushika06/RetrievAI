import { NextRequest, NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/vectorStore";
import { generateGroundedAnswer } from "@/lib/generator";


interface ChatRequestBody {
  question: string;
  collectionId: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { question, collectionId } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "A non-empty 'question' string is required." },
        { status: 400 }
      );
    }

    if (!collectionId || typeof collectionId !== "string" || !collectionId.trim()) {
      return NextResponse.json(
        { error: "'collectionId' is required." },
        { status: 400 }
      );
    }

    const chunks = await retrieveChunks(question.trim(), collectionId, 5);

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: "No relevant content found.",
        },
        { status: 404 }
      );
    }

    const stream = await generateGroundedAnswer(question.trim(), chunks);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/chat] Error:", message);

    return NextResponse.json(
      {
        error: `Chat processing failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
