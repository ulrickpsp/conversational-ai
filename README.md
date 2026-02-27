# 🗣️ Multi-Agent AI Debate

A real-time debate platform where **16 AI agents with distinct roles** argue, challenge, and build on each other's ideas — sequentially, turn by turn. Built with Next.js, Server-Sent Events, Perplexity's web-search API, and 15 free OpenRouter models.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?logo=tailwindcss)

---

## ✨ Features

- **16 unique agents** debating one at a time in sequential round-robin
- **Role-based prompts** — each agent has a distinct perspective (Critic, Architect, Economist, Skeptic, Provocateur…) to eliminate repetition
- **Real-time streaming** via Server-Sent Events (SSE)
- **Perplexity integration** with live web search for up-to-date facts
- **Pause & resume** mid-debate: inject your own comments and have agents pick up with that context
- **Scroll freely** while agents write — auto-scroll only kicks in when you're at the bottom
- **Persistent state** — F5 / page refresh restores the full conversation from localStorage
- **Error resilience** — agents that fail (rate limit, 404) are silently skipped
- **Debate modes**: Conservative · Balanced · Aggressive
- **Conclusion synthesis** — stop at any time to generate a structured JSON conclusion

---

## 🤖 The 16 Agents

| # | Agent | Model | Role |
|---|-------|-------|------|
| 1 | 🌐 Perplexity | `sonar-reasoning-pro` | **Researcher** — real-time web data |
| 2 | 🧠 Qwen3 235B | `qwen3-235b-a22b-thinking-2507` | **Critic** — devil's advocate |
| 3 | 💚 GPT-OSS 120B | `gpt-oss-120b:free` | **Architect** — system design |
| 4 | 🦙 Llama 70B | `llama-3.3-70b-instruct:free` | **Risk Manager** — what can go wrong |
| 5 | 💠 Gemma 27B | `gemma-3-27b-it:free` | **Economist** — financial viability |
| 6 | 👁️ Qwen3 VL 235B | `qwen3-vl-235b-a22b-thinking` | **Visionary** — disruptive ideas |
| 7 | 🟢 Nemotron 30B | `nemotron-3-nano-30b-a3b:free` | **Engineer** — concrete implementation |
| 8 | 🔸 Trinity Mini | `trinity-mini:free` | **Simplifier** — cut through noise |
| 9 | 🖼️ Nemotron 12B | `nemotron-nano-12b-v2-vl:free` | **Validator** — detect contradictions |
| 10 | 🚀 Step 3.5 | `step-3.5-flash:free` | **Strategist** — macro vision |
| 11 | 🏮 GLM 4.5 | `glm-4.5-air:free` | **Historian** — precedents & cases |
| 12 | ☀️ Solar Pro 3 | `solar-pro-3:free` | **Optimizer** — efficiency & cuts |
| 13 | ⚡ Nemotron 9B | `nemotron-nano-9b-v2:free` | **Skeptic** — demands proof |
| 14 | 💙 GPT-OSS 20B | `gpt-oss-20b:free` | **Pragmatist** — what actually works |
| 15 | 🔺 Trinity Large | `trinity-large-preview:free` | **Integrator** — synthesizes views |
| 16 | 💧 Liquid 1.2B | `lfm-2.5-1.2b-thinking:free` | **Provocateur** — uncomfortable questions |

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx              # Main UI
│   ├── globals.css
│   └── api/
│       └── debate/
│           ├── route.ts      # SSE streaming endpoint
│           └── conclude/
│               └── route.ts  # Conclusion synthesis endpoint
├── components/
│   ├── ChatView.tsx          # Message feed with smart scroll
│   ├── StatusBar.tsx         # Running state, pause/resume UI
│   ├── ProposalForm.tsx      # Input form
│   └── ConclusionPanel.tsx   # Final synthesis display
├── hooks/
│   └── useDebateStream.ts    # SSE client + localStorage persistence
└── lib/
    ├── models.ts             # Agent definitions + roles
    ├── orchestrator.ts       # Sequential round-robin engine
    ├── prompts.ts            # Role-specific system prompts
    ├── perplexity.ts         # Perplexity API client
    ├── openrouter.ts         # OpenRouter API client
    ├── config.ts             # Token limits, settings
    └── types.ts              # Shared TypeScript types
```

**Flow:**
1. User submits a proposal
2. Server opens an SSE stream
3. Orchestrator iterates agents round-robin, calling each API sequentially
4. Tokens stream back to the client in real time
5. Each agent sees the full conversation history and responds from its role
6. User can pause, inject a comment, and resume — agents continue with that context

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A [Perplexity API key](https://www.perplexity.ai/settings/api) (paid, ~$0.001/request)
- An [OpenRouter API key](https://openrouter.ai/settings/keys) (free tier — all 15 OpenRouter models cost $0)

### Installation

```bash
git clone https://github.com/ulrickpsp/conversational-ai.git
cd conversational-ai
npm install
```

### Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```env
PERPLEXITY_API_KEY=pplx-your-key-here
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🎮 Usage

1. **Enter a proposal** — a question, idea, or topic you want debated
2. **Choose a mode**: Conservative / Balanced / Aggressive
3. **Watch 16 agents** argue in sequence, each from their unique role
4. **Scroll freely** — auto-scroll pauses when you scroll up, resumes at the bottom
5. **Pause anytime** — click ⏸ to pause, write a steering comment, then ▶️ Continue
6. **Stop & conclude** — click ⏹ to generate a structured JSON conclusion
7. **Refresh safely** — F5 restores the full conversation from localStorage
8. **New session** — click 🔄 to clear everything and start fresh

---

## ⚙️ Configuration

Key settings in `src/lib/config.ts`:

| Setting | Default | Description |
|---------|---------|-------------|
| `maxTokensPerplexity` | `400` | Max tokens per Perplexity turn |
| `maxTokensOpenRouter` | `500` | Max tokens per OpenRouter turn |

---

## 🛠️ Tech Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, Turbopack
- **[React 19](https://react.dev/)** — UI
- **[TypeScript 5](https://www.typescriptlang.org/)** — Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Styling
- **[OpenAI SDK v6](https://github.com/openai/openai-node)** — Compatible interface for Perplexity + OpenRouter
- **Server-Sent Events** — Real-time token streaming
- **localStorage** — Client-side debate persistence

---

## 🔒 Security

- API keys are stored server-side only in `.env.local`
- `.env.local` is gitignored — never committed
- Keys are never exposed to the browser
- All API calls happen in Next.js Route Handlers (server-side)

---

## 📄 License

MIT
