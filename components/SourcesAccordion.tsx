"use client";

import { useState, useLayoutEffect, useRef } from "react";

/** A single retrieved source chunk from the RAG pipeline */
export interface SourceChunk {
  content: string;
  source: string;
  pageApprox: number;
  chunkIndex: number;
}

interface SourcesAccordionProps {
  chunks: SourceChunk[];
}

/**
 * SourcesAccordion displays the retrieved document chunks that grounded the AI answer.
 *
 * Design details:
 * - Height animates via measured max-height (useLayoutEffect measures actual height)
 * - Chevron rotates 180° on open
 * - Each chunk card has a 3px gradient left border (indigo→cyan)
 * - Text is clamped to 4 lines, expandable on click
 * - Footer shows "chunk N · ~page X" in JetBrains Mono
 */
export default function SourcesAccordion({ chunks }: SourcesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure actual content height for smooth max-height animation
  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [chunks, expandedChunks]);

  if (chunks.length === 0) return null;

  const toggleChunk = (index: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyChunk = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard API may be unavailable in some environments
    }
  };

  return (
    <div className="sources-accordion mt-2">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors duration-150 group"
        aria-expanded={isOpen}
        aria-label={`Toggle sources (${chunks.length} chunks)`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-xs font-mono">Sources ({chunks.length})</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Animated Content Container */}
      <div
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : "0px",
          overflow: "hidden",
          transition: "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div ref={contentRef} className="flex flex-col gap-2 pt-2">
          {chunks.map((chunk, index) => (
            <div
              key={index}
              className="source-card relative group rounded-lg overflow-hidden"
              style={{
                background: "rgba(8, 13, 26, 0.6)",
                border: "1px solid rgba(99,102,241,0.12)",
              }}
            >
              {/* Left gradient accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #6366f1 0%, #22d3ee 100%)",
                }}
              />

              <div className="pl-4 pr-3 py-2.5">
                {/* Chunk text */}
                <p
                  className="text-xs text-slate-400 font-dm-sans leading-relaxed"
                  style={
                    expandedChunks.has(index)
                      ? {}
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                  }
                >
                  {chunk.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleChunk(index)}
                      className="text-slate-600 hover:text-indigo-400 transition-colors text-xs font-mono"
                    >
                      {expandedChunks.has(index) ? "collapse" : "expand"}
                    </button>
                    <span className="text-slate-700 font-mono text-xs">·</span>
                    <span className="text-slate-600 font-mono text-xs">
                      chunk {chunk.chunkIndex} · ~page {chunk.pageApprox}
                    </span>
                  </div>

                  {/* Copy button — appears on hover */}
                  <button
                    onClick={() => copyChunk(chunk.content, index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs font-mono text-slate-600 hover:text-cyan-400 flex items-center gap-1"
                    aria-label="Copy chunk text"
                  >
                    {copiedIndex === index ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-cyan-400">copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
