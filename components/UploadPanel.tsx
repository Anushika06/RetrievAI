"use client";

import { useState, useRef, useCallback } from "react";

/** Upload processing stages shown in the stepper UI */
export type ProcessingStage =
  | "idle"
  | "uploading"
  | "parsing"
  | "chunking"
  | "embedding"
  | "ready"
  | "error";

/** Data returned from the upload API on success */
export interface UploadResult {
  collectionId: string;
  chunkCount: number;
  fileName: string;
}

interface UploadPanelProps {
  /** Called when the full pipeline succeeds with the collection info */
  onUploadComplete: (result: UploadResult) => void;
}

/** Human-readable labels and descriptions for each pipeline stage */
const STAGES: {
  key: ProcessingStage;
  label: string;
  description: string;
}[] = [
  { key: "uploading", label: "Uploading", description: "Sending file to server" },
  { key: "parsing", label: "Parsing", description: "Extracting text content" },
  { key: "chunking", label: "Chunking", description: "Splitting into semantic segments" },
  { key: "embedding", label: "Embedding", description: "Generating vector embeddings" },
  { key: "ready", label: "Ready", description: "Document indexed successfully" },
];

const STAGE_ORDER: ProcessingStage[] = [
  "uploading",
  "parsing",
  "chunking",
  "embedding",
  "ready",
];

export default function UploadPanel({ onUploadComplete }: UploadPanelProps) {
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  /**
   * Advances through the UI stepper stages while the actual upload is running.
   */
  const simulateStageProgress = useCallback(() => {
    const delays = [800, 1200, 1500, 2000];
    let elapsed = 0;

    STAGE_ORDER.slice(0, 4).forEach((stageKey, index) => {
      elapsed += delays[index];
      const progressPercent = ((index + 1) / 4) * 85;

      const id = setTimeout(() => {
        setStage(stageKey);
        setProgress(progressPercent);
      }, elapsed);

      stageTimerRefs.current.push(id);
    });
  }, []);

  const clearAllTimers = useCallback(() => {
    stageTimerRefs.current.forEach(clearTimeout);
    stageTimerRefs.current = [];
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pdf|txt|csv)$/i)) {
        setErrorMessage("Only PDF, TXT, and CSV files are supported.");
        setStage("error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(
          `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 10MB.`
        );
        setStage("error");
        return;
      }

      setStage("uploading");
      setProgress(5);
      setErrorMessage("");
      setUploadResult(null);
      stageTimerRefs.current = []; // reset leftover IDs from a previous run

      simulateStageProgress();

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed. Please try again.");
        }

        clearAllTimers();

        setStage("ready");
        setProgress(100);
        setUploadResult(data as UploadResult);
        onUploadComplete(data as UploadResult);

        window.dispatchEvent(new CustomEvent("upload-success"));
      } catch (err) {
        clearAllTimers();
        setStage("error");
        setProgress(0);
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    },
    [onUploadComplete, simulateStageProgress, clearAllTimers]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const getStageStatus = (stageKey: ProcessingStage) => {
    const currentIndex = STAGE_ORDER.indexOf(stage);
    const stageIndex = STAGE_ORDER.indexOf(stageKey);

    if (stage === "error") return "error";
    if (stageIndex < currentIndex) return "done";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  const isProcessing =
    stage !== "idle" && stage !== "ready" && stage !== "error";

  return (
    <div className="upload-panel-inner h-full flex flex-col p-5 gap-4">
      {/* Panel Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-200 font-sora">Source Document</h2>
          <p className="text-xs text-slate-500 font-dm-sans">PDF, TXT, or CSV — up to 10MB</p>
        </div>
      </div>

      {/* Main Upload Area */}
      {stage === "idle" && (
        <div
          className={`upload-drop-zone flex-1 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden ${
            isDragOver ? "drag-over" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload document"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          {/* Animated document icon */}
          <div className="doc-icon-float mb-4">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect width="52" height="52" rx="14" fill="rgba(99,102,241,0.08)" />
              <path
                d="M15 12h14l9 9v20a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2z"
                stroke="rgba(99,102,241,0.5)"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
              <path
                d="M29 12v9h9"
                stroke="rgba(99,102,241,0.5)"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
              {/* Spark lines */}
              <line x1="20" y1="28" x2="32" y2="28" stroke="rgba(34,211,238,0.6)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="20" y1="33" x2="28" y2="33" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="36" cy="20" r="6" fill="rgba(34,211,238,0.15)" />
              <path d="M36 17v3M34.5 18.5l1.5 1.5 1.5-1.5" stroke="rgba(34,211,238,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="text-sm font-medium text-slate-400 font-sora mb-1">
            {isDragOver ? "Release to upload" : "Drop PDF, TXT, or CSV"}
          </p>
          <p className="text-xs text-slate-600 font-dm-sans">or click to browse</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* Processing Stepper */}
      {isProcessing && (
        <div className="flex-1 flex flex-col justify-center gap-3 px-1">
          {/* Progress bar */}
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #6366f1, #22d3ee)",
              }}
            />
          </div>

          {STAGES.filter((s) => s.key !== "ready").map((s) => {
            const status = getStageStatus(s.key);
            return (
              <div key={s.key} className="flex items-center gap-3">
                {/* Stage indicator */}
                <div className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {status === "done" && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  {status === "active" && (
                    <div className="relative">
                      <div className="w-5 h-5 rounded-full border-2 border-cyan-400 bg-transparent pulse-ring-active" />
                      <div className="absolute inset-1.5 rounded-full bg-cyan-400" />
                    </div>
                  )}
                  {(status === "pending" || status === "error") && (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-transparent" />
                  )}
                </div>

                {/* Stage label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium font-dm-sans ${
                      status === "active"
                        ? "shimmer-text"
                        : status === "done"
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {s.label}
                  </p>
                  {status === "active" && (
                    <p className="text-xs text-slate-600 font-dm-sans truncate">
                      {s.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ready State — Document Card */}
      {stage === "ready" && uploadResult && (
        <div className="flex-1 flex flex-col gap-3">
          <div className="document-card rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate font-mono">
                {uploadResult.fileName}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="chunk-badge text-xs font-mono px-2 py-0.5 rounded-full">
                  {uploadResult.chunkCount} chunks
                </span>
                <span className="text-xs text-slate-600 font-mono">indexed</span>
              </div>
            </div>
          </div>

          {/* Success message */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-slate-400 font-dm-sans">
              Document ready — start asking questions
            </p>
          </div>

          {/* Upload new button */}
          <button
            onClick={() => {
              setStage("idle");
              setUploadResult(null);
              setProgress(0);
            }}
            className="mt-auto flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 font-dm-sans group"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-indigo-400 transition-colors">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.06" />
            </svg>
            Upload new document
          </button>
        </div>
      )}

      {/* Error State */}
      {stage === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-2">
          <div className="w-12 h-12 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-red-400 font-dm-sans mb-1">Upload failed</p>
            <p className="text-xs text-slate-500 font-dm-sans leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => {
              setStage("idle");
              setErrorMessage("");
              setProgress(0);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-dm-sans transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
