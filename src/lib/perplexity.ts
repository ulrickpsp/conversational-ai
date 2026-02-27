import OpenAI from "openai";
import { config } from "./config";
import { DebateMessage } from "./types";
import { PERPLEXITY_SYSTEM_PROMPT, buildContextBlock } from "./prompts";
import { getModelLabel, getRoleName, getRoleIcon } from "./models";

// ── Perplexity Direct Client (OpenAI-compatible API) ──────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: config.perplexity.apiKey,
      baseURL: config.perplexity.baseURL,
    });
  }
  return _client;
}

// ── Helper: Format agent label ────────────────────────────────────────────────

function formatAgentLabel(agentId: string): string {
  if (agentId === "user") return "User";
  
  const parts = agentId.split(":");
  if (parts.length === 2) {
    const role = parts[0];
    const modelId = parts[1];
    const roleIcon = getRoleIcon(role as any);
    const roleName = getRoleName(role as any);
    const modelLabel = getModelLabel(modelId);
    return `${roleIcon} ${roleName} (${modelLabel})`;
  }
  
  // Fallback for legacy format
  return getModelLabel(agentId);
}

// ── Message Builder (sequential debate) ───────────────────────────────────────
// Old messages compressed to summary; only last 4 passed verbatim.
const RECENT_KEEP = 4;

function buildMessages(
  history: DebateMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
  ];

  // Inject compressed summary for older messages
  const contextBlock = buildContextBlock(history, formatAgentLabel);
  if (contextBlock) {
    messages.push({ role: "user", content: contextBlock });
    messages.push({ role: "assistant", content: "Understood. I've reviewed the previous debate." });
  }

  const recent = history.slice(-RECENT_KEEP);
  let lastRole: "user" | "assistant" | null = null;

  for (const msg of recent) {
    if (msg.agent === "user") {
      if (lastRole === "user") {
        messages[messages.length - 1] = {
          role: "user",
          content: (messages[messages.length - 1] as { content: string }).content + "\n\n" + msg.content,
        };
      } else {
        messages.push({ role: "user", content: msg.content });
        lastRole = "user";
      }
    } else if (msg.agent.includes("perplexity")) {
      // Handle both "perplexity" and "researcher:perplexity" formats
      messages.push({ role: "assistant", content: msg.content });
      lastRole = "assistant";
    } else {
      const label = formatAgentLabel(msg.agent);
      const text = `[${label}]: ${msg.content}`;
      if (lastRole === "user") {
        messages[messages.length - 1] = {
          role: "user",
          content: (messages[messages.length - 1] as { content: string }).content + "\n\n" + text,
        };
      } else {
        messages.push({ role: "user", content: text });
        lastRole = "user";
      }
    }
  }

  return messages;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function* streamPerplexityResponse(
  history: DebateMessage[],
  maxTokens: number
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  const messages = buildMessages(history);

  const stream = await client.chat.completions.create({
    model: config.perplexity.model,
    messages,
    temperature: 0.5,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
