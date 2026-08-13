export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  meta?: string;
}

export interface StatsRecord {
  provider: string;
  model: string;
  seconds: number;
  ttft: number | null;
  outTokens: number | null;
}

export interface ProviderInfo {
  models: string[];
  note: string;
  keyEnv: string;
  configured: boolean;
}

export interface ChatDefaults {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface ProvidersResponse {
  providers: Record<string, ProviderInfo>;
  defaults: ChatDefaults;
}

export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | {
      type: "done";
      answer: string;
      elapsed: number;
      ttft: number | null;
      completionTokens: number | null;
      totalTokens: number | null;
    }
  | { type: "error"; message: string };
