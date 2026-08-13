import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OpenRouterModel {
  id?: string;
}

/**
 * Queries OpenRouter's public models list and returns the free-tier IDs.
 * No API key needed for this endpoint - it's just a catalog listing.
 */
export async function GET() {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/models", {
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `OpenRouter returned ${resp.status}` }, { status: 502 });
    }
    const data = (await resp.json()) as { data?: OpenRouterModel[] };
    const items = data.data ?? [];
    const freeModels = items
      .map((m) => m.id)
      .filter(
        (id): id is string =>
          id !== undefined && id.endsWith(":free") && id !== "openrouter/free",
      )
      .sort();

    return NextResponse.json({ models: ["openrouter/free", ...freeModels] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
