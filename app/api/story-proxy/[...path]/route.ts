import { NextRequest, NextResponse } from "next/server";

const TARGET =
  process.env.NEXT_PUBLIC_STORY_API_URL ?? "https://aeneid.storyrpc.io";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/story-proxy", "");
  const qs = req.nextUrl.searchParams.toString();
  const url = `${TARGET}${path}${qs ? "?" + qs : ""}`;

  console.log(`[story-proxy] GET ${url}`);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[story-proxy] ${res.status} from ${url}`);
  }

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
