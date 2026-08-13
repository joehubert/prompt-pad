import { NextResponse } from "next/server";

import {
  PROVIDER_NAMES,
  PROVIDERS,
  defaultMaxTokens,
  defaultSystemPrompt,
  defaultTemperature,
  isProviderConfigured,
} from "@/core/providers";
import type { ProvidersResponse } from "@/core/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers: ProvidersResponse["providers"] = {};
  for (const name of PROVIDER_NAMES) {
    providers[name] = {
      models: PROVIDERS[name].models,
      note: PROVIDERS[name].note,
      keyEnv: PROVIDERS[name].keyEnv,
      configured: isProviderConfigured(name),
    };
  }

  const response: ProvidersResponse = {
    providers,
    defaults: {
      temperature: defaultTemperature(),
      maxTokens: defaultMaxTokens(),
      systemPrompt: defaultSystemPrompt(),
    },
  };

  return NextResponse.json(response);
}
