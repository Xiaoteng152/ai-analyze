import { NextResponse } from "next/server";

import { getEntriesWithinLastDays } from "@/lib/retrospective-store";
import { buildMultiDayTrend } from "@/lib/retrospective-trend";
import { DEFAULT_TREND_LOOKBACK_DAYS } from "@/types/user-context";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("days");
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  const days = Number.isFinite(parsed) ? parsed : DEFAULT_TREND_LOOKBACK_DAYS;
  const safeDays = Math.min(90, Math.max(3, Math.round(days)));

  const entries = await getEntriesWithinLastDays(safeDays);
  const data = buildMultiDayTrend(entries, safeDays);

  return NextResponse.json({ ok: true, data }, { status: 200 });
}
