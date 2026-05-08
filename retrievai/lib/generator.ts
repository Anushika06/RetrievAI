import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RetrievedChunk } from "./vectorStore";

const SYSTEM_PROMPT = `You are a precise document assistant. Your ONLY job is to answer 
questions based on the document excerpts provided to you below as context.

Rules you must follow strictly:
1. ONLY use information from the provided context to answer. Do not use any outside knowledge.
2. If the answer cannot be found in the context, say exactly: "I couldn't find information 
   about that in the uploaded document."
3. When answering, briefly indicate which part of the document your answer comes from 
   (e.g., "According to the document..." or "The document mentions on page ~X...").
4. Be concise but complete. Do not pad your answer.
5. Never make up facts, statistics, names, or figures not present in the context.

--- DOCUMENT CONTEXT ---
{{CONTEXT_BLOCKS}}
--- END CONTEXT ---

Answer the user's question using only the above context.`;

function createGenerator(): ChatGoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set in environment variables.");
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-flash",
    streaming: true,
    temperature: 0.1,
    maxOutputTokens: 1024,
  });
}


export function formatContextBlocks(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const source = chunk.metadata?.source ?? "unknown";
      const page = chunk.metadata?.pageApprox ?? "?";
      return `[${index + 1}] Source: ${source} | ~Page ${page}\n"${chunk.pageContent}"`;
    })
    .join("\n\n");
}


export async function generateGroundedAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<ReadableStream<string>> {
  const generator = createGenerator();
  const contextBlocks = formatContextBlocks(chunks);
  const systemPromptWithContext = SYSTEM_PROMPT.replace(
    "{{CONTEXT_BLOCKS}}",
    contextBlocks
  );

  const stream = await generator.stream([
    { role: "system", content: systemPromptWithContext },
    { role: "user", content: question },
  ]);

  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text =
            typeof chunk.content === "string"
              ? chunk.content
              : chunk.content
                  .map((c) => ("text" in c ? c.text : ""))
                  .join("");

          if (text) {
            controller.enqueue(text);
          }
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(new Error(`Generation failed: ${message}`));
      }
    },
  });
}
