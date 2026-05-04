import { NextResponse } from "next/server";

import { getDefaultMonth } from "@/lib/monthly-summary";
import { getDataSourcePlugin } from "@/lib/source-plugins";
import { saveCollectedItems } from "@/lib/source-store";

export async function POST(request: Request) {
  let payload: unknown = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const consent = body.consent === true;
  const month = typeof body.month === "string" ? body.month : getDefaultMonth();

  if (!consent) {
    return NextResponse.json(
      { ok: false, error: "读取 Git 代码数据前需要用户同意。" },
      { status: 403 }
    );
  }

  const plugin = getDataSourcePlugin("git");
  if (!plugin) {
    return NextResponse.json(
      { ok: false, error: "Git 数据源插件未启用。" },
      { status: 404 }
    );
  }

  try {
    const collectedItems = await plugin.collect({ month, userConsent: consent });
    const savedItems = await saveCollectedItems(collectedItems);

    return NextResponse.json(
      {
        ok: true,
        data: {
          source: plugin.name,
          collected: collectedItems.length,
          saved: savedItems.length,
          items: savedItems,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Git 数据读取失败。",
      },
      { status: 500 }
    );
  }
}
