import { randomUUID } from "crypto";
import { DebateSession, DebateMessage, SSEEvent, DebateMode } from "./types";
import { config } from "./config";
import { streamPerplexityResponse } from "./perplexity";
import { streamOpenRouterResponse } from "./openrouter";
import { 
  ROLES, 
  MODELS, 
  AgentRole, 
  getRoleIcon, 
  getRoleName, 
  getModelLabel,
  type Model 
} from "./models";

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

// ── Sequential Round-Robin Orchestrator with Resilient Model Rotation ────────
// 16 ROLES iterate in order. Each role tries MODELS in rotation until success.
// If a model fails (API error, rate limit, 404), the role tries the next model.
// If all models fail for a role, that turn is skipped. This ensures debates
// continue even when specific models are unavailable.

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

  const totalRoles = ROLES.length;
  const totalModels = MODELS.length;
  const startTurnIndex = previousMessages ? previousMessages.filter(m => m.agent !== "user").length : 0;
  
  // Track last successful model index for each role (for even distribution)
  const roleModelIndices = new Map<AgentRole, number>();
  ROLES.forEach((role, i) => roleModelIndices.set(role, i % totalModels));
  
  console.log(
    `[Debate ${session.sessionId}] ${previousMessages ? 'Resumed' : 'Started'} — mode: ${mode}, ${totalRoles} roles, ${totalModels} models, turn ${startTurnIndex}`
  );

  try {
    let turnIndex = startTurnIndex; // Start from where we left off

    while (true) {
      if (signal?.aborted) break;

      // Current role (round-robin through ROLES)
      const role = ROLES[turnIndex % totalRoles];
      const round = Math.floor(turnIndex / totalRoles) + 1;

      // Emit round_start at the beginning of each full cycle
      if (turnIndex % totalRoles === 0) {
        yield encodeSSE({ type: "round_start", round });
      }

      // Try models in rotation until one succeeds
      const startModelIndex = roleModelIndices.get(role) ?? 0;
      let modelAttempts = 0;
      let success = false;

      while (modelAttempts < totalModels && !success) {
        if (signal?.aborted) break;

        const modelIndex = (startModelIndex + modelAttempts) % totalModels;
        const model = MODELS[modelIndex];
        
        // Create a unique agent ID combining role and model for message tracking
        const agentId = `${role}:${model.id}`;
        
        const roleIcon = getRoleIcon(role);
        const roleName = getRoleName(role);
        const modelLabel = getModelLabel(model.id);
        const displayLabel = `${roleIcon} ${roleName} (${modelLabel})`;

        yield encodeSSE({ type: "message_start", agent: agentId, round });

        let content = "";
        try {
          const gen =
            model.type === "perplexity"
              ? streamPerplexityResponse(
                  session.messages,
                  config.debate.maxTokensPerplexity
                )
              : streamOpenRouterResponse(
                  session.messages,
                  model.id,
                  agentId,
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
            
            // Success! Update model index for this role and move to next role
            roleModelIndices.set(role, (modelIndex + 1) % totalModels);
            success = true;
            
            console.log(
              `[Debate ${session.sessionId}] R${round} ${displayLabel} ✓ (${content.length} chars)`
            );
          } else if (!signal?.aborted) {
            // Empty response - try next model
            yield encodeSSE({
              type: "agent_error",
              agent: agentId,
              data: `${displayLabel} returned empty response. Trying next model...`,
            });
            yield encodeSSE({ type: "message_end", agent: agentId, round });
            console.warn(
              `[Debate ${session.sessionId}] R${round} ${displayLabel} empty response, trying next model`
            );
            modelAttempts++;
          }
        } catch (err) {
          if (signal?.aborted) break;
          
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          console.error(
            `[Debate ${session.sessionId}] R${round} ${displayLabel} ✗:`,
            errMsg
          );
          
          // Try next model unless this was the last one
          if (modelAttempts < totalModels - 1) {
            yield encodeSSE({
              type: "agent_error",
              agent: agentId,
              data: `${displayLabel} failed: ${errMsg.slice(0, 100)}. Trying next model...`,
            });
            yield encodeSSE({ type: "message_end", agent: agentId, round });
            modelAttempts++;
          } else {
            // All models failed for this role
            yield encodeSSE({
              type: "agent_error",
              agent: agentId,
              data: `All models failed for ${roleName}. Skipping turn.`,
            });
            yield encodeSSE({ type: "message_end", agent: agentId, round });
            console.error(
              `[Debate ${session.sessionId}] R${round} ${roleName} — all ${totalModels} models failed`
            );
            break;
          }
        }
      }

      // Emit round_end at the end of each full cycle
      if ((turnIndex + 1) % totalRoles === 0) {
        yield encodeSSE({ type: "round_end", round });
        console.log(
          `[Debate ${session.sessionId}] Round ${round} complete — ${totalRoles} roles attempted`
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
      yield encodeSSE({ type: "error", data: "Unexpected error in debate." });
    }
  }

  yield encodeSSE({ type: "done" });
}
