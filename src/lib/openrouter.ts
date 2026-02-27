import OpenAI from "openai";
import { config } from "./config";
import { DebateMessage, DebateMode } from "./types";
import { getOpenRouterSystemPrompt, CONCLUSION_PROMPT, buildContextBlock } from "./prompts";
import { getCollaboratorLabel, getCollaboratorRole, CONCLUSION_MODEL } from "./models";

// ── OpenRouter Client ─────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: config.openrouter.apiKey,
      baseURL: config.openrouter.baseURL,
      defaultHeaders: {
        "HTTP-Referer": config.openrouter.siteUrl,
        "X-Title": config.openrouter.siteName,
      },
    });
  }
  return _client;
}

// ── Message Builder (sequential debate) ───────────────────────────────────────
// Old messages compressed to summary; only last RECENT_KEEP passed verbatim.
const RECENT_KEEP = 4;

function buildMessages(
  history: DebateMessage[],
  currentAgentId: string,
  mode: DebateMode,
  round = 1
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const role = getCollaboratorRole(currentAgentId);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getOpenRouterSystemPrompt(mode, role, round) },
  ];

  // Inject compressed context block for older history
  const contextBlock = buildContextBlock(history, getCollaboratorLabel);
  if (contextBlock) {
    messages.push({ role: "user", content: contextBlock });
    messages.push({ role: "assistant", content: "Entendido. He revisado el debate previo." });
  }

  // Only pass the most recent messages verbatim
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
    } else if (msg.agent === currentAgentId) {
      messages.push({ role: "assistant", content: msg.content });
      lastRole = "assistant";
    } else {
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

// ── Conclusion Message Builder ────────────────────────────────────────────────

function buildConclusionMessages(
  history: DebateMessage[],
  mode: DebateMode
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getOpenRouterSystemPrompt(mode) },
  ];

  let context = "";
  for (const msg of history) {
    if (msg.agent === "user") {
      context += `**Propuesta del usuario:**\n${msg.content}\n\n`;
    } else {
      context += `**${getCollaboratorLabel(msg.agent)}:**\n${msg.content}\n\n`;
    }
  }

  messages.push({ role: "user", content: context.trim() });
  return messages;
}

// ── Stream Helper ─────────────────────────────────────────────────────────────

async function* streamFromModel(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  maxTokens: number,
  temperature: number
): AsyncGenerator<string, void, unknown> {
  const client = getClient();

  const isThinkingModel =
    model.includes("thinking") ||
    model.includes("gemini-2.5") ||
    model.includes("gemini-3") ||
    model.includes("deepseek-r1") ||
    model.includes("o3") ||
    model.includes("step-3.5") ||
    model.includes("glm-4.5") ||
    model.includes("gpt-oss") ||
    model.includes(":thinking");

  const params: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  if (isThinkingModel) {
    params.thinking = { budget_tokens: Math.floor(maxTokens * 0.4) };
  }

  const stream = await client.chat.completions.create(
    params as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming
  );

  let totalChars = 0;
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    const delta = choice?.delta;

    const content = delta?.content;
    if (content) {
      totalChars += content.length;
      yield content;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reasoning = (delta as any)?.reasoning_content ?? (delta as any)?.reasoning;
    if (reasoning && !content) {
      totalChars += reasoning.length;
      yield reasoning;
    }
  }

  if (totalChars === 0) {
    console.warn(`[OpenRouter] Model ${model} returned 0 content chars.`);
    yield "(Sin respuesta)";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function* streamOpenRouterResponse(
  history: DebateMessage[],
  model: string,
  currentAgentId: string,
  mode: DebateMode,
  maxTokens: number,
  round = 1
): AsyncGenerator<string, void, unknown> {
  const messages = buildMessages(history, currentAgentId, mode, round);
  yield* streamFromModel(model, messages, maxTokens, 0.7);
}

export async function* streamConclusion(
  history: DebateMessage[],
  mode: DebateMode
): AsyncGenerator<string, void, unknown> {
  const model = CONCLUSION_MODEL;
  const messages = buildConclusionMessages(history, mode);
  messages.push({ role: "user", content: CONCLUSION_PROMPT });
  yield* streamFromModel(model, messages, 4000, 0.3);
}
