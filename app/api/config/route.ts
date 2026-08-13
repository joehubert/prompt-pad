import { NextResponse } from "next/server";

import { loadSettings, saveSettings, validateSettings } from "@/core/env-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { values?: Record<string, string> };
  const values = body.values ?? {};

  const errors = validateSettings(values);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    await saveSettings(values);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ errors: { _global: message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
