import { DebateMode } from "./types";
import { AgentRole } from "./models";
import type { DebateMessage } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip <think>...</think> blocks and leading reasoning filler from stored text */
function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^(Okay|Ok|Let me think|Let me see|Hmm|Wait|Alright)[,.:!\s][\s\S]{0,1500}?\n\n/i, "")
    .trim();
}

/**
 * Compress old history into a single context block to prevent context overflow.
 * Keeps the last RECENT_KEEP messages verbatim; summarises older ones to ~200 chars each.
 */
const RECENT_KEEP = 4;

export function buildContextBlock(
  history: DebateMessage[],
  getLabel: (id: string) => string
): string | null {
  if (history.length <= RECENT_KEEP) return null;

  const old = history.slice(0, history.length - RECENT_KEEP);
  const lines: string[] = ["=== PREVIOUS DEBATE (summary) ==="];

  for (const msg of old) {
    const label = msg.agent === "user" ? "User" : getLabel(msg.agent);
    const clean = stripThinking(msg.content);
    const snippet = clean.replace(/\n+/g, " ").slice(0, 220);
    lines.push(`• ${label}: ${snippet}${clean.length > 220 ? "…" : ""}`);
  }

  lines.push("=== END SUMMARY — respond only to recent messages ===");
  return lines.join("\n");
}

// ── Debate phases ─────────────────────────────────────────────────────────────

function getPhaseInstruction(round: number): string {
  if (round === 1) return "PHASE 1 — EXPLORATION: present your UNIQUE perspective. Don't repeat the proposal.";
  if (round === 2) return "PHASE 2 — DEBATE: challenge existing arguments. Demand evidence. Attack assumptions.";
  return `PHASE ${round} — CONVERGENCE: stop going in circles. Propose something ACTIONABLE or state what's blocked and why.`;
}

// ── Anti-Repetition Rule ──────────────────────────────────────────────────────

const NO_REPEAT_RULE = `\n\nRULE: Don't repeat what has already been said. Read the summary above. Contribute something NEW or ask the critical question that's missing.`;

// ── Prompts por Rol (con formato de salida obligatorio) ──────────────────────

const ROLE_PROMPTS: Record<AgentRole, string> = {
  researcher:
    `You are RESEARCHER. Provide only verifiable facts: real statistics, documented cases, benchmarks.\nFORMAT: "FACT: [concrete fact]. SOURCE: [origin]. IMPLICATION: [what this changes in the debate]"`,

  critic:
    `You are DEVIL'S ADVOCATE. Identify the most serious flaw in the last argument.\nFORMAT: "FLAW: [specific defect]. EVIDENCE: [why it's a flaw]. COUNTERPROPOSAL: [what should be said instead]"`,

  architect:
    `You are SYSTEMS ARCHITECT. Propose concrete technical design with real stack.\nFORMAT: "DESIGN: [components]. STACK: [specific technologies]. KEY DECISION: [most important choice and why]"`,

  "risk-manager":
    `You are RISK MANAGER. Identify the most critical risk not mentioned.\nFORMAT: "RISK: [description]. PROBABILITY: [high/medium/low + reason]. MITIGATION: [concrete step]"`,

  economist:
    `You are ECONOMIST. Analyze financial viability with real numbers.\nFORMAT: "COST: [concrete estimate]. POTENTIAL REVENUE: [how and how much]. BREAK-EVEN: [when and under what conditions]"`,

  visionary:
    `You are VISIONARY. Propose the radically different approach nobody considered.\nFORMAT: "WHAT IF: [alternative premise]? REASONING: [why it breaks the current problem]. FIRST STEP: [how to start]"`,

  engineer:
    `You are SOFTWARE ENGINEER. Detail how this actually gets implemented.\nFORMAT: "IMPLEMENTATION: [concrete steps]. LIBRARY/API: [specific tools]. TECHNICAL TRAP: [the problem nobody sees]"`,

  simplifier:
    `You are SIMPLIFIER. Synthesize the current state of debate in clear terms.\nFORMAT: "AGREED: [what the group already accepts]. BLOCKED: [key unresolved point]. NEXT STEP: [what should happen now]"`,

  validator:
    `You are VALIDATOR. Detect the most serious contradiction or inconsistency in the debate.\nFORMAT: "CONTRADICTION: [agent X said A, agent Y said B]. INCOMPATIBILITY: [why they can't coexist]. RESOLUTION: [how to reconcile them]"`,

  strategist:
    `You are STRATEGIST. Provide macro vision: market, competitive advantage, 3-year evolution.\nFORMAT: "MARKET POSITION: [where it fits]. REAL ADVANTAGE: [what differentiates it]. STRATEGIC THREAT: [what could destroy it]"`,

  historian:
    `You are HISTORIAN. Cite a real precedent (company, project, technology) directly relevant.\nFORMAT: "PRECEDENT: [name and year]. WHAT HAPPENED: [summary]. APPLICABLE LESSON: [what changes in this debate]"`,

  optimizer:
    `You are OPTIMIZER. Identify the biggest waste or inefficiency in current proposal.\nFORMAT: "INEFFICIENCY: [what's excessive or slow]. OPTIMIZATION: [how to eliminate it]. GAIN: [quantifiable impact]"`,

  skeptic:
    `You are SKEPTIC. Question the most accepted assumption in the debate with contrary evidence.\nFORMAT: "ASSUMPTION: [what everyone assumes]. DOUBT: [specific reason not to believe it]. PROOF NEEDED: [what evidence would resolve the doubt]"`,

  pragmatist:
    `You are PRAGMATIST. Propose what can be executed TODAY with minimal resources.\nFORMAT: "ACTION TODAY: [executable step now]. RESOURCES: [exactly what's needed]. RESULT IN 30 DAYS: [what will be achieved]"`,

  integrator:
    `You are INTEGRATOR. Find synthesis between the two most opposite positions in the debate.\nFORMAT: "POSITION A: [summary]. POSITION B: [summary]. SYNTHESIS: [how to combine them without losing what's valuable in each]"`,

  provocateur:
    `You are PROVOCATEUR. Ask THE uncomfortable question nobody dares to formulate.\nFORMAT: "QUESTION: [the question that challenges everything]. REASON: [why it's uncomfortable]. CONSEQUENCE IF TRUE: [what would change]"`,
};

