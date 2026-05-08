# RetrievAI — RAG-Powered Document Intelligence

> Upload any PDF or `.txt` document and chat with it instantly. Every answer is grounded in your document — zero hallucination, complete source citations.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Google Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-orange?style=flat-square&logo=google)
![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-purple?style=flat-square)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Chunking Strategy](#chunking-strategy)
4. [Why text-embedding-004?](#why-text-embedding-004)
5. [How Retrieval Works](#how-retrieval-works)
6. [Grounding Enforcement](#grounding-enforcement)
7. [Setup Instructions](#setup-instructions)
8. [Deployment on Vercel](#deployment-on-vercel)
9. [Project Structure](#project-structure)

---

## Overview

RetrievAI is a full-stack Retrieval-Augmented Generation (RAG) application built on:

- **Next.js 14** (App Router) — single-repo full-stack TypeScript
- **Google Gemini 1.5 Flash** — fast generation with 1M token context
- **Google text-embedding-004** — 768-dimensional semantic embeddings (free)
- **Qdrant Cloud** — managed vector database (free tier, no credit card)
- **LangChain** — orchestration for chunking, embedding, and retrieval

The UI uses a custom "Obsidian Intelligence" design system with Three.js particle animations, glassmorphism panels, and real-time streaming responses.

---

## Architecture

```
INGESTION PIPELINE
==================
User uploads PDF/TXT
     |
     v
POST /api/upload
     |
     +-- [1] Parse ---- pdf-parse (PDF) / UTF-8 decode (TXT)
     |
     +-- [2] Chunk ---- RecursiveCharacterTextSplitter
     |                  chunkSize=1000, overlap=200
     |                  Separators: \n\n -> \n -> ". " -> " " -> ""
     |
     +-- [3] Embed ---- text-embedding-004 (768 dims)
     |                  Batched in groups of 20
     |
     +-- [4] Store ---- Qdrant Cloud (new collection per upload)
                        UUID-based collection name
                        Returns: { collectionId, chunkCount }

QUERY PIPELINE
==============
User types question
     |
     v
POST /api/chat { question, collectionId }
     |
     +-- [5] Embed query -- text-embedding-004 (same model)
     |
     +-- [6] Retrieve ----- Qdrant cosine similarity search
     |                      Top k=5 most similar chunks
     |
     +-- [7] Build prompt - Inject chunks as numbered context
     |                      blocks into SYSTEM_PROMPT template
     |
     +-- [8] Generate ----- Gemini 1.5 Flash (streaming)
                            Web Streams ReadableStream -> frontend
```

---

## Chunking Strategy

**Algorithm:** `RecursiveCharacterTextSplitter` from LangChain

**Configuration:**
```
chunkSize:    1000 characters
chunkOverlap: 200 characters
separators:   ["\n\n", "\n", ". ", " ", ""]
```

### Why RecursiveCharacterTextSplitter?

Unlike naive fixed-size splitting (which can cut sentences or words at arbitrary positions), `RecursiveCharacterTextSplitter` tries each separator in priority order:

1. **`\n\n`** — Paragraph boundaries: the cleanest semantic split.
2. **`\n`** — Line breaks: catches list items, headings, structured content.
3. **`". "`** — Sentence endings: fallback for dense prose without paragraphs.
4. **`" "`** — Word boundaries: ensures no word is ever split in half.
5. **`""`** — Character level: last resort, almost never triggered.

This produces chunks that are **semantically coherent units** — the embedding model receives meaningful content rather than mid-sentence fragments.

### Why 1000 characters?

- **Too small** (200-300 chars): Embeddings capture micro-level semantics, producing noisy retrieval.
- **Too large** (4000+ chars): The embedding vector must represent too much information, diluting the signal.
- **1000 chars** (~150-180 words, ~1-2 short paragraphs) is the sweet spot.

### Why 200-character overlap?

Without overlap, content at chunk boundaries can be "orphaned" — the ending of chunk N appears only in chunk N, and the beginning of chunk N+1 may start mid-topic. With 200-character overlap, the last 200 characters of chunk N repeat at the start of chunk N+1. Both chunks contain transitional context, so either can be retrieved for relevant queries. **No meaning is lost at the seam between chunks.**

---

## Why text-embedding-004?

| Model | Dimensions | Free Tier | Quality |
|-------|-----------|-----------|---------|
| `text-embedding-004` (Google) | 768 | Yes | Excellent |
| `text-embedding-3-small` (OpenAI) | 1536 | No | Good |
| `text-embedding-3-large` (OpenAI) | 3072 | No | Better |
| `all-MiniLM-L6-v2` (HuggingFace) | 384 | Yes | Lower |

Key reasons:
- **Free** on Google AI Studio with generous rate limits
- **768 dimensions** — rich semantic representation
- **Same model** for both ingestion and query — vectors must exist in the identical semantic space for cosine similarity to work correctly

---

## How Retrieval Works

1. **Query embedding**: The question is converted to a 768-dimensional vector using `text-embedding-004`.
2. **Vector search**: Qdrant searches using cosine similarity: `similarity(A,B) = (A·B) / (||A|| × ||B||)`
3. **Top k=5 results**: The 5 most similar chunks are returned, ordered by relevance score.

**Why k=5?** 5 chunks × ~1000 chars = ~5000 characters of context. This is well within Gemini's 1M token limit, sufficient to answer most questions, and keeps the prompt concise.

---

## Grounding Enforcement

The system prompt enforces grounding with five explicit rules:

```
You are a precise document assistant. Your ONLY job is to answer 
questions based on the document excerpts provided to you below as context.

Rules:
1. ONLY use information from the provided context.
2. If not found: say "I couldn't find information about that in the uploaded document."
3. Cite which part of the document your answer comes from.
4. Be concise but complete.
5. Never make up facts not present in the context.

--- DOCUMENT CONTEXT ---
[1] Source: report.pdf | ~Page 3
"Retrieved chunk text..."
--- END CONTEXT ---
```

Additionally, `temperature: 0.1` minimizes creative (hallucinated) generation.

---

## Setup Instructions

### Prerequisites

- Node.js 18+, npm 9+
- Google AI Studio account (free)
- Qdrant Cloud account (free, no credit card)

### Step 1: Install

```bash
cd retrievai
npm install --legacy-peer-deps
```

### Step 2: Get Google API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"** → copy the key

### Step 3: Set Up Qdrant Cloud

1. Go to [https://cloud.qdrant.io](https://cloud.qdrant.io) → create a free account
2. Click **"Create Cluster"** → Free tier → any region → **"Create"**
3. Wait ~1 minute → copy the **cluster URL** from the dashboard
4. Go to **"API Keys"** tab → **"Create API key"** → copy the key

### Step 4: Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
GOOGLE_API_KEY=your_actual_google_api_key
QDRANT_URL=https://your-cluster-id.region.gcp.cloud.qdrant.io
QDRANT_API_KEY=your_actual_qdrant_api_key
```

### Step 5: Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment on Vercel

RetrievAI is designed for zero-configuration Vercel deployment:
- No file system writes — all persistence through Qdrant Cloud
- Web Streams API — compatible with Vercel's serverless runtime
- Next.js App Router route handlers — no standalone server needed

### Deploy Steps

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import your repo
3. Add environment variables in **Settings → Environment Variables**:
   - `GOOGLE_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
4. Click **Deploy**

---

## Project Structure

```
retrievai/
├── app/
│   ├── page.tsx              # Root page — Obsidian Intelligence layout
│   ├── layout.tsx            # Fonts (Sora, DM Sans, JetBrains Mono) + SEO
│   ├── globals.css           # Design system — CSS variables, animations
│   └── api/
│       ├── upload/route.ts   # POST: parse -> chunk -> embed -> store
│       └── chat/route.ts     # POST: embed query -> retrieve -> stream
├── components/
│   ├── ThreeBackground.tsx   # Three.js particle constellation
│   ├── UploadPanel.tsx       # File upload with processing stepper
│   ├── ChatPanel.tsx         # Streaming chat interface
│   ├── ChatBubble.tsx        # User/AI message bubbles
│   └── SourcesAccordion.tsx  # Retrieved chunks accordion
├── lib/
│   ├── chunker.ts            # RecursiveCharacterTextSplitter
│   ├── embedder.ts           # GoogleGenerativeAIEmbeddings + batching
│   ├── vectorStore.ts        # Qdrant store/retrieve
│   └── generator.ts          # Grounded generation + Web Streams
├── .env.local.example        # Environment variable template
├── next.config.mjs           # Next.js config
└── package.json
```

---

## License

MIT
