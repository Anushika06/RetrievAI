import type { Metadata } from "next";
import { Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "RetrievAI — RAG-Powered Document Intelligence",
  description:
    "Upload any PDF or text document and chat with it instantly. RetrievAI uses Google Gemini and Qdrant vector search to deliver precise, grounded answers from your document content.",
  keywords: [
    "RAG",
    "document Q&A",
    "AI",
    "Gemini",
    "Qdrant",
    "vector search",
    "NotebookLM",
    "document assistant",
  ],
  openGraph: {
    title: "RetrievAI — RAG-Powered Document Intelligence",
    description: "Chat with your documents using AI. Grounded answers, zero hallucination.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
