"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/hooks/useDebateStream";
import { getCollaborator, getCollaboratorLabel, getCollaboratorColor } from "@/lib/models";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatViewProps {
  messages: ChatMessage[];
  activeAgent: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatView({ messages, activeAgent }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userScrolledRef = useRef(false);
  const lastScrollHeightRef = useRef(0);

  // Auto-scroll only if user hasn't manually scrolled up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If user manually scrolled, don't auto-scroll
    if (userScrolledRef.current) {
      // Check if user is back near bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (isAtBottom) {
        userScrolledRef.current = false;
        setAutoScroll(true);
      }
      return;
    }

    // Auto-scroll to bottom
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll UP by user
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    // If user scrolled up (not at bottom), disable auto-scroll
    if (scrollBottom > 100) {
      if (!userScrolledRef.current) {
        userScrolledRef.current = true;
        setAutoScroll(false);
      }
    } else {
      // User is back at bottom
      if (userScrolledRef.current) {
        userScrolledRef.current = false;
        setAutoScroll(true);
      }
    }

    lastScrollHeightRef.current = scrollHeight;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        16 agentes comenzarán a debatir cuando envíes tu propuesta.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5"
    >
      {messages.map((msg, idx) => (
        <AgentBubble
          key={msg.id}
          message={msg}
          isActive={activeAgent === msg.agent && msg.isStreaming}
          showLabel={idx === 0 || messages[idx - 1].agent !== msg.agent}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Agent Message Bubble ──────────────────────────────────────────────────────

function AgentBubble({
  message,
  isActive,
  showLabel,
}: {
  message: ChatMessage;
  isActive: boolean;
  showLabel: boolean;
}) {
  // Handle user comments specially
  if (message.agent === "user") {
    return (
      <div className="my-3">
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
          <span className="text-[11px] font-medium text-amber-400">
            📝 Tu comentario
          </span>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-sm text-zinc-200 leading-relaxed border-l-2 ml-1 bg-amber-400/5"
          style={{ borderColor: "#fbbf24" }}
        >
          <div className="whitespace-pre-wrap break-words italic">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Regular agent message
  const collab = getCollaborator(message.agent);
  const label = getCollaboratorLabel(message.agent);
  const color = getCollaboratorColor(message.agent);
  const icon = collab?.icon ?? "🤖";

  return (
    <div className="group">
      {/* Agent label — only show when agent changes */}
      {showLabel && (
        <div className="flex items-center gap-1.5 mb-0.5 ml-1 mt-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-medium" style={{ color }}>
            {icon} {label}
          </span>
          {message.isStreaming && (
            <span className="text-[10px] text-zinc-600 animate-pulse ml-1">
              escribiendo…
            </span>
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className="rounded-lg px-3 py-2 text-sm text-zinc-300 leading-relaxed border-l-2 ml-1"
        style={{ borderColor: color, backgroundColor: `${color}08` }}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        ) : isActive ? (
          <span className="text-zinc-600 text-xs animate-pulse">
            Pensando…
          </span>
        ) : null}
      </div>
    </div>
  );
}
