"use client";

import { useState } from "react";
import { DebateMode } from "@/lib/types";
import { COLLABORATORS } from "@/lib/models";

interface ProposalFormProps {
  onSubmit: (proposal: string, mode: DebateMode) => void;
  disabled: boolean;
}

const modeOptions: { value: DebateMode; label: string; description: string }[] = [
  {
    value: "conservative",
    label: "🛡️ Conservador",
    description: "Prioriza seguridad y enfoques probados",
  },
  {
    value: "balanced",
    label: "⚖️ Equilibrado",
    description: "Balance entre riesgo y recompensa",
  },
  {
    value: "aggressive",
    label: "🔥 Agresivo",
    description: "Maximiza retornos, acepta más riesgo",
  },
];

export function ProposalForm({ onSubmit, disabled }: ProposalFormProps) {
  const [proposal, setProposal] = useState("");
  const [mode, setMode] = useState<DebateMode>("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAgents, setShowAgents] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (proposal.trim() && !disabled) {
      onSubmit(proposal.trim(), mode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Proposal Input */}
      <div>
        <label htmlFor="proposal" className="block text-sm font-medium text-zinc-400 mb-1.5">
          Tu propuesta
        </label>
        <textarea
          id="proposal"
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={4000}
          placeholder="Ej: Quiero una estrategia de arbitraje triangular entre DEX y CEX, maximizando profit con riesgo controlado…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="text-xs text-zinc-600 mt-1 text-right">
          {proposal.length} / 4000
        </div>
      </div>

      {/* Agent count indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <span className="text-sm">🗣️</span>
        <span className="text-xs text-zinc-400">
          <strong className="text-zinc-300">{COLLABORATORS.length} agentes</strong>{" "}
          debatirán secuencialmente — críticas y rebates
        </span>
        <button
          type="button"
          onClick={() => setShowAgents(!showAgents)}
          className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {showAgents ? "ocultar" : "ver agentes"}
        </button>
      </div>

      {showAgents && (
        <div className="grid grid-cols-2 gap-1.5 p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
          {COLLABORATORS.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-[11px] text-zinc-400 truncate">
                {c.icon} {c.shortLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showAdvanced ? "▾ Ocultar opciones" : "▸ Opciones avanzadas"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Enfoque de la colaboración
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  disabled={disabled}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mode === opt.value
                      ? "border-blue-500/50 bg-blue-500/10 text-zinc-200"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
                  } disabled:opacity-50`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs mt-1 opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || !proposal.trim()}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600"
      >
        {disabled ? "Debate en curso…" : "🗣️ Iniciar Debate Multi-Agente"}
      </button>
    </form>
  );
}
