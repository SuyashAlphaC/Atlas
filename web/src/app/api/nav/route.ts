import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NavSnapshot {
  timestamp: number;
  total_assets: number;
  total_supply: number;
  nav_per_share: number;
  decisions_count: number;
}

/** Reads agent/data/nav_history.jsonl — populated by `atlas feedback` runs.
 *  Returns the snapshot array (most-recent last) for the dashboard NAV chart. */
export async function GET() {
  const candidates = [
    join(process.cwd(), "..", "agent", "data", "nav_history.jsonl"),
    join(process.cwd(), "agent", "data", "nav_history.jsonl"),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    return NextResponse.json({ snapshots: [], note: "nav_history.jsonl not found" });
  }
  try {
    const raw = readFileSync(path, "utf8");
    const snapshots: NavSnapshot[] = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    return NextResponse.json({ snapshots });
  } catch (e: any) {
    return NextResponse.json({ snapshots: [], error: e?.message }, { status: 500 });
  }
}
