import { NextRequest, NextResponse } from "next/server";

/**
 * Story Protocol REST API target.
 *
 * 1. STORY_API_TARGET from .env.local (user's own node / custom proxy)
 * 2. Story Protocol staging API (with API key from STORY_API_KEY)
 * 3. Empty string fallback (catches stale ngrok URLs at a glance)
 */
const TARGET = process.env.STORY_API_TARGET ?? "";
const API_KEY = process.env.STORY_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!TARGET) {
    return NextResponse.json(
      { error: "Story API target not configured. Set STORY_API_TARGET in .env.local" },
      { status: 503 },
    );
  }

  const path = req.nextUrl.pathname.replace("/api/story-proxy", "");
  const qs = req.nextUrl.searchParams.toString();
  const url = `${TARGET}${path}${qs ? "?" + qs : ""}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  try {
    const res = await fetch(url, { headers });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Cannot reach Story API target at ${TARGET}: ${msg}` },
      { status: 502 },
    );
  }
}
