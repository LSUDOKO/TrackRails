import { NextRequest, NextResponse } from "next/server";

const TARGET = "https://aeneid.storyrpc.io";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/story-proxy", "");
  const qs = req.nextUrl.searchParams.toString();
  const url = `${TARGET}${path}${qs ? "?" + qs : ""}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
