import "server-only";

export const PROVIDER_NAMES = [
  "Groq",
  "OpenRouter",
  "Cloudflare Workers AI",
  "GitHub Models",
  "NVIDIA NIM",
  "Mistral",
  "Cohere",
] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

interface ProviderConfig {
  baseUrl: string;
  keyEnv: string;
  models: string[];
  note: string;
}

// Each provider: where to point the SDK, which env var holds the key,
// and a few known-good free models. Add your own to the lists freely.
export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  Groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
    ],
    note: "Fastest inference available on a free tier. LPU hardware.",
  },
  OpenRouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-chat-v3-0324:free",
      "google/gemini-2.0-flash-exp:free",
    ],
    note: "Widest model selection. Free models end in ':free'.",
  },
  "Cloudflare Workers AI": {
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1",
    keyEnv: "CLOUDFLARE_API_TOKEN",
    models: [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct-v0.1",
    ],
    note: "Also needs CLOUDFLARE_ACCOUNT_ID in .env. Billed in 'neurons'.",
  },
  "GitHub Models": {
    baseUrl: "https://models.github.ai/inference",
    keyEnv: "GITHUB_TOKEN",
    models: [
      "openai/gpt-4o-mini",
      "meta/Llama-3.3-70B-Instruct",
      "mistral-ai/Mistral-Nemo",
    ],
    note: "Uses a fine-grained PAT with the models:read permission.",
  },
  "NVIDIA NIM": {
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyEnv: "NVIDIA_API_KEY",
    models: [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-small-24b-instruct",
    ],
    note: "Credit-based free tier from build.nvidia.com.",
  },
  Mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    keyEnv: "MISTRAL_API_KEY",
    models: ["mistral-small-latest", "open-mistral-nemo", "codestral-latest"],
    note: "Requires phone verification to activate the free tier.",
  },
  Cohere: {
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    keyEnv: "COHERE_API_KEY",
    models: [
      "command-r-plus-08-2024",
      "command-r-08-2024",
      "command-r7b-12-2024",
    ],
    note: "Trial key: ~20 calls/min, 1000/month.",
  },
};

export function isProviderName(name: string): name is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(name);
}

export function isProviderConfigured(name: ProviderName): boolean {
  return Boolean(process.env[PROVIDERS[name].keyEnv]);
}

/** Resolves the live base URL, re-reading env for providers whose URL is account-scoped. */
export function getBaseUrl(name: ProviderName): string {
  if (name === "Cloudflare Workers AI") {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
    return PROVIDERS[name].baseUrl.replace("{account}", account);
  }
  return PROVIDERS[name].baseUrl;
}

export function defaultTemperature(): number {
  return Number(process.env.TEMPERATURE ?? "0.7");
}

export function defaultMaxTokens(): number {
  return Number(process.env.MAX_TOKENS ?? "1024");
}

export function defaultSystemPrompt(): string {
  return process.env.SYSTEM_PROMPT ?? "You are a helpful assistant. Be concise.";
}
