import { NextResponse } from "next/server";

import { saveEntry } from "@/lib/retrospective-store";
import type { RetrospectiveEntry, RetrospectiveInput } from "@/types/retrospective";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateInput(payload: unknown): payload is RetrospectiveInput {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const maybe = payload as Record<string, unknown>;
  return (
    isNonEmptyString(maybe.todayWhatIDid) &&
    isNonEmptyString(maybe.highlightMoment) &&
    isNonEmptyString(maybe.whatWentWrong) &&
    isNonEmptyString(maybe.tomorrowPlan)
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!validateInput(payload)) {
    return NextResponse.json(
      { ok: false, error: "Missing required retrospective fields." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const entry: RetrospectiveEntry = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    inputSource: "manual",
    ...payload,
  };

  const saved = await saveEntry(entry);

  return NextResponse.json({ ok: true, data: saved }, { status: 201 });
}
