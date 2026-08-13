"use client";

import { useEffect, useMemo, useState } from "react";

import ChatHistory from "@/app/_components/ChatHistory";
import ChatInput from "@/app/_components/ChatInput";
import RunHistoryTable from "@/app/_components/RunHistoryTable";
import Sidebar from "@/app/_components/Sidebar";
import { formatMeta } from "@/core/format";
import type { ChatMessage, ChatStreamEvent, ProvidersResponse, StatsRecord } from "@/core/types";

async function readNdjsonStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from server.");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as ChatStreamEvent);
}

export default function ChatPage() {
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [customModel, setCustomModel] = useState("");

  const [openrouterModels, setOpenrouterModels] = useState<string[]>([]);
  const [openrouterRefreshedAt, setOpenrouterRefreshedAt] = useState<string | null>(null);
  const [openrouterError, setOpenrouterError] = useState<string | null>(null);
  const [refreshingOpenRouter, setRefreshingOpenRouter] = useState(false);

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [streamMode, setStreamMode] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<StatsRecord[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerOrder = useMemo(
    () => (providersData ? Object.keys(providersData.providers) : []),
    [providersData],
  );

  const modelOptions = useMemo(() => {
    if (!providersData) return [];
    if (provider === "OpenRouter") {
      return openrouterModels.length > 0
        ? openrouterModels
        : (providersData.providers.OpenRouter?.models ?? []);
    }
    return providersData.providers[provider]?.models ?? [];
  }, [providersData, provider, openrouterModels]);

  async function refreshOpenRouterModels() {
    setRefreshingOpenRouter(true);
    setOpenrouterError(null);
    try {
      const resp = await fetch("/api/openrouter-models");
      const data = (await resp.json()) as { models?: string[]; error?: string };
      if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`);
      if (!data.models || data.models.length === 0) {
        setOpenrouterError("No free models found in the response.");
        return;
      }
      setOpenrouterModels(data.models);
      setOpenrouterRefreshedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setOpenrouterError(err instanceof Error ? err.message : "Could not load models.");
    } finally {
      setRefreshingOpenRouter(false);
    }
  }

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: ProvidersResponse) => {
        setProvidersData(data);
        setTemperature(data.defaults.temperature);
        setMaxTokens(data.defaults.maxTokens);
        setSystemPrompt(data.defaults.systemPrompt);
        const firstProvider = Object.keys(data.providers)[0] ?? "";
        setProvider(firstProvider);
        setModel(data.providers[firstProvider]?.models[0] ?? "");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load providers."));
  }, []);

  function handleProviderChange(newProvider: string) {
    const switchedToOpenRouter = newProvider === "OpenRouter" && provider !== "OpenRouter";
    setProvider(newProvider);

    const initialList =
      newProvider === "OpenRouter"
        ? (providersData?.providers.OpenRouter?.models ?? [])
        : (providersData?.providers[newProvider]?.models ?? []);
    setModel(initialList[0] ?? "");

    if (switchedToOpenRouter) {
      void refreshOpenRouterModels();
    }
  }

  const effectiveModel = customModel.trim() || model;

  function handleClear() {
    setMessages([]);
    setStats([]);
    setError(null);
  }

  async function handleSubmit(prompt: string) {
    if (sending || !provider) return;
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: prompt };
    const historyForRequest = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setSending(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model: effectiveModel,
          messages: historyForRequest.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt,
          temperature,
          maxTokens,
          stream: streamMode,
        }),
      });

      if (!resp.ok) {
        let message = `HTTP ${resp.status}`;
        try {
          const evt = (await resp.json()) as { message?: string };
          if (evt.message) message = evt.message;
        } catch {
          // ignore body parse failure, fall back to status text
        }
        throw new Error(message);
      }

      let finished = false;
      await readNdjsonStream(resp, (event) => {
        if (event.type === "delta") {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: event.content };
            return next;
          });
        } else if (event.type === "done") {
          finished = true;
          const meta = formatMeta(
            provider,
            effectiveModel,
            event.elapsed,
            event.ttft,
            event.completionTokens,
            event.totalTokens,
          );
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: event.answer, meta };
            return next;
          });
          setStats((prev) => [
            ...prev,
            {
              provider,
              model: effectiveModel,
              seconds: Math.round(event.elapsed * 100) / 100,
              ttft: event.ttft !== null ? Math.round(event.ttft * 100) / 100 : null,
              outTokens: event.completionTokens,
            },
          ]);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
      if (!finished) throw new Error("Stream ended unexpectedly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // roll back the user turn (and placeholder assistant turn) so a retry doesn't duplicate it
      setMessages((prev) => prev.slice(0, prev.length - 2));
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return <p className="p-6 text-sm text-red-500">Failed to load: {loadError}</p>;
  }

  if (!providersData) {
    return <p className="p-6 text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <Sidebar
        providers={providersData.providers}
        providerOrder={providerOrder}
        provider={provider}
        onProviderChange={handleProviderChange}
        modelOptions={modelOptions}
        model={model}
        onModelChange={setModel}
        customModel={customModel}
        onCustomModelChange={setCustomModel}
        onRefreshOpenRouter={refreshOpenRouterModels}
        refreshingOpenRouter={refreshingOpenRouter}
        openrouterRefreshedAt={openrouterRefreshedAt}
        openrouterModelCount={openrouterModels.length}
        openrouterError={openrouterError}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        maxTokens={maxTokens}
        onMaxTokensChange={setMaxTokens}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        streamMode={streamMode}
        onStreamModeChange={setStreamMode}
        onClear={handleClear}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h1 className="mb-4 text-lg font-semibold">Free LLM Inference Playground</h1>
          {error && (
            <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
          )}
          <ChatHistory messages={messages} />
          <RunHistoryTable stats={stats} />
        </div>
        <ChatInput disabled={sending} onSubmit={handleSubmit} />
      </main>
    </div>
  );
}
