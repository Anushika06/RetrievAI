import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { parse } from "csv-parse/sync";

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

/*
 * CHUNKING STRATEGY FOR CSV: Row-Group Chunking
 *
 * CSVs are tabular — each row is a unit of meaning. We must NOT split mid-row.
 * Strategy: convert each group of N rows into a natural-language-style text block,
 * with the header row repeated at the top of every chunk so the LLM always knows
 * what each column means — even when reading a chunk in isolation.
 *
 * rowsPerChunk: 50 — balances token count vs. context completeness.
 * Header repetition: ensures every chunk is self-contained and interpretable.
 */
export interface CsvChunkMetadata {
  source: string;
  chunkIndex: number;
  rowStart: number;
  rowEnd: number;
}

export function parseAndChunkCSV(
  csvText: string,
  fileName: string,
  rowsPerChunk = 50
): Document<CsvChunkMetadata>[] {
  const rows: string[][] = parse(csvText, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (rows.length < 1) {
    throw new Error("CSV must have a header row as its first line.");
  }

  const [headerRow, ...dataRows] = rows;

  if (headerRow.length === 0) {
    throw new Error("CSV must have a header row as its first line.");
  }

  const headerContext = `CSV Columns: ${headerRow.join(", ")}`;

  const documents: Document<CsvChunkMetadata>[] = [];

  for (let i = 0; i < dataRows.length; i += rowsPerChunk) {
    const batch = dataRows.slice(i, i + rowsPerChunk);
    const chunkIndex = Math.floor(i / rowsPerChunk);
    const rowStart = i + 1;
    const rowEnd = i + batch.length;

    const rowStrings = batch.map((row) =>
      headerRow
        .map((col, colIdx) => `${col}: ${row[colIdx] ?? ""}`)
        .join(" | ")
    );

    const pageContent = `${headerContext}\n\n${rowStrings.join("\n")}`;

    documents.push(
      new Document<CsvChunkMetadata>({
        pageContent,
        metadata: {
          source: fileName,
          chunkIndex,
          rowStart,
          rowEnd,
        },
      })
    );
  }

  return documents;
}
