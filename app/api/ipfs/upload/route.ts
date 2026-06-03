import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data to extract the actual file
    const form = await req.formData();
    const fileField = form.get("file");

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded — expected a FormData field named 'file'" },
        { status: 400 },
      );
    }

    if (fileField.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large — max 50 MB" }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      console.error("[IPFS] PINATA_JWT is not set in environment");
      return NextResponse.json(
        { error: "IPFS upload not configured — set PINATA_JWT in Vercel env vars" },
        { status: 500 },
      );
    }

    const filename = fileField.name || `track-${Date.now()}.mp3`;
    const formData = new FormData();
    formData.append("file", fileField, filename);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[IPFS] Pinata error (", res.status, "):", err);
      return NextResponse.json({ error: `IPFS upload failed: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ cid: data.IpfsHash as string });
  } catch (err) {
    console.error("[IPFS] Error:", err);
    return NextResponse.json({ error: "IPFS upload internal error" }, { status: 500 });
  }
}
