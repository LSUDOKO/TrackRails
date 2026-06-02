import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const blob = await req.blob();
    if (blob.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("file", blob);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT ?? ""}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[IPFS] Pinata error:", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ cid: data.IpfsHash as string });
  } catch (err) {
    console.error("[IPFS] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