// ── Perplexity System Prompt ──────────────────────────────────────────────────

export const PERPLEXITY_SYSTEM_PROMPT = ROLE_PROMPTS.researcher + NO_REPEAT_RULE + `

Max 2-3 sentences per section. No pleasantries. Same language as proposal.`;

// ── OpenRouter System Prompt (by role + mode + round) ────────────────────────

const MODE_MODIFIERS: Record<DebateMode, string> = {
  conservative: `\nApproach: CONSERVATIVE. Prioritize safety.`,
  balanced: `\nApproach: BALANCED.`,
  aggressive: `\nApproach: AGGRESSIVE. Prioritize speed and boldness.`,
};

export function getOpenRouterSystemPrompt(mode: DebateMode, role: AgentRole = "critic", round = 1): string {
  return [
    ROLE_PROMPTS[role],
    NO_REPEAT_RULE,
    MODE_MODIFIERS[mode],
    `\n${getPhaseInstruction(round)}`,
    `\nMax 1-2 SHORT paragraphs. Stick to your format. No pleasantries. Same language as proposal.`,
  ].join("");
}

// ── Conclusion Prompt ────────────────────────────────────────────────────────

export const CONCLUSION_PROMPT = `You have witnessed an intense debate between 16 AI agents about the user's proposal. Now generate a FINAL CONCLUSION that synthesizes the best arguments, refutations, and consensus from the debate.

Identify points of genuine agreement (not just courtesy), the most important unresolved disagreements, and the key questions that arose. Produce an actionable technical document based on the debate.

You MUST respond EXCLUSIVELY with a valid JSON block (no text before or after, no markdown code fences) with exactly this structure:

{
  "strategySummary": "Complete description of the agreed system/plan (5-8 sentences, with all key technical details)",
  "profitabilityModel": "Detailed business or benefit model: metrics, projections, key assumptions",
  "riskAssessment": [
    {"risk": "detailed risk description", "severity": "low|medium|high|critical", "mitigation": "concrete mitigation strategy"}
  ],
  "constraints": ["technical assumption or condition 1", "technical assumption or condition 2"],
  "implementationSteps": ["Detailed Step 1 with technologies/tools", "Step 2..."],
  "openQuestions": ["Pending technical question 1", "Pending technical question 2"]
}

Generate minimum 5 risks, 7 detailed implementation steps, and 3 open questions. Steps must be actionable with specific technologies. Respond in the same language as the user's original proposal.`;
