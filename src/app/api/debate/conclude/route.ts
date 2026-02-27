import { NextRequest } from "next/server";
import { ConcludeRequest, DebateMessage, DebateConclusion, DebateMode } from "@/lib/types";
import { config } from "@/lib/config";
import { streamConclusion } from "@/lib/openrouter";
import { CONCLUSION_MODEL } from "@/lib/models";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: ConcludeRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, mode, proposal } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Se requieren mensajes para generar la conclusión." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!config.openrouter.apiKey) {
    return new Response(
      JSON.stringify({ error: "Falta la clave de OpenRouter." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate mode
  const validModes: DebateMode[] = ["conservative", "balanced", "aggressive"];
  const resolvedMode: DebateMode = mode && validModes.includes(mode) ? mode : "balanced";

  // Reconstruct DebateMessage[] from the client's message array
  const sessionId = randomUUID();
  const debateMessages: DebateMessage[] = [
    {
      id: randomUUID(),
      sessionId,
      round: 0,
      agent: "user",
      roleForLLM: "user",
      content: proposal || "Propuesta del usuario",
      createdAt: new Date(),
    },
    ...messages.map((m) => ({
      id: randomUUID(),
      sessionId,
      round: m.round,
      agent: m.agent,
      roleForLLM: (m.agent === "user" ? "user" : "assistant") as DebateMessage["roleForLLM"],
      content: m.content,
      createdAt: new Date(),
    })),
  ];

  console.log(`[Conclude] Generating conclusion from ${debateMessages.length} messages with ${CONCLUSION_MODEL}`);

  try {
    let conclusionRaw = "";
    for await (const chunk of streamConclusion(debateMessages, resolvedMode)) {
      conclusionRaw += chunk;
    }

    // Parse structured conclusion
    let conclusion: DebateConclusion;
    try {
      const cleaned = conclusionRaw
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      conclusion = JSON.parse(cleaned);
    } catch {
      conclusion = {
        strategySummary: conclusionRaw,
        profitabilityModel: "No se pudo parsear la conclusión estructurada.",
        riskAssessment: [],
        constraints: [],
        implementationSteps: [],
        openQuestions: [],
      };
    }

    console.log(`[Conclude] Successfully generated conclusion (${conclusionRaw.length} chars)`);

    return new Response(JSON.stringify(conclusion), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Conclude] Error:", err);
    return new Response(
      JSON.stringify({
        error: "Error al generar la conclusión.",
        details: err instanceof Error ? err.message : "Unknown",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
