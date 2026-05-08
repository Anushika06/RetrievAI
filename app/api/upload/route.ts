import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse";
import { chunkText } from "@/lib/chunker";
import { storeDocuments } from "@/lib/vectorStore";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = ["application/pdf", "text/plain"];


export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data. Please send multipart/form-data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Include a 'file' field in your request." },
        { status: 400 }
      );
    }

    const isAcceptedType =
      ACCEPTED_TYPES.includes(file.type) ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".pdf");

    if (!isAcceptedType) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${file.type}". Please upload a PDF or .txt file.`,
        },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          error: `File too large (${sizeMB}MB). Maximum allowed size is 10MB.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText: string;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const result = await pdfParse(buffer);
        rawText = result.text;
      } catch {
        return NextResponse.json(
          {
            error:
              "Failed to parse the PDF. The file may be encrypted, corrupted, or image-only.",
          },
          { status: 422 }
        );
      }
    } else {
      rawText = buffer.toString("utf-8");
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text found in the file. It may be an image-only PDF.",
        },
        { status: 422 }
      );
    }

    const documents = await chunkText(rawText, file.name);
    const chunkCount = documents.length;

    const collectionId = `retrievai_${uuidv4().replace(/-/g, "_")}`;

    await storeDocuments(documents, collectionId);

    return NextResponse.json({
      collectionId,
      chunkCount,
      fileName: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/upload] Unexpected error:", message);

    return NextResponse.json(
      {
        error: `Processing failed: ${message}. Please try again or check your environment configuration.`,
      },
      { status: 500 }
    );
  }
}
