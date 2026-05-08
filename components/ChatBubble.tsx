"use client";

import { SourceChunk } from "./SourcesAccordion";
import SourcesAccordion from "./SourcesAccordion";

/** Discriminated union for message types */
export type MessageRole = "user" | "ai";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** True while the AI is still streaming tokens */
  isStreaming?: boolean;
  sources?: SourceChunk[];
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-in-right">
        <div className="user-bubble max-w-[75%] px-4 py-3 rounded-2xl rounded-br-sm">
          <p className="text-sm text-slate-100 font-dm-sans leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // AI bubble
  return (
    <div className="flex items-start gap-3 animate-slide-in-left">
      {/* AI Avatar */}
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold font-sora mt-0.5"
        style={{
          background: "rgba(8, 13, 26, 0.8)",
          border: "1px solid rgba(99,102,241,0.3)",
        }}
      >
        <span
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AI
        </span>
      </div>

      <div className="flex flex-col gap-1.5 max-w-[80%]">
        {/* Message bubble */}
        <div className="ai-bubble px-4 py-3.5 rounded-2xl rounded-tl-sm">
          {/* Typing indicator — shown when streaming but no content yet */}
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5 py-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-slate-500 typing-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-200 font-dm-sans leading-relaxed whitespace-pre-wrap">
              {message.content}
              {/* Streaming cursor — only rendered while streaming */}
              {message.isStreaming && (
                <span className="streaming-cursor ml-0.5">▋</span>
              )}
            </p>
          )}
        </div>

        {/* Sources Accordion — shown below the bubble after streaming completes */}
        {!message.isStreaming && message.sources && message.sources.length > 0 && (
          <SourcesAccordion chunks={message.sources} />
        )}
      </div>
    </div>
  );
}
