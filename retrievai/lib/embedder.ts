import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";


export function createEmbedder(): GoogleGenerativeAIEmbeddings {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please add it to your .env.local file."
    );
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: "gemini-embedding-001",
  });
}

export async function embedInBatches(
  texts: string[],
  batchSize = 20
): Promise<number[][]> {
  const embedder = createEmbedder();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await embedder.embedDocuments(batch);
    allEmbeddings.push(...batchEmbeddings);

    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allEmbeddings;
}
