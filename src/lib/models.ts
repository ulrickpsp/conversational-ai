// ── Collaborator Definitions ─────────────────────────────────────────────────
// 16 agents debate sequentially (round-robin). Each responds to the previous.
// Perplexity (direct API with web search) + 15 free OpenRouter models.
// Each agent has a UNIQUE ROLE to avoid repetition.

export type AgentRole = 
  | "researcher"    // Perplexity: datos web, hechos verificables
  | "critic"        // Abogado del diablo, busca fallos
  | "architect"     // Diseño técnico, implementación
  | "risk-manager"  // Análisis de riesgos
  | "economist"     // Viabilidad financiera
  | "visionary"     // Ideas disruptivas, pensar diferente
  | "engineer"      // Detalles técnicos, código
  | "simplifier"    // Resume, sintetiza, aclara
  | "validator"     // Verifica consistencia, detecta contradicciones
  | "strategist"    // Visión macro, largo plazo
  | "historian"     // Precedentes, casos similares
  | "optimizer"     // Eficiencia, mejora continua
  | "skeptic"       // Duda de todo, exige pruebas
  | "pragmatist"    // Qué funciona realmente, sin teorías
  | "integrator"    // Une perspectivas, busca consenso
  | "provocateur";  // Preguntas incómodas, rompe supuestos

export interface Collaborator {
  id: string;
  label: string;
  shortLabel: string;
  provider: string;
  type: "perplexity" | "openrouter";
  color: string;
  icon: string;
  role: AgentRole;
}

export const COLLABORATORS: Collaborator[] = [
  // ── Perplexity (real-time web search) ──
  {
    id: "perplexity",
    label: "Perplexity Sonar Reasoning Pro",
    shortLabel: "Perplexity",
    provider: "Perplexity",
    type: "perplexity",
    color: "#3B82F6",
    icon: "🌐",
    role: "researcher",
  },
  // ── OpenRouter Free Models (verified 2026-02-27) ──
  {
    id: "qwen/qwen3-235b-a22b-thinking-2507",
    label: "Qwen3 235B Thinking",
    shortLabel: "Qwen3 235B",
    provider: "Qwen",
    type: "openrouter",
    color: "#8B5CF6",
    icon: "🧠",
    role: "critic",
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    shortLabel: "GPT-OSS",
    provider: "OpenAI",
    type: "openrouter",
    color: "#10B981",
    icon: "💚",
    role: "architect",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B Instruct",
    shortLabel: "Llama 70B",
    provider: "Meta",
    type: "openrouter",
    color: "#F97316",
    icon: "🦙",
    role: "risk-manager",
  },
  {
    id: "google/gemma-3-27b-it:free",
    label: "Gemma 3 27B",
    shortLabel: "Gemma 27B",
    provider: "Google",
    type: "openrouter",
    color: "#0EA5E9",
    icon: "💠",
    role: "economist",
  },
  {
    id: "qwen/qwen3-vl-235b-a22b-thinking",
    label: "Qwen3 VL 235B Thinking",
    shortLabel: "Qwen3 VL",
    provider: "Qwen",
    type: "openrouter",
    color: "#6366F1",
    icon: "👁️",
    role: "visionary",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "Nemotron 3 Nano 30B",
    shortLabel: "Nemotron 30B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#84CC16",
    icon: "🟢",
    role: "engineer",
  },
  {
    id: "arcee-ai/trinity-mini:free",
    label: "Trinity Mini 26B",
    shortLabel: "Trinity Mini",
    provider: "Arcee",
    type: "openrouter",
    color: "#EF4444",
    icon: "🔸",
    role: "simplifier",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano 12B VL",
    shortLabel: "Nemotron 12B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#14B8A6",
    icon: "🖼️",
    role: "validator",
  },
  {
    id: "stepfun/step-3.5-flash:free",
    label: "Step 3.5 Flash",
    shortLabel: "Step 3.5",
    provider: "StepFun",
    type: "openrouter",
    color: "#D946EF",
    icon: "🚀",
    role: "strategist",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    shortLabel: "GLM 4.5",
    provider: "Z.ai",
    type: "openrouter",
    color: "#F472B6",
    icon: "🏮",
    role: "historian",
  },
  {
    id: "upstage/solar-pro-3:free",
    label: "Solar Pro 3",
    shortLabel: "Solar Pro 3",
    provider: "Upstage",
    type: "openrouter",
    color: "#FB923C",
    icon: "☀️",
    role: "optimizer",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    label: "Nemotron Nano 9B V2",
    shortLabel: "Nemotron 9B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#A855F7",
    icon: "⚡",
    role: "skeptic",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    shortLabel: "GPT-OSS 20B",
    provider: "OpenAI",
    type: "openrouter",
    color: "#22D3EE",
    icon: "💙",
    role: "pragmatist",
  },
  {
    id: "arcee-ai/trinity-large-preview:free",
    label: "Trinity Large Preview",
    shortLabel: "Trinity",
    provider: "Arcee",
    type: "openrouter",
    color: "#EC4899",
    icon: "🔺",
    role: "integrator",
  },
  {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    label: "LFM 2.5 1.2B Thinking",
    shortLabel: "Liquid 1.2B",
    provider: "Liquid",
    type: "openrouter",
    color: "#F59E0B",
    icon: "💧",
    role: "provocateur",
  },
];

// Model used for generating final conclusions
export const CONCLUSION_MODEL = "openai/gpt-oss-120b:free";

// ── Helpers ──────────────────────────────────────────────────────────────────

const _collabMap = new Map(COLLABORATORS.map((c) => [c.id, c]));

export function getCollaborator(agentId: string): Collaborator | undefined {
  return _collabMap.get(agentId);
}

export function getCollaboratorLabel(agentId: string): string {
  return _collabMap.get(agentId)?.shortLabel ?? agentId.split("/").pop() ?? agentId;
}

export function getCollaboratorColor(agentId: string): string {
  return _collabMap.get(agentId)?.color ?? "#94A3B8";
}

export function getCollaboratorRole(agentId: string): AgentRole {
  return _collabMap.get(agentId)?.role ?? "critic";
}
