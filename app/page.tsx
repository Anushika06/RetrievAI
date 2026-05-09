"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import UploadPanel, { UploadResult } from "@/components/UploadPanel";
import ChatPanel from "@/components/ChatPanel";

const ThreeBackground = dynamic(
  () => import("@/components/ThreeBackground"),
  { ssr: false }
);

export default function HomePage() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
  };

  const truncatedId = uploadResult?.collectionId
    ? `${uploadResult.collectionId.slice(0, 8)}...${uploadResult.collectionId.slice(-4)}`
    : null;

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: "var(--bg-void)" }}>
      <ThreeBackground />

      {/* Ambient radial gradient overlays */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle at center, rgba(34,211,238,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div className="relative flex flex-col" style={{ zIndex: 10, height: "100vh" }}>
        <header
          className="flex items-center justify-between px-4 md:px-6 flex-shrink-0"
          style={{
            height: "64px",
            background: "var(--bg-glass)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <polygon
                points="16,2 27,8.5 27,21.5 16,28 5,21.5 5,8.5"
                stroke="url(#logo-grad)"
                strokeWidth="1.5"
                fill="url(#logo-bg)"
              />
              <polygon
                points="16,7 22,10.5 22,17.5 16,21 10,17.5 10,10.5"
                stroke="url(#logo-grad)"
                strokeWidth="1"
                fill="rgba(99,102,241,0.15)"
              />
              <circle cx="16" cy="14" r="2.5" fill="url(#logo-grad)" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="rgba(99,102,241,0.08)" />
                  <stop offset="1" stopColor="rgba(34,211,238,0.04)" />
                </linearGradient>
              </defs>
            </svg>
            <span
              className="text-lg font-bold font-sora gradient-text"
              style={{ letterSpacing: "-0.01em" }}
            >
              RetrievAI
            </span>
          </div>

          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(8, 13, 26, 0.6)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            {uploadResult ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">
                  Session Active · {truncatedId}
                </span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="text-xs font-mono text-slate-600">
                  No session — upload a document
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(8,13,26,0.5)",
                border: "1px solid rgba(99,102,241,0.1)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                <path
                  d="M14 2C14 2 7 10 7 14C7 18 14 26 14 26C14 26 21 18 21 14C21 10 14 2 14 2Z"
                  fill="url(#gemini-grad)"
                  opacity="0.9"
                />
                <path
                  d="M2 14C2 14 10 7 14 7C18 7 26 14 26 14C26 14 18 21 14 21C10 21 2 14 2 14Z"
                  fill="url(#gemini-grad2)"
                  opacity="0.7"
                />
                <defs>
                  <linearGradient id="gemini-grad" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                  <linearGradient id="gemini-grad2" x1="2" y1="14" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="hidden sm:inline text-xs font-dm-sans text-slate-500">Powered by Gemini</span>
              <span className="sm:hidden text-xs font-dm-sans text-slate-500">Gemini</span>
            </div>
          </div>
        </header>

        <main
          className="flex-1 flex flex-col lg:grid gap-4 p-4 overflow-y-auto lg:overflow-hidden min-h-0 lg:grid-cols-[380px_1fr]"
          style={{
            height: "calc(100vh - 64px)",
          }}
        >
          <div className="panel-gradient-border min-h-0 shrink-0 min-h-[360px] lg:min-h-0">
            <div className="glass-panel h-full">
              <UploadPanel onUploadComplete={handleUploadComplete} />
            </div>
          </div>

          <div className="panel-gradient-border min-h-0 flex-1 min-h-[500px] lg:min-h-0">
            <div className="glass-panel h-full overflow-hidden flex flex-col">
              <ChatPanel
                collectionId={uploadResult?.collectionId ?? null}
                fileName={uploadResult?.fileName}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
