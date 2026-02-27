import { randomUUID } from "crypto";
import { DebateSession, DebateMessage, SSEEvent, DebateMode } from "./types";
import { config } from "./config";
import { streamPerplexityResponse } from "./perplexity";
import { streamOpenRouterResponse } from "./openrouter";
import { COLLABORATORS } from "./models";

// ── SSE Encoder ───────────────────────────────────────────────────────────────

function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ── Message Factory ───────────────────────────────────────────────────────────

function createMessage(
  session: DebateSession,
  round: number,
  agent: string,
  roleForLLM: DebateMessage["roleForLLM"],
  content: string
): DebateMessage {
  return {
    id: randomUUID(),
    sessionId: session.sessionId,
    round,
    agent,
    roleForLLM,
    content,
    createdAt: new Date(),
  };
}

// ── Sequential Round-Robin Orchestrator ───────────────────────────────────────
// 16 agents debate one at a time. Each sees the full conversation history
// and responds to the previous speaker. Infinite rounds.

export async function* orchestrateDebate(
  proposal: string,
  mode: DebateMode = "balanced",
  signal?: AbortSignal,
  previousMessages?: { agent: string; content: string; round: number }[]
): AsyncGenerator<string, void, unknown> {
  const session: DebateSession = {
    sessionId: randomUUID(),
    proposal,
    mode,
    messages: [],
    status: "running",
    createdAt: new Date(),
  };

  // Load previous messages if resuming
  if (previousMessages && previousMessages.length > 0) {
    for (const msg of previousMessages) {
      const roleForLLM = msg.agent === "user" ? "user" : "assistant";
      session.messages.push(
        createMessage(session, msg.round, msg.agent, roleForLLM, msg.content)
      );
    }
  } else {
    // Round 0: user's proposal
    session.messages.push(createMessage(session, 0, "user", "user", proposal));
  }

  const totalAgents = COLLABORATORS.length;
  const startTurnIndex = previousMessages ? previousMessages.filter(m => m.agent !== "user").length : 0;
  
  console.log(
    `[Debate ${session.sessionId}] ${previousMessages ? 'Resumed' : 'Started'} — mode: ${mode}, ${totalAgents} agents, turn ${startTurnIndex}`
  );

  try {
    let turnIndex = startTurnIndex; // Start from where we left off

    while (true) {
      if (signal?.aborted) break;

      // Current agent (round-robin)
      const collab = COLLABORATORS[turnIndex % totalAgents];
      const round = Math.floor(turnIndex / totalAgents) + 1;

      // Emit round_start at the beginning of each full cycle
      if (turnIndex % totalAgents === 0) {
        yield encodeSSE({ type: "round_start", round });
      }

      const agentId = collab.id;
      yield encodeSSE({ type: "message_start", agent: agentId, round });

      let content = "";
      try {
        const gen =
          collab.type === "perplexity"
            ? streamPerplexityResponse(
                session.messages,
                config.debate.maxTokensPerplexity
              )
            : streamOpenRouterResponse(
                session.messages,
                collab.id,
                collab.id,
                mode,
                config.debate.maxTokensOpenRouter,
                round
              );

        for await (const chunk of gen) {
          if (signal?.aborted) break;
          content += chunk;
          yield encodeSSE({ type: "token", agent: agentId, round, data: chunk });
        }

        if (content.length > 0 && !signal?.aborted) {
          session.messages.push(
            createMessage(session, round, agentId, "assistant", content)
          );
          yield encodeSSE({ type: "message_end", agent: agentId, round });
          console.log(
            `[Debate ${session.sessionId}] R${round} ${collab.shortLabel} ✓ (${content.length} chars)`
          );
        } else if (!signal?.aborted) {
          yield encodeSSE({
            type: "agent_error",
            agent: agentId,
            data: `${collab.shortLabel} no generó respuesta.`,
          });
          yield encodeSSE({ type: "message_end", agent: agentId, round });
        }
      } catch (err) {
        if (signal?.aborted) break;
        const errMsg = err instanceof Error ? err.message : "Error desconocido";
        console.error(
          `[Debate ${session.sessionId}] R${round} ${collab.shortLabel} ✗:`,
          errMsg
        );
        yield encodeSSE({
          type: "agent_error",
          agent: agentId,
          data: `Error en ${collab.shortLabel}: ${errMsg}`,
        });
        yield encodeSSE({ type: "message_end", agent: agentId, round });
      }

      // Emit round_end at the end of each full cycle
      if ((turnIndex + 1) % totalAgents === 0) {
        yield encodeSSE({ type: "round_end", round });
        console.log(
          `[Debate ${session.sessionId}] Round ${round} complete — all ${totalAgents} agents spoke`
        );
      }

      turnIndex++;
      if (signal?.aborted) break;
    }

    session.status = "completed";
    console.log(`[Debate ${session.sessionId}] Stopped after ${turnIndex} turns`);
  } catch (err) {
    if (!signal?.aborted) {
      console.error(`[Debate ${session.sessionId}] Error:`, err);
      yield encodeSSE({ type: "error", data: "Error inesperado en el debate." });
    }
  }

  yield encodeSSE({ type: "done" });
}
