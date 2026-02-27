"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DebateMode, DebateConclusion, SSEEvent } from "@/lib/types";

// ── Chat Message (client-side representation) ─────────────────────────────────

export interface ChatMessage {
  id: string;
  agent: string;
  round: number;
  content: string;
  isStreaming: boolean;
}

// ── Hook Return Type ──────────────────────────────────────────────────────────

interface UseDebateStreamReturn {
  messages: ChatMessage[];
  activeAgent: string | null;
  currentRound: number;
  turnCount: number;
  isRunning: boolean;
  isPaused: boolean;
  isConcluding: boolean;
  conclusion: DebateConclusion | null;
  iteration: number;
  error: string | null;
  startDebate: (proposal: string, mode: DebateMode) => void;
  pauseDebate: () => void;
  continueWithComment: (comment: string) => void;
  stop: () => void;
  refine: () => void;
  reset: () => void;
}

// ── LocalStorage Key ─────────────────────────────────────────────────────────

const STORAGE_KEY = "debate-state";

// ── Hook Implementation ───────────────────────────────────────────────────────

export function useDebateStream(): UseDebateStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);
  const [conclusion, setConclusion] = useState<DebateConclusion | null>(null);
  const [iteration, setIteration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const proposalRef = useRef<string>("");
  const modeRef = useRef<DebateMode>("balanced");
  const isInitializedRef = useRef(false);

  // ── Restore State from LocalStorage on Mount ─────────────────────────────

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        if (state.messages?.length > 0) {
          setMessages(state.messages.map((msg: ChatMessage) => ({ ...msg, isStreaming: false })));
          setCurrentRound(state.currentRound ?? 0);
          setTurnCount(state.turnCount ?? 0);
          setConclusion(state.conclusion ?? null);
          setIteration(state.iteration ?? 0);
          proposalRef.current = state.proposal ?? "";
          modeRef.current = state.mode ?? "balanced";
        }
      }
    } catch (err) {
      console.error("Failed to restore debate state:", err);
    }
  }, []);

  // ── Save State to LocalStorage on Change ─────────────────────────────────

  useEffect(() => {
    if (!isInitializedRef.current) return;

    try {
      const state = {
        messages: messages.map((msg) => ({ ...msg, isStreaming: false })),
        currentRound,
        turnCount,
        conclusion,
        proposal: proposalRef.current,
        mode: modeRef.current,
        iteration,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save debate state:", err);
    }
  }, [messages, currentRound, turnCount, conclusion, iteration]);

  // ── Process SSE Events ──────────────────────────────────────────────────

  const processEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "round_start": {
        setCurrentRound(event.round ?? 0);
        break;
      }

      case "message_start": {
        const agent = event.agent;
        if (agent) {
          setActiveAgent(agent);
          setTurnCount((prev) => prev + 1);
          setMessages((prev) => [
            ...prev,
            {
              id: `${agent}-r${event.round}-${Date.now()}`,
              agent,
              round: event.round ?? 0,
              content: "",
              isStreaming: true,
            },
          ]);
        }
        break;
      }

      case "token": {
        const agent = event.agent;
        if (agent) {
          setMessages((prev) => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].agent === agent && updated[i].isStreaming) {
                updated[i] = {
                  ...updated[i],
                  content: updated[i].content + (event.data ?? ""),
                };
                break;
              }
            }
            return updated;
          });
        }
        break;
      }

      case "message_end": {
        const agent = event.agent;
        if (agent) {
          setActiveAgent(null);
          setMessages((prev) => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].agent === agent && updated[i].isStreaming) {
                updated[i] = { ...updated[i], isStreaming: false };
                break;
              }
            }
            return updated;
          });
        }
        break;
      }

      case "agent_error": {
        const agent = event.agent;
        if (agent) {
          setActiveAgent(null);
          // Remove failed messages instead of showing error
          setMessages((prev) => {
            return prev.filter(
              (msg) => !(msg.agent === agent && msg.isStreaming)
            );
          });
        }
        break;
      }

      case "error": {
        setError(event.data ?? "Error desconocido");
        break;
      }

      case "done": {
        setIsRunning(false);
        setActiveAgent(null);
        break;
      }
    }
  }, []);

  // ── Start Debate ────────────────────────────────────────────────────────

  const startDebate = useCallback(
    (proposal: string, mode: DebateMode) => {
      if (isRunning) return;

      setMessages([]);
      setActiveAgent(null);
      setCurrentRound(0);
      setTurnCount(0);
      setIsRunning(true);
      setIsPaused(false);
      setIsConcluding(false);
      setConclusion(null);
      setIteration((prev) => prev + 1);
      setError(null);

      proposalRef.current = proposal;
      modeRef.current = mode;

      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        try {
          const res = await fetch("/api/debate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposal, mode }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const event: SSEEvent = JSON.parse(line.slice(6));
                  processEvent(event);
                } catch {
                  // Skip malformed events
                }
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // Normal abort
          } else {
            const msg =
              err instanceof Error ? err.message : "Error de conexión";
            setError(msg);
          }
        } finally {
          setIsRunning(false);
          setActiveAgent(null);
        }
      })();
    },
    [isRunning, processEvent]
  );

  // ── Pause Debate ────────────────────────────────────────────────────────

  const pauseDebate = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    setIsPaused(true);
    setActiveAgent(null);
  }, []);

  // ── Continue with User Comment ──────────────────────────────────────────

  const continueWithComment = useCallback(
    (comment: string) => {
      if (!isPaused || !proposalRef.current) return;

      // Add user's comment to messages
      const userComment: ChatMessage = {
        id: `user-comment-${Date.now()}`,
        agent: "user",
        round: currentRound,
        content: comment,
        isStreaming: false,
      };
      setMessages((prev) => [...prev, userComment]);

      // Resume debate with updated history
      setIsRunning(true);
      setIsPaused(false);

      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        try {
          // Copy current messages plus the new comment
          const previousMessages = [
            ...messages,
            { agent: "user", content: comment, round: currentRound },
          ].map((m) => ({
            agent: m.agent,
            content: m.content,
            round: m.round,
          }));

          const res = await fetch("/api/debate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proposal: proposalRef.current,
              mode: modeRef.current,
              previousMessages,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const event: SSEEvent = JSON.parse(line.slice(6));
                  processEvent(event);
                } catch {
                  // Skip malformed events
                }
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // Normal abort
          } else {
            const msg =
              err instanceof Error ? err.message : "Error de conexión";
            setError(msg);
          }
        } finally {
          setIsRunning(false);
          setActiveAgent(null);
        }
      })();
    },
    [isPaused, messages, currentRound, processEvent]
  );

  // ── Stop & Conclude ─────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setActiveAgent(null);
    setIsConcluding(true);

    const agentMessages = messages.filter(
      (m) => m.content.trim().length > 0
    );

    if (agentMessages.length === 0) {
      setIsConcluding(false);
      return;
    }

    try {
      const res = await fetch("/api/debate/conclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: agentMessages.map((m) => ({
            agent: m.agent,
            content: m.content,
            round: m.round,
          })),
          mode: modeRef.current,
          proposal: proposalRef.current,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const conclusionData: DebateConclusion = await res.json();
      setConclusion(conclusionData);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al generar conclusión";
      setError(msg);
    } finally {
      setIsConcluding(false);
    }
  }, [messages]);

  // ── Refine ──────────────────────────────────────────────────────────────

  const refine = useCallback(() => {
    if (proposalRef.current) {
      setConclusion(null);
      startDebate(proposalRef.current, modeRef.current);
    }
  }, [startDebate]);

  // ── Reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveAgent(null);
    setCurrentRound(0);
    setTurnCount(0);
    setIsRunning(false);
    setIsPaused(false);
    setIsConcluding(false);
    setConclusion(null);
    setIteration(0);
    setError(null);
    proposalRef.current = "";
    modeRef.current = "balanced";
    
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear debate state:", err);
    }
  }, []);

  return {
    messages,
    activeAgent,
    currentRound,
    turnCount,
    isRunning,
    isPaused,
    isConcluding,
    conclusion,
    iteration,
    error,
    startDebate,
    pauseDebate,
    continueWithComment,
    stop,
    refine,
    reset,
  };
}
