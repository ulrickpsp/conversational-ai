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
  const lines: string[] = ["=== DEBATE PREVIO (resumido) ==="];

  for (const msg of old) {
    const label = msg.agent === "user" ? "Usuario" : getLabel(msg.agent);
    const clean = stripThinking(msg.content);
    const snippet = clean.replace(/\n+/g, " ").slice(0, 220);
    lines.push(`• ${label}: ${snippet}${clean.length > 220 ? "…" : ""}`);
  }

  lines.push("=== FIN RESUMEN — responde solo a lo reciente ===");
  return lines.join("\n");
}

// ── Debate phases ─────────────────────────────────────────────────────────────

function getPhaseInstruction(round: number): string {
  if (round === 1) return "FASE 1 — EXPLORACIÓN: presenta tu perspectiva ÚNICA. No repitas la propuesta.";
  if (round === 2) return "FASE 2 — DEBATE: desafía los argumentos existentes. Exige evidencia. Ataca supuestos.";
  return `FASE ${round} — CONVERGENCIA: deja de dar vueltas. Propón algo ACCIONABLE o declara qué está bloqueado y por qué.`;
}

// ── Regla Anti-Repetición ────────────────────────────────────────────────────

const NO_REPEAT_RULE = `\n\nREGLA: No repitas lo que ya se dijo. Lee el resumen de arriba. Aporta algo NUEVO o haz la pregunta crítica que falta.`;

// ── Prompts por Rol (con formato de salida obligatorio) ──────────────────────

const ROLE_PROMPTS: Record<AgentRole, string> = {
  researcher:
    `Eres INVESTIGADOR. Aporta solo hechos verificables: estadísticas reales, casos documentados, benchmarks.\nFORMATO: "DATO: [hecho concreto]. FUENTE: [origen]. IMPLICACIÓN: [qué cambia esto en el debate]"`,

  critic:
    `Eres ABOGADO DEL DIABLO. Identifica el fallo más grave del último argumento.\nFORMATO: "FALLO: [el defecto específico]. EVIDENCIA: [por qué es un fallo]. CONTRAPROPUESTA: [qué debería decirse en su lugar]"`,

  architect:
    `Eres ARQUITECTO DE SISTEMAS. Propón diseño técnico concreto con stack real.\nFORMATO: "DISEÑO: [componentes]. STACK: [tecnologías específicas]. DECISIÓN CLAVE: [la elección más importante y por qué]"`,

  "risk-manager":
    `Eres GESTOR DE RIESGOS. Identifica el riesgo más crítico no mencionado.\nFORMATO: "RIESGO: [descripción]. PROBABILIDAD: [alta/media/baja + razón]. MITIGACIÓN: [paso concreto]"`,

  economist:
    `Eres ECONOMISTA. Analiza viabilidad financiera con números reales.\nFORMATO: "COSTE: [estimación concreta]. INGRESO POTENCIAL: [cómo y cuánto]. BREAK-EVEN: [cuándo y bajo qué condiciones]"`,

  visionary:
    `Eres VISIONARIO. Propón el enfoque radicalmente diferente que nadie consideró.\nFORMATO: "¿Y SI: [premisa alternativa]? RAZONAMIENTO: [por qué rompe el problema actual]. PRIMER PASO: [cómo empezar]"`,

  engineer:
    `Eres INGENIERO DE SOFTWARE. Detalla cómo se implementa esto realmente.\nFORMATO: "IMPLEMENTACIÓN: [pasos concretos]. LIBRERÍA/API: [herramientas específicas]. TRAMPA TÉCNICA: [el problema que nadie ve]"`,

  simplifier:
    `Eres SIMPLIFICADOR. Sintetiza el estado actual del debate en términos claros.\nFORMATO: "ACORDADO: [lo que el grupo ya acepta]. BLOQUEADO: [el punto irresoluto clave]. SIGUIENTE PASO: [qué debería ocurrir ahora]"`,

  validator:
    `Eres VALIDADOR. Detecta la contradicción o inconsistencia más grave del debate.\nFORMATO: "CONTRADICCIÓN: [agente X dijo A, agente Y dijo B]. INCOMPATIBILIDAD: [por qué no pueden coexistir]. RESOLUCIÓN: [cómo reconciliarlos]"`,

  strategist:
    `Eres ESTRATEGA. Aporta visión macro: mercado, ventaja competitiva, evolución a 3 años.\nFORMATO: "POSICIÓN EN MERCADO: [dónde encaja]. VENTAJA REAL: [qué la diferencia]. AMENAZA ESTRATÉGICA: [lo que podría destruirla]"`,

  historian:
    `Eres HISTORIADOR. Cita un precedente real (empresa, proyecto, tecnología) directamente relevante.\nFORMATO: "PRECEDENTE: [nombre y año]. LO QUE OCURRIÓ: [resumen]. LECCIÓN APLICABLE: [qué cambia en este debate]"`,

  optimizer:
    `Eres OPTIMIZADOR. Identifica el mayor desperdicio o ineficiencia en la propuesta actual.\nFORMATO: "INEFICIENCIA: [qué sobra o es lento]. OPTIMIZACIÓN: [cómo eliminarlo]. GANANCIA: [impacto cuantificable]"`,

  skeptic:
    `Eres ESCÉPTICO. Cuestiona el supuesto más aceptado del debate con evidencia contraria.\nFORMATO: "SUPUESTO: [lo que todos asumen]. DUDA: [razón específica para no creerlo]. PRUEBA NECESARIA: [qué evidencia resolvería la duda]"`,

  pragmatist:
    `Eres PRAGMÁTICO. Propón lo que se puede ejecutar HOY con recursos mínimos.\nFORMATO: "ACCIÓN HOY: [paso ejecutable ahora]. RECURSOS: [qué se necesita exactamente]. RESULTADO EN 30 DÍAS: [qué se habrá logrado]"`,

  integrator:
    `Eres INTEGRADOR. Encuentra la síntesis entre las dos posturas más opuestas del debate.\nFORMATO: "POSTURA A: [resumen]. POSTURA B: [resumen]. SÍNTESIS: [cómo combinarlas sin perder lo valioso de cada una]"`,

  provocateur:
    `Eres PROVOCADOR. Hace LA pregunta incómoda que nadie se atreve a formular.\nFORMATO: "PREGUNTA: [la pregunta que pone en duda todo]. RAZÓN: [por qué incomoda]. CONSECUENCIA SI ES VERDAD: [qué cambiaría]"`,
};

