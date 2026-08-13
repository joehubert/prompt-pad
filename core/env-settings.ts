import "server-only";

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

const PROJECT_ROOT = process.cwd();
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const ENV_EXAMPLE_PATH = path.join(PROJECT_ROOT, ".env.example");

export interface EnvSetting {
  name: string;
  value: string;
  isSecret: boolean;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n");
  if (normalized.endsWith("\n")) parts.pop();
  return parts;
}

function settingNames(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  return splitLines(fs.readFileSync(filePath, "utf8"))
    .filter((line) => {
      const stripped = line.trim();
      return stripped.length > 0 && !stripped.startsWith("#") && line.includes("=");
    })
    .map((line) => line.split("=", 1)[0].trim());
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath));
}

function isSecret(name: string): boolean {
  const upper = name.toUpperCase();
  return ["KEY", "TOKEN", "SECRET", "PASSWORD"].some((marker) => upper.includes(marker));
}

/** Returns settings from .env, supplemented by missing .env.example entries. */
export async function loadSettings(): Promise<EnvSetting[]> {
  const names = Array.from(
    new Set([...settingNames(ENV_PATH), ...settingNames(ENV_EXAMPLE_PATH)]),
  );
  const current = parseEnvFile(ENV_PATH);
  const examples = parseEnvFile(ENV_EXAMPLE_PATH);

  return names.map((name) => ({
    name,
    value: current[name] ?? examples[name] ?? "",
    isSecret: isSecret(name),
  }));
}

/** Quotes a value so spaces, comments, quotes, and newlines survive a reload. */
function serializeValue(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

/** Normalizes form values and returns validation errors keyed by setting name. */
export function validateSettings(values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  const temperatureRaw = (values.TEMPERATURE ?? "").trim();
  const temperature = Number(temperatureRaw);
  if (temperatureRaw === "" || Number.isNaN(temperature)) {
    errors.TEMPERATURE = "Must be a number between 0.0 and 2.0.";
  } else if (temperature < 0.0 || temperature > 2.0) {
    errors.TEMPERATURE = "Must be between 0.0 and 2.0.";
  }

  const maxTokensRaw = (values.MAX_TOKENS ?? "").trim();
  if (!/^-?\d+$/.test(maxTokensRaw)) {
    errors.MAX_TOKENS = "Must be an integer between 128 and 4096.";
  } else {
    const maxTokens = Number(maxTokensRaw);
    if (maxTokens < 128 || maxTokens > 4096) {
      errors.MAX_TOKENS = "Must be an integer between 128 and 4096.";
    }
  }

  return errors;
}

/** Updates known assignments while preserving comments and unrelated content. */
export async function saveSettings(values: Record<string, string>): Promise<void> {
  const errors = validateSettings(values);
  if (Object.keys(errors).length > 0) {
    throw new Error("Cannot save invalid environment settings.");
  }

  const sourcePath = fs.existsSync(ENV_PATH) ? ENV_PATH : ENV_EXAMPLE_PATH;
  const lines = fs.existsSync(sourcePath) ? splitLines(fs.readFileSync(sourcePath, "utf8")) : [];

  const remaining = { ...values };
  const updated: string[] = [];

  for (const line of lines) {
    const stripped = line.trimStart();
    if (stripped.length > 0 && !stripped.startsWith("#") && line.includes("=")) {
      const name = line.split("=", 1)[0].trim();
      if (name in remaining) {
        updated.push(`${name}=${serializeValue(remaining[name])}`);
        delete remaining[name];
        continue;
      }
    }
    updated.push(line);
  }

  const remainingNames = Object.keys(remaining);
  if (remainingNames.length > 0) {
    if (updated.length > 0 && updated[updated.length - 1] !== "") {
      updated.push("");
    }
    for (const name of remainingNames) {
      updated.push(`${name}=${serializeValue(remaining[name])}`);
    }
  }

  await fsp.mkdir(path.dirname(ENV_PATH), { recursive: true });
  const tmpPath = path.join(path.dirname(ENV_PATH), `.env.${process.pid}.${Date.now()}.tmp`);
  try {
    await fsp.writeFile(tmpPath, updated.join("\n") + "\n", "utf8");
    await fsp.rename(tmpPath, ENV_PATH);
  } finally {
    if (fs.existsSync(tmpPath)) {
      await fsp.unlink(tmpPath).catch(() => {});
    }
  }

  for (const [name, value] of Object.entries(values)) {
    process.env[name] = value;
  }
}
