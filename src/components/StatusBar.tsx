"use client";

import { useState } from "react";
import { 
  ROLES,
  getModelLabel, 
  getModelColor, 
  getRoleIcon, 
  getRoleName,
  type AgentRole 
} from "@/lib/models";

// ── Helper: Parse agent ID ────────────────────────────────────────────────────

function parseAgentId(agentId: string): { 
  role: AgentRole; 
  modelId: string;
  icon: string;
  label: string;
  color: string;
} | null {
  const parts = agentId.split(":");
  if (parts.length === 2) {
    const role = parts[0] as AgentRole;
    const modelId = parts[1];
    return {
      role,
      modelId,
      icon: getRoleIcon(role),
      label: `${getRoleName(role)} (${getModelLabel(modelId)})`,
      color: getModelColor(modelId),
    };
  }
  return null;
}

interface StatusBarProps {
  activeAgent: string | null;
  currentRound: number;
  turnCount: number;
  isRunning: boolean;
  isPaused: boolean;
  isConcluding: boolean;
  onPause: () => void;
  onContinue: (comment: string) => void;
  onStop: () => void;
}

export function StatusBar({
  activeAgent,
  currentRound,
  turnCount,
  isRunning,
  isPaused,
  isConcluding,
  onPause,
  onContinue,
  onStop,
}: StatusBarProps) {
  const [userComment, setUserComment] = useState("");

  if (isConcluding) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border-t border-zinc-800">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs text-amber-400">
          Generating final conclusion…
        </span>
      </div>
    );
  }

  // Paused state — show comment input
  if (isPaused) {
    return (
      <div className="border-t border-zinc-800 bg-zinc-900/80 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs text-zinc-400">
            Debate paused — Add your comment:
          </span>
        </div>
        <div className="flex gap-2">
          <textarea
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            placeholder="Write your comment, question or correction for the agents…"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                if (userComment.trim()) {
                  onContinue(userComment.trim());
                  setUserComment("");
                }
              }}
              disabled={!userComment.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              ▶️ Continue
            </button>
            <button
              onClick={onStop}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium whitespace-nowrap"
            >
              ⏹ Conclude
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Running state
  if (isRunning) {
    const agentInfo = activeAgent ? parseAgentId(activeAgent) : null;

    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border-t border-zinc-800">
        {/* Round */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-mono">R{currentRound}</span>
        </div>

        <div className="w-px h-4 bg-zinc-800" />

        {/* Active agent */}
        {agentInfo ? (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: agentInfo.color }}
            />
            <span className="text-[11px] text-zinc-400">
              {agentInfo.icon} {agentInfo.label} writing…
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-[11px] text-zinc-500">Next turn…</span>
          </div>
        )}

        {/* Turn count */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">
            Turn {turnCount}/{ROLES.length}×∞
          </span>
        </div>

        {/* Pause and Stop buttons */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={onPause}
            className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors text-xs font-medium"
          >
            ⏸ Pause
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
          >
            ⏹ Stop & Conclude
          </button>
        </div>
      </div>
    );
  }

  return null;
}
