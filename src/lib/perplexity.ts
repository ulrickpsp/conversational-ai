import OpenAI from "openai";
import { config } from "./config";
import { DebateMessage } from "./types";
import { PERPLEXITY_SYSTEM_PROMPT } from "./prompts";
import { getCollaboratorLabel } from "./models";

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

// ── Message Builder (sequential debate) ───────────────────────────────────────
// Full conversation as alternating user/assistant. This agent's own messages
// are "assistant", everything else (user proposal + other agents) are "user".

function buildMessages(
  history: DebateMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
  ];

  let lastRole: "user" | "assistant" | null = null;

  for (const msg of history) {
    if (msg.agent === "user") {
      // User proposal
      if (lastRole === "user") {
        // Merge into previous user message
        messages[messages.length - 1] = {
          role: "user",
          content: (messages[messages.length - 1] as { content: string }).content + "\n\n" + msg.content,
        };
      } else {
        messages.push({ role: "user", content: msg.content });
        lastRole = "user";
      }
    } else if (msg.agent === "perplexity") {
      // My own response → assistant
      messages.push({ role: "assistant", content: msg.content });
      lastRole = "assistant";
    } else {
      // Another agent's response → user (labeled)
      const label = getCollaboratorLabel(msg.agent);
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
