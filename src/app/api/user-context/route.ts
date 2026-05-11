import { NextResponse } from "next/server";

import { getUserContext, saveUserContext } from "@/lib/user-context-store";
import { MAX_PROFILE_LENGTH } from "@/types/user-context";

export async function GET() {
  const data = await getUserContext();
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function PUT(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  if (
    typeof body.profileBackground === "string" &&
    body.profileBackground.length > MAX_PROFILE_LENGTH
  ) {
    return NextResponse.json(
      { ok: false, error: `个人背景长度不能超过 ${MAX_PROFILE_LENGTH} 字。` },
      { status: 400 }
    );
  }

  const data = await saveUserContext({
    profileBackground: typeof body.profileBackground === "string" ? body.profileBackground : undefined,
    workStyleTags: "workStyleTags" in body ? body.workStyleTags : undefined,
    trendLookbackDays:
      typeof body.trendLookbackDays === "number" && Number.isFinite(body.trendLookbackDays)
        ? body.trendLookbackDays
        : undefined,
  });

  return NextResponse.json({ ok: true, data }, { status: 200 });
}
