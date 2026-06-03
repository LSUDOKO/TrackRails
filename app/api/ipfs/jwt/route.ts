import { NextResponse } from "next/server";

export async function GET() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json({ error: "PINATA_JWT not set" }, { status: 500 });
  }
  return NextResponse.json({ jwt });
}
