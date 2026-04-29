import { NextResponse } from "next/server";

import { getLatestEntry, getPreviousEntry } from "@/lib/retrospective-store";

export async function GET() {
  const [latest, previous] = await Promise.all([getLatestEntry(), getPreviousEntry()]);
  return NextResponse.json({ ok: true, data: { latest, previous } }, { status: 200 });
}
