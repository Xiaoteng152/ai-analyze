import { NextResponse } from "next/server";

import { getMonthKey } from "@/lib/date-utils";
import { generateRetrospectiveAnalysis } from "@/lib/retrospective-analysis";
import { buildMultiDayTrend, formatTrendForPrompt } from "@/lib/retrospective-trend";
import { getEntriesWithinLastDays, getLatestEntry, saveEntry } from "@/lib/retrospective-store";
import { getUserContext } from "@/lib/user-context-store";
import { saveCollectedItems } from "@/lib/source-store";
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

  const maybeBody = payload as RetrospectiveInput & {
    provider?: "openrouter" | "openai";
    model?: string | null;
  };
  const [previous, userContext] = await Promise.all([getLatestEntry(), getUserContext()]);
  const trendEntries = await getEntriesWithinLastDays(userContext.trendLookbackDays);
  const multiDayTrendText = formatTrendForPrompt(
    buildMultiDayTrend(trendEntries, userContext.trendLookbackDays)
  );

  const personalization = {
    profileBackground: userContext.profileBackground.trim() || undefined,
    workStyleTags: userContext.workStyleTags.length ? userContext.workStyleTags : undefined,
    multiDayTrendText: multiDayTrendText.trim() || undefined,
  };

  const now = new Date().toISOString();
  const baseEntry: RetrospectiveEntry = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    inputSource: "manual",
    todayWhatIDid: maybeBody.todayWhatIDid,
    highlightMoment: maybeBody.highlightMoment,
    whatWentWrong: maybeBody.whatWentWrong,
    tomorrowPlan: maybeBody.tomorrowPlan,
  };

  const analysis = await generateRetrospectiveAnalysis(baseEntry, previous, {
    provider: maybeBody.provider,
    model: maybeBody.model,
    personalization,
  });

  const saved = await saveEntry({
    ...baseEntry,
    profileContext: personalization.profileBackground,
    personalityNotes: personalization.workStyleTags?.join("、"),
    todayEvaluation: analysis.todayEvaluation,
    comparisonSummary: analysis.comparisonSummary,
    fullReport: analysis.fullReport,
    nextActions: analysis.nextActions,
    score: analysis.score,
    analysisStatus: analysis.analysisStatus,
    analysisProvider: analysis.analysisProvider,
    analysisModel: analysis.analysisModel,
    analysisUpdatedAt: now,
  });
  const manualItem = await saveCollectedItems([
    {
      id: crypto.randomUUID(),
      sourceId: "manual",
      sourceLabel: "手动输入",
      collectedAt: now,
      occurredAt: now,
      month: getMonthKey(new Date(now)),
      title: `每日复盘 ${new Date(now).toLocaleDateString("zh-CN")}`,
      summary: [
        `今天做了什么：${saved.todayWhatIDid}`,
        `高光时刻：${saved.highlightMoment}`,
        `问题不足：${saved.whatWentWrong}`,
        `明日计划：${saved.tomorrowPlan}`,
      ].join("\n"),
      rawText: saved.fullReport,
      metadata: {
        retrospectiveId: saved.id,
      },
    },
  ]);

  return NextResponse.json(
    {
      ok: true,
      data: {
        ...saved,
        collectedItemIds: manualItem.map((item) => item.id),
      },
    },
    { status: 201 }
  );
}
