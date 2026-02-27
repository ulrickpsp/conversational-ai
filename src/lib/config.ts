// ── Environment & Configuration ──────────────────────────────────────────────

export const config = {
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY ?? "",
    baseURL: "https://api.perplexity.ai",
    model: "sonar-reasoning-pro",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    baseURL: "https://openrouter.ai/api/v1",
    siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
    siteName: "AI Collaboration Arena",
  },
  debate: {
    maxTokensPerplexity: parseInt(process.env.DEBATE_MAX_TOKENS_PERPLEXITY ?? "400", 10),
    maxTokensOpenRouter: parseInt(process.env.DEBATE_MAX_TOKENS_OPENROUTER ?? "500", 10),
    maxProposalLength: 4000,
  },
} as const;