// ── Perplexity System Prompt ──────────────────────────────────────────────────

export const PERPLEXITY_SYSTEM_PROMPT = ROLE_PROMPTS.researcher + NO_REPEAT_RULE + `

Máximo 2-3 oraciones por sección. Sin cortesías. Mismo idioma que la propuesta.`;

// ── OpenRouter System Prompt (by role + mode + round) ────────────────────────

const MODE_MODIFIERS: Record<DebateMode, string> = {
  conservative: `\nEnfoque: CONSERVADOR. Prioriza seguridad.`,
  balanced: `\nEnfoque: EQUILIBRADO.`,
  aggressive: `\nEnfoque: AGRESIVO. Prioriza velocidad y audacia.`,
};

export function getOpenRouterSystemPrompt(mode: DebateMode, role: AgentRole = "critic", round = 1): string {
  return [
    ROLE_PROMPTS[role],
    NO_REPEAT_RULE,
    MODE_MODIFIERS[mode],
    `\n${getPhaseInstruction(round)}`,
    `\nMáximo 1-2 párrafos CORTOS. Cíñete a tu formato. Sin cortesías. Mismo idioma que la propuesta.`,
  ].join("");
}

// ── Conclusion Prompt ────────────────────────────────────────────────────────

export const CONCLUSION_PROMPT = `Has presenciado un debate intenso entre 16 agentes de IA sobre la propuesta del usuario. Ahora genera una CONCLUSIÓN FINAL que sintetice los mejores argumentos, refutaciones y consensos del debate.

Identifica los puntos donde hubo acuerdo real (no cortesía), los desacuerdos irresueltos más importantes, y las preguntas clave que surgieron. Produce un documento técnico accionable basado en el debate.

DEBES responder EXCLUSIVAMENTE con un bloque JSON válido (sin texto antes ni después, sin markdown code fences) con exactamente esta estructura:

{
  "strategySummary": "Descripción completa del sistema/plan acordado (5-8 oraciones, con todos los detalles técnicos clave)",
  "profitabilityModel": "Modelo de negocio o beneficio detallado: métricas, proyecciones, supuestos clave",
  "riskAssessment": [
    {"risk": "descripción detallada del riesgo", "severity": "low|medium|high|critical", "mitigation": "estrategia concreta de mitigación"}
  ],
  "constraints": ["supuesto o condición técnica 1", "supuesto o condición técnica 2"],
  "implementationSteps": ["Paso 1 detallado con tecnologías/herramientas", "Paso 2..."],
  "openQuestions": ["Pregunta técnica pendiente 1", "Pregunta técnica pendiente 2"]
}

Genera mínimo 5 riesgos, 7 pasos de implementación detallados y 3 preguntas abiertas. Los pasos deben ser accionables con tecnologías específicas. Responde en el mismo idioma que la propuesta original del usuario.`;
