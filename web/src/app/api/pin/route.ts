import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Pin a JSON payload to Pinata. Returns { cid }.
 *  Env vars (set in web/.env.local):
 *    PINATA_PIN_ENDPOINT  default: https://api.pinata.cloud/pinning/pinJSONToIPFS
 *    PINATA_JWT           (required)  the same JWT Atlas agent uses
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const endpoint = process.env.PINATA_PIN_ENDPOINT || "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT not configured on server", cid: null },
      { status: 503 }
    );
  }

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: `pinata ${r.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }
    const j = await r.json();
    const cid = j.IpfsHash || j.cid;
    if (!cid) return NextResponse.json({ error: "no cid in response", raw: j }, { status: 502 });
    return NextResponse.json({ cid });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "pin failed" }, { status: 500 });
  }
}
