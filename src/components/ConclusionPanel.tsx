"use client";

import { DebateConclusion, RiskItem } from "@/lib/types";

interface ConclusionPanelProps {
  conclusion: DebateConclusion;
  onRefine?: () => void;
  iteration?: number;
}

const severityColors: Record<RiskItem["severity"], string> = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const severityLabels: Record<RiskItem["severity"], string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

export function ConclusionPanel({ conclusion, onRefine, iteration }: ConclusionPanelProps) {
  return (
    <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <h2 className="text-xl font-bold text-emerald-400">
          Conclusión Final
          {iteration && iteration > 1 && (
            <span className="text-sm font-normal text-zinc-500 ml-2">
              (Iteración {iteration})
            </span>
          )}
        </h2>
        {onRefine && (
          <button
            onClick={onRefine}
            className="ml-auto px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:text-blue-300 transition-all text-sm font-medium"
          >
            🔄 Refinar documento
          </button>
        )}
      </div>

      {/* Strategy Summary */}
      <Section title="Estrategia" icon="🎯">
        <p className="text-zinc-300 text-sm leading-relaxed">
          {conclusion.strategySummary}
        </p>
      </Section>

      {/* Profitability Model */}
      <Section title="Modelo de Rentabilidad" icon="💰">
        <p className="text-zinc-300 text-sm leading-relaxed">
          {conclusion.profitabilityModel}
        </p>
      </Section>

      {/* Risk Assessment */}
      {conclusion.riskAssessment.length > 0 && (
        <Section title="Evaluación de Riesgos" icon="⚠️">
          <div className="space-y-2">
            {conclusion.riskAssessment.map((risk, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-3 ${severityColors[risk.severity] ?? severityColors.medium}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full border border-current">
                    {severityLabels[risk.severity] ?? risk.severity}
                  </span>
                  <span className="text-sm font-medium">{risk.risk}</span>
                </div>
                <p className="text-xs opacity-80 ml-1">
                  Mitigación: {risk.mitigation}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Constraints */}
      {conclusion.constraints.length > 0 && (
        <Section title="Restricciones y Supuestos" icon="📐">
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
            {conclusion.constraints.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Implementation Steps */}
      {conclusion.implementationSteps.length > 0 && (
        <Section title="Pasos de Implementación" icon="🚀">
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-300">
            {conclusion.implementationSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </Section>
      )}

      {/* Open Questions */}
      {conclusion.openQuestions.length > 0 && (
        <Section title="Preguntas Abiertas" icon="❓">
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
            {conclusion.openQuestions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}
