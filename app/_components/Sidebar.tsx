"use client";

import type { ProviderInfo } from "@/core/types";

interface SidebarProps {
  providers: Record<string, ProviderInfo>;
  providerOrder: string[];
  provider: string;
  onProviderChange: (p: string) => void;
  modelOptions: string[];
  model: string;
  onModelChange: (m: string) => void;
  customModel: string;
  onCustomModelChange: (m: string) => void;
  onRefreshOpenRouter: () => void;
  refreshingOpenRouter: boolean;
  openrouterRefreshedAt: string | null;
  openrouterModelCount: number;
  openrouterError: string | null;
  temperature: number;
  onTemperatureChange: (t: number) => void;
  maxTokens: number;
  onMaxTokensChange: (t: number) => void;
  systemPrompt: string;
  onSystemPromptChange: (s: string) => void;
  streamMode: boolean;
  onStreamModeChange: (b: boolean) => void;
  onClear: () => void;
}

export default function Sidebar({
  providers,
  providerOrder,
  provider,
  onProviderChange,
  modelOptions,
  model,
  onModelChange,
  customModel,
  onCustomModelChange,
  onRefreshOpenRouter,
  refreshingOpenRouter,
  openrouterRefreshedAt,
  openrouterModelCount,
  openrouterError,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  systemPrompt,
  onSystemPromptChange,
  streamMode,
  onStreamModeChange,
  onClear,
}: SidebarProps) {
  const cfg = providers[provider];
  const configured = cfg?.configured ?? false;

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 text-sm">
      <div>
        <h2 className="mb-2 font-semibold">Provider</h2>

        <label className="mb-1 block text-xs font-medium text-muted">Endpoint</label>
        <select
          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
        >
          {providerOrder.map((name) => (
            <option key={name} value={name}>
              {providers[name]?.configured ? name : `${name}  (no key)`}
            </option>
          ))}
        </select>

        <label className="mt-3 mb-1 block text-xs font-medium text-muted">Model</label>
        <select
          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5"
          value={modelOptions.includes(model) ? model : ""}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {provider === "OpenRouter" && (
          <div className="mt-2">
            <button
              type="button"
              className="w-full rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
              onClick={onRefreshOpenRouter}
              disabled={refreshingOpenRouter}
            >
              {refreshingOpenRouter ? "Fetching…" : "Refresh free models"}
            </button>
            {openrouterRefreshedAt && (
              <p className="mt-1 text-xs text-muted">
                Last refreshed {openrouterRefreshedAt} · {openrouterModelCount} free models
              </p>
            )}
            {openrouterError && <p className="mt-1 text-xs text-red-500">{openrouterError}</p>}
          </div>
        )}

        <label className="mt-3 mb-1 block text-xs font-medium text-muted">
          ...or type a model ID
        </label>
        <input
          type="text"
          placeholder="override"
          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5"
          value={customModel}
          onChange={(e) => onCustomModelChange(e.target.value)}
        />

        {cfg && <p className="mt-2 text-xs text-muted">{cfg.note}</p>}
        {cfg && !configured && (
          <p className="mt-2 rounded-md bg-yellow-500/10 px-2 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
            Set <code>{cfg.keyEnv}</code> in your .env to use this provider.
          </p>
        )}
      </div>

      <hr className="border-border" />

      <div>
        <label className="mb-1 flex justify-between text-xs font-medium text-muted">
          <span>Temperature</span>
          <span>{temperature.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 flex justify-between text-xs font-medium text-muted">
          <span>Max tokens</span>
          <span>{maxTokens}</span>
        </label>
        <input
          type="range"
          min={128}
          max={4096}
          step={128}
          value={maxTokens}
          onChange={(e) => onMaxTokensChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">System prompt</label>
        <textarea
          className="h-24 w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-muted">
        <input
          type="checkbox"
          checked={streamMode}
          onChange={(e) => onStreamModeChange(e.target.checked)}
        />
        Stream responses
      </label>

      <hr className="border-border" />

      <button
        type="button"
        className="w-full rounded-md border border-border px-2 py-1.5 hover:bg-surface"
        onClick={onClear}
      >
        Clear conversation
      </button>
    </aside>
  );
}
