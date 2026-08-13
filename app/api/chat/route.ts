import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { PROVIDERS, getBaseUrl, isProviderName } from "@/core/providers";
import type { ChatStreamEvent } from "@/core/types";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  provider: string;
  model: string;
  messages: { role: "user" | "assistant"; content: string }[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

function ndjsonError(message: string, status: number): Response {
  const event: ChatStreamEvent = { type: "error", message };
  return new Response(JSON.stringify(event) + "\n", {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequestBody;
  const { provider, model, messages, systemPrompt, temperature, maxTokens, stream } = body;

  if (!isProviderName(provider)) {
    return ndjsonError(`Unknown provider: ${provider}`, 400);
  }

  const keyEnv = PROVIDERS[provider].keyEnv;
  const apiKey = process.env[keyEnv];
  if (!apiKey) {
    return ndjsonError(`${keyEnv} not set in environment or .env`, 400);
  }
  if (provider === "Cloudflare Workers AI" && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    return ndjsonError("CLOUDFLARE_ACCOUNT_ID not set in environment or .env", 400);
  }

  const client = new OpenAI({ baseURL: getBaseUrl(provider), apiKey, timeout: 60_000 });

  const payload = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const encoder = new TextEncoder();
  const start = performance.now();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      let firstTokenAt: number | null = null;
      let completionTokens: number | null = null;
      let totalTokens: number | null = null;
      let answer = "";

      try {
        if (stream) {
          const streamResp = await client.chat.completions.create({
            model,
            messages: payload,
            temperature,
            max_tokens: maxTokens,
            stream: true,
            stream_options: { include_usage: true },
          });
          for await (const event of streamResp) {
            if (event.usage) {
              completionTokens = event.usage.completion_tokens ?? null;
              totalTokens = event.usage.total_tokens ?? null;
            }
            const piece = event.choices?.[0]?.delta?.content;
            if (piece) {
              if (firstTokenAt === null) firstTokenAt = performance.now();
              answer += piece;
              send({ type: "delta", content: answer });
            }
          }
        } else {
          const resp = await client.chat.completions.create({
            model,
            messages: payload,
            temperature,
            max_tokens: maxTokens,
          });
          answer = resp.choices[0]?.message?.content ?? "";
          completionTokens = resp.usage?.completion_tokens ?? null;
          totalTokens = resp.usage?.total_tokens ?? null;
          send({ type: "delta", content: answer });
        }

        const elapsed = (performance.now() - start) / 1000;
        send({
          type: "done",
          answer,
          elapsed,
          ttft: firstTokenAt !== null ? (firstTokenAt - start) / 1000 : null,
          completionTokens,
          totalTokens,
        });
      } catch (err) {
        const name = err instanceof Error ? err.constructor.name : "Error";
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message: `${name}: ${message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
