import { NextRequest } from "next/server";
import { orchestrateDebate } from "@/lib/orchestrator";
import { StartDebateRequest, DebateMode } from "@/lib/types";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel

export async function POST(request: NextRequest) {
  let body: StartDebateRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { proposal, mode, previousMessages } = body;

  // Validate proposal
  if (!proposal || typeof proposal !== "string" || proposal.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Proposal cannot be empty." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (proposal.length > config.debate.maxProposalLength) {
    return new Response(
      JSON.stringify({
        error: `Proposal exceeds maximum of ${config.debate.maxProposalLength} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate API keys
  if (!config.perplexity.apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing Perplexity key. Configure PERPLEXITY_API_KEY.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!config.openrouter.apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing OpenRouter key. Configure OPENROUTER_API_KEY.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate mode
  const validModes: DebateMode[] = ["conservative", "balanced", "aggressive"];
  const resolvedMode: DebateMode = mode && validModes.includes(mode) ? mode : "balanced";

  // Create SSE stream — runs indefinitely until client disconnects
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of orchestrateDebate(
          proposal.trim(),
          resolvedMode,
          request.signal,
          previousMessages
        )) {
          if (request.signal.aborted) break;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("[SSE Route] Stream error:", err);
          const errorEvent = `data: ${JSON.stringify({
            type: "error",
            data: "Error interno del servidor.",
          })}\n\n`;
          try {
            controller.enqueue(encoder.encode(errorEvent));
          } catch {
            /* controller already closed */
          }
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
