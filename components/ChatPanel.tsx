"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatBubble, { ChatMessage } from "./ChatBubble";
import { SourceChunk } from "./SourcesAccordion";
import { v4 as uuidv4 } from "uuid";

interface ChatPanelProps {
  /** The Qdrant collection ID from the upload response — null if no doc uploaded yet */
  collectionId: string | null;
  /** The uploaded document's filename for display */
  fileName?: string;
}

export default function ChatPanel({ collectionId, fileName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  /**
   * Parses source metadata from the stream response headers.
   */
  const parseSourcesFromResponse = (response: Response): SourceChunk[] => {
    const sourcesHeader = response.headers.get("X-Sources");
    if (!sourcesHeader) return [];
    try {
      return JSON.parse(decodeURIComponent(sourcesHeader)) as SourceChunk[];
    } catch {
      return [];
    }
  };

  const sendMessage = useCallback(async () => {
    const question = inputValue.trim();
    if (!question || !collectionId || isLoading) return;

    setError(null);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: question,
    };

    const aiMessageId = uuidv4();
    const aiPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "ai",
      content: "",
      isStreaming: true,
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage, aiPlaceholder]);
    setIsLoading(true);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, collectionId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Chat request failed.");
      }

      const sources = parseSourcesFromResponse(response);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable.");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: accumulated, isStreaming: false, sources }
            : m
        )
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      const errorText =
        err instanceof Error ? err.message : "An unexpected error occurred.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: `⚠ ${errorText}`,
                isStreaming: false,
                sources: [],
              }
            : m
        )
      );
      setError(errorText);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, collectionId, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isDisabled = !collectionId;

  return (
    <div className="chat-panel-inner h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto chat-scroll px-5 py-5 flex flex-col gap-4">
        {/* Empty state — shown before any document is uploaded */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[300px]">
            {/* Abstract document nodes SVG illustration */}
            <div className="relative">
              <div className="empty-ripple-1" />
              <div className="empty-ripple-2" />
              <div className="empty-ripple-3" />
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="relative z-10">
                <circle cx="40" cy="40" r="28" fill="rgba(99,102,241,0.06)" />
                <circle cx="40" cy="40" r="18" fill="rgba(99,102,241,0.08)" />
                {/* Document nodes */}
                <circle cx="40" cy="24" r="5" fill="rgba(99,102,241,0.4)" />
                <circle cx="56" cy="48" r="4" fill="rgba(34,211,238,0.3)" />
                <circle cx="24" cy="48" r="4" fill="rgba(99,102,241,0.3)" />
                <circle cx="40" cy="54" r="3" fill="rgba(34,211,238,0.25)" />
                {/* Connection lines */}
                <line x1="40" y1="29" x2="54" y2="45" stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="29" x2="26" y2="45" stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="29" x2="40" y2="51" stroke="rgba(34,211,238,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-400 font-sora mb-1.5">
                {isDisabled
                  ? "Upload a document to begin"
                  : `Chatting with ${fileName ?? "your document"}`}
              </p>
              <p className="text-xs text-slate-600 font-dm-sans max-w-[260px] mx-auto leading-relaxed">
                {isDisabled
                  ? "Drop a PDF or TXT file in the panel to the left, then ask any question about its content."
                  : "Ask anything — every answer is grounded in your document's content."}
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-5 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-500/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-red-400 font-dm-sans flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-400 transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div
        className="px-5 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(99,102,241,0.1)" }}
      >
        <div
          className="relative flex items-end gap-2 rounded-xl p-1 transition-all duration-200"
          style={{
            background: "rgba(8, 13, 26, 0.6)",
            border: isDisabled
              ? "1px solid rgba(99,102,241,0.06)"
              : "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={handleKeyDown}
            disabled={isDisabled || isLoading}
            placeholder={
              isDisabled
                ? "Upload a document first..."
                : "Ask anything about your document..."
            }
            rows={1}
            className="chat-textarea flex-1 resize-none text-sm text-slate-200 bg-transparent outline-none px-3 py-2.5 font-dm-sans placeholder:text-slate-600 placeholder:italic disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
            aria-label="Ask a question about your document"
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={isDisabled || isLoading || !inputValue.trim()}
            className="send-button flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mb-0.5 mr-0.5 transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            aria-label="Send message"
          >
            {isLoading ? (
              /* Spinner while waiting */
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-9-9" />
              </svg>
            ) : (
              /* Arrow icon */
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-700 font-dm-sans mt-2 text-center">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
