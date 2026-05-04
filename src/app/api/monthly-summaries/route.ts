import { NextResponse } from "next/server";

import { isMonthKey } from "@/lib/date-utils";
import { buildMonthlySummary, getDefaultMonth } from "@/lib/monthly-summary";
import {
  getCollectedItemsByMonth,
  getMonthlySummary,
  saveMonthlySummary,
} from "@/lib/source-store";

function resolveMonth(request: Request): string {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? getDefaultMonth();
  return isMonthKey(month) ? month : getDefaultMonth();
}

export async function GET(request: Request) {
  const month = resolveMonth(request);
  const [storedSummary, items] = await Promise.all([
    getMonthlySummary(month),
    getCollectedItemsByMonth(month),
  ]);

  return NextResponse.json(
    {
      ok: true,
      data: {
        month,
        summary: storedSummary ?? buildMonthlySummary(month, items),
        items,
      },
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const month = resolveMonth(request);
  const items = await getCollectedItemsByMonth(month);
  const summary = await saveMonthlySummary(buildMonthlySummary(month, items));

  return NextResponse.json(
    {
      ok: true,
      data: {
        month,
        summary,
        items,
      },
    },
    { status: 201 }
  );
}
