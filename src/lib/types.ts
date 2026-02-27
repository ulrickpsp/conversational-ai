// ── Domain Types ──────────────────────────────────────────────────────────────

// Agent IDs: "user", "perplexity", or any OpenRouter model ID (e.g. "openai/gpt-oss-120b:free")
export type AgentRole = string;
export type LLMRole = "system" | "user" | "assistant";
export type DebateMode = "conservative" | "balanced" | "aggressive";

export interface DebateMessage {
  id: string;
  sessionId: string;
  round: number;
  agent: AgentRole;
  roleForLLM: LLMRole;
  content: string;
  createdAt: Date;
}

export interface DebateSession {
  sessionId: string;
  proposal: string;
  mode: DebateMode;
  messages: DebateMessage[];
  status: "running" | "completed" | "error";
  createdAt: Date;
}

// ── SSE Event Types ──────────────────────────────────────────────────────────

export type SSEEventType =
  | "token"
  | "message_start"
  | "message_end"
  | "round_start"
  | "round_end"
  | "agent_error"
  | "conclusion"
  | "error"
  | "done";

export interface SSEEvent {
  type: SSEEventType;
  agent?: string | null;
  round?: number;
  data?: string;
}

// ── Conclusion Output ────────────────────────────────────────────────────────

export interface DebateConclusion {
  strategySummary: string;
  profitabilityModel: string;
  riskAssessment: RiskItem[];
  constraints: string[];
  implementationSteps: string[];
  openQuestions: string[];
}

export interface RiskItem {
  risk: string;
  severity: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

// ── API Request / Response ───────────────────────────────────────────────────

export interface StartDebateRequest {
  proposal: string;
  mode?: DebateMode;
  previousMessages?: { agent: string; content: string; round: number }[];
}

export interface ConcludeRequest {
  messages: { agent: string; content: string; round: number }[];
  mode: DebateMode;
  proposal: string;
}
