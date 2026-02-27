// ── Role & Model Definitions ─────────────────────────────────────────────────
// 16 ROLES iterate sequentially. Each role tries available MODELS in rotation.
// If a model fails, the role moves to the next model. If all models fail for a
// role, that turn is skipped. This makes the system resilient to API failures.

export type AgentRole = 
  | "researcher"    // Web data, verifiable facts
  | "critic"        // Devil's advocate, find flaws
  | "architect"     // Technical design, implementation
  | "risk-manager"  // Risk analysis
  | "economist"     // Financial viability
  | "visionary"     // Disruptive ideas, think differently
  | "engineer"      // Technical details, code
  | "simplifier"    // Summarize, synthesize, clarify
  | "validator"     // Verify consistency, detect contradictions
  | "strategist"    // Macro vision, long term
  | "historian"     // Precedents, similar cases
  | "optimizer"     // Efficiency, continuous improvement
  | "skeptic"       // Doubt everything, demand proof
  | "pragmatist"    // What actually works, no theories
  | "integrator"    // Unite perspectives, seek consensus
  | "provocateur";  // Uncomfortable questions, break assumptions

// Role execution order (16 roles per round)
export const ROLES: AgentRole[] = [
  "researcher",
  "critic",
  "architect",
  "risk-manager",
  "economist",
  "visionary",
  "engineer",
  "simplifier",
  "validator",
  "strategist",
  "historian",
  "optimizer",
  "skeptic",
  "pragmatist",
  "integrator",
  "provocateur",
];

// Role metadata (icons and descriptive names)
export const ROLE_METADATA: Record<AgentRole, { icon: string; name: string }> = {
  researcher: { icon: "🌐", name: "Researcher" },
  critic: { icon: "🧠", name: "Critic" },
  architect: { icon: "💚", name: "Architect" },
  "risk-manager": { icon: "🦙", name: "Risk Manager" },
  economist: { icon: "💠", name: "Economist" },
  visionary: { icon: "👁️", name: "Visionary" },
  engineer: { icon: "🟢", name: "Engineer" },
  simplifier: { icon: "🔸", name: "Simplifier" },
  validator: { icon: "🖼️", name: "Validator" },
  strategist: { icon: "🚀", name: "Strategist" },
  historian: { icon: "🏮", name: "Historian" },
  optimizer: { icon: "☀️", name: "Optimizer" },
  skeptic: { icon: "⚡", name: "Skeptic" },
  pragmatist: { icon: "💙", name: "Pragmatist" },
  integrator: { icon: "🔺", name: "Integrator" },
  provocateur: { icon: "💧", name: "Provocateur" },
};

export interface Model {
  id: string;
  label: string;
  shortLabel: string;
  provider: string;
  type: "perplexity" | "openrouter";
  color: string;
}

