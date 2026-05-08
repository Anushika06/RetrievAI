import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

export interface ChunkMetadata {
  source: string;
  chunkIndex: number;
  pageApprox: number;
}

export function createChunker(): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
}


export async function chunkText(
  text: string,
  fileName: string
): Promise<Document<ChunkMetadata>[]> {
  const chunker = createChunker();
  const rawChunks = await chunker.splitText(text);

  let charOffset = 0;
  const CHARS_PER_PAGE = 3000;

  const documents: Document<ChunkMetadata>[] = rawChunks.map(
    (chunk, index) => {
      const pageApprox = Math.floor(charOffset / CHARS_PER_PAGE) + 1;
      charOffset += chunk.length;

      return new Document<ChunkMetadata>({
        pageContent: chunk,
        metadata: {
          source: fileName,
          chunkIndex: index,
          pageApprox,
        },
      });
    }
  );

  return documents;
}
