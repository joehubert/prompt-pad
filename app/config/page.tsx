"use client";

import { useEffect, useState, type FormEvent } from "react";

interface EnvSetting {
  name: string;
  value: string;
  isSecret: boolean;
}

const DEFAULT_SETTINGS = new Set(["TEMPERATURE", "MAX_TOKENS", "SYSTEM_PROMPT"]);

const FIELD_LABEL: Record<string, string> = {
  TEMPERATURE: "Default temperature",
  MAX_TOKENS: "Default max tokens",
  SYSTEM_PROMPT: "Default system prompt",
};

const HELP_TEXT: Record<string, string> = {
  TEMPERATURE: "Used when a new inference session starts. Valid range: 0.0–2.0.",
  MAX_TOKENS: "Used when a new inference session starts. Valid range: 128–4096.",
  SYSTEM_PROMPT: "Used when a new inference session starts.",
};

function SettingField({
  setting,
  value,
  error,
  onChange,
}: {
  setting: EnvSetting;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = FIELD_LABEL[setting.name] ?? setting.name;
  const help = HELP_TEXT[setting.name];

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {setting.name === "SYSTEM_PROMPT" ? (
        <textarea
          className="h-28 w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={setting.isSecret ? "password" : "text"}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function ConfigPage() {
  const [settings, setSettings] = useState<EnvSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { settings: EnvSetting[] }) => {
        setSettings(data.settings);
        setValues(Object.fromEntries(data.settings.map((s) => [s.name, s.value])));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load settings."));
  }, []);

  function updateValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const resp = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = (await resp.json()) as { ok?: boolean; errors?: Record<string, string> };
      if (!resp.ok) {
        setErrors(data.errors ?? {});
        return;
      }
      setErrors({});
      setSuccess(true);
    } catch (err) {
      setErrors({ _global: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="p-6 text-sm text-red-500">Failed to load: {loadError}</p>;
  }
  if (!settings) {
    return <p className="p-6 text-sm text-muted">Loading…</p>;
  }

  const credentialSettings = settings.filter((s) => !DEFAULT_SETTINGS.has(s.name));
  const defaultSettings = settings.filter((s) => DEFAULT_SETTINGS.has(s.name));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-lg font-semibold">Configuration</h1>
      <p className="mb-6 text-sm text-muted">
        Update persistent provider credentials and inference defaults. Changes are saved to{" "}
        <code>.env</code>; inference-page controls remain session-only.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Provider credentials</h2>
          <div className="flex flex-col gap-3">
            {credentialSettings.map((setting) => (
              <SettingField
                key={setting.name}
                setting={setting}
                value={values[setting.name] ?? ""}
                error={errors[setting.name]}
                onChange={(v) => updateValue(setting.name, v)}
              />
            ))}
          </div>
        </section>

        <hr className="border-border" />

        <section>
          <h2 className="mb-3 text-sm font-semibold">Inference defaults</h2>
          <div className="flex flex-col gap-3">
            {defaultSettings.map((setting) => (
              <SettingField
                key={setting.name}
                setting={setting}
                value={values[setting.name] ?? ""}
                error={errors[setting.name]}
                onChange={(v) => updateValue(setting.name, v)}
              />
            ))}
          </div>
        </section>

        {errors._global && <p className="text-sm text-red-500">{errors._global}</p>}
        {success && (
          <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            Configuration saved. New inference sessions will use these defaults.
          </p>
        )}

        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save configuration"}
        </button>
      </form>
    </div>
  );
}