// Available models (rotated across roles)
export const MODELS: Model[] = [
  {
    id: "perplexity",
    label: "Perplexity Sonar Reasoning Pro",
    shortLabel: "Perplexity",
    provider: "Perplexity",
    type: "perplexity",
    color: "#3B82F6",
  },
  {
    id: "qwen/qwen3-235b-a22b-thinking-2507",
    label: "Qwen3 235B Thinking",
    shortLabel: "Qwen3 235B",
    provider: "Qwen",
    type: "openrouter",
    color: "#8B5CF6",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B Instruct",
    shortLabel: "Llama 70B",
    provider: "Meta",
    type: "openrouter",
    color: "#F97316",
  },
  {
    id: "google/gemma-3-27b-it:free",
    label: "Gemma 3 27B",
    shortLabel: "Gemma 27B",
    provider: "Google",
    type: "openrouter",
    color: "#0EA5E9",
  },
  {
    id: "qwen/qwen3-vl-235b-a22b-thinking",
    label: "Qwen3 VL 235B Thinking",
    shortLabel: "Qwen3 VL",
    provider: "Qwen",
    type: "openrouter",
    color: "#6366F1",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "Nemotron 3 Nano 30B",
    shortLabel: "Nemotron 30B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#84CC16",
  },
  {
    id: "arcee-ai/trinity-mini:free",
    label: "Trinity Mini 26B",
    shortLabel: "Trinity Mini",
    provider: "Arcee",
    type: "openrouter",
    color: "#EF4444",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano 12B VL",
    shortLabel: "Nemotron 12B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#14B8A6",
  },
  {
    id: "stepfun/step-3.5-flash:free",
    label: "Step 3.5 Flash",
    shortLabel: "Step 3.5",
    provider: "StepFun",
    type: "openrouter",
    color: "#D946EF",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    shortLabel: "GLM 4.5",
    provider: "Z.ai",
    type: "openrouter",
    color: "#F472B6",
  },
  {
    id: "upstage/solar-pro-3:free",
    label: "Solar Pro 3",
    shortLabel: "Solar Pro 3",
    provider: "Upstage",
    type: "openrouter",
    color: "#FB923C",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    label: "Nemotron Nano 9B V2",
    shortLabel: "Nemotron 9B",
    provider: "NVIDIA",
    type: "openrouter",
    color: "#A855F7",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    shortLabel: "GPT-OSS 20B",
    provider: "OpenAI",
    type: "openrouter",
    color: "#22D3EE",
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    shortLabel: "GPT-OSS 120B",
    provider: "OpenAI",
    type: "openrouter",
    color: "#10B981",
  },
  {
    id: "arcee-ai/trinity-large-preview:free",
    label: "Trinity Large Preview",
    shortLabel: "Trinity Large",
    provider: "Arcee",
    type: "openrouter",
    color: "#EC4899",
  },
  {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    label: "LFM 2.5 1.2B Thinking",
    shortLabel: "Liquid 1.2B",
    provider: "Liquid",
    type: "openrouter",
    color: "#F59E0B",
  },
];

// ── Legacy Collaborator Interface (for backward compatibility) ───────────────

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

// Generate COLLABORATORS array dynamically (role-model pairs for UI display)
export const COLLABORATORS: Collaborator[] = ROLES.map((role, i) => {
  const model = MODELS[i % MODELS.length];
  const meta = ROLE_METADATA[role];
  return {
    ...model,
    role,
    icon: meta.icon,
  };
});

// Model used for generating final conclusions
export const CONCLUSION_MODEL = "qwen/qwen3-235b-a22b-thinking-2507";

// ── Helpers ──────────────────────────────────────────────────────────────────

const _collabMap = new Map(COLLABORATORS.map((c) => [c.id, c]));
const _modelMap = new Map(MODELS.map((m) => [m.id, m]));

export function getCollaborator(agentId: string): Collaborator | undefined {
  return _collabMap.get(agentId);
}

export function getModel(modelId: string): Model | undefined {
  return _modelMap.get(modelId);
}

export function getCollaboratorLabel(agentId: string): string {
  return _collabMap.get(agentId)?.shortLabel ?? agentId.split("/").pop() ?? agentId;
}

export function getModelLabel(modelId: string): string {
  const model = _modelMap.get(modelId);
  if (model) return model.shortLabel;
  
  // Fallback: extract from ID
  return modelId.split("/").pop() ?? modelId;
}

export function getCollaboratorColor(agentId: string): string {
  return _collabMap.get(agentId)?.color ?? "#94A3B8";
}

export function getModelColor(modelId: string): string {
  return _modelMap.get(modelId)?.color ?? "#94A3B8";
}

export function getCollaboratorRole(agentId: string): AgentRole {
  return _collabMap.get(agentId)?.role ?? "critic";
}

export function getRoleIcon(role: AgentRole): string {
  return ROLE_METADATA[role]?.icon ?? "🤖";
}

export function getRoleName(role: AgentRole): string {
  return ROLE_METADATA[role]?.name ?? role;
}
