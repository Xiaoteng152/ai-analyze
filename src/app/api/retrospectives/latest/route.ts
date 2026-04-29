import { NextResponse } from "next/server";

import { getLatestEntry } from "@/lib/retrospective-store";

export async function GET() {
  const latest = await getLatestEntry();

  if (!latest) {
    return NextResponse.json({ ok: true, data: null }, { status: 200 });
  }

  return NextResponse.json({ ok: true, data: latest }, { status: 200 });
}
