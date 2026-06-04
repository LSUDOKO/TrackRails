import { NextRequest, NextResponse } from "next/server";

/**
 * Story Protocol REST API target.
 * ONLY reads STORY_API_TARGET from env. Delete that var from Vercel
 * if you want to use a different one — don't rely on fallback chains
 * that can pick up stale ngrok URLs.
 */
const TARGET = process.env.STORY_API_TARGET ?? "";
const API_KEY = process.env.STORY_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!TARGET) {
    return NextResponse.json(
      {
        error:
          "Story API target not configured. Set STORY_API_TARGET in Vercel env vars. " +
          "Example: STORY_API_TARGET=https://staging-api.storyprotocol.net/api/v4",
      },
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
