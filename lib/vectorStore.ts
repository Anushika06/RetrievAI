import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { createEmbedder } from "./embedder";
import { ChunkMetadata } from "./chunker";

export interface RetrievedChunk {
  pageContent: string;
  metadata: ChunkMetadata;
  score?: number;
}


function validateQdrantEnv(): { url: string; apiKey: string } {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    throw new Error(
      "QDRANT_URL is not set. Please add your Qdrant Cloud cluster URL to .env.local."
    );
  }
  if (!apiKey) {
    throw new Error(
      "QDRANT_API_KEY is not set. Please add your Qdrant API key to .env.local."
    );
  }

  return { url, apiKey };
}


export async function storeDocuments(
  documents: Document<ChunkMetadata>[],
  collectionName: string
): Promise<QdrantVectorStore> {
  const { url, apiKey } = validateQdrantEnv();
  const embedder = createEmbedder();

  try {
    const vectorStore = await QdrantVectorStore.fromDocuments(
      documents,
      embedder,
      {
        url,
        apiKey,
        collectionName,
      }
    );

    return vectorStore;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to store documents in Qdrant collection "${collectionName}": ${message}`
    );
  }
}


export async function retrieveChunks(
  query: string,
  collectionName: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const { url, apiKey } = validateQdrantEnv();
  const embedder = createEmbedder();

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embedder,
      {
        url,
        apiKey,
        collectionName,
      }
    );

    const results = await vectorStore.similaritySearchWithScore(query, k);

    return results.map(([doc, score]) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata as ChunkMetadata,
      score,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to retrieve chunks from Qdrant collection "${collectionName}": ${message}`
    );
  }
}
