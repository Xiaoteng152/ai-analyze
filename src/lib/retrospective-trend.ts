import type { RetrospectiveEntry } from "@/types/retrospective";

export type TrendSnapshot = {
  id: string;
  createdAt: string;
  scoreValue?: number;
};

export type MultiDayTrendResult = {
  lookbackDays: number;
  entryCount: number;
  snapshots: TrendSnapshot[];
  bullets: string[];
  averageScore?: number;
  scoreMomentum: "up" | "down" | "flat" | "unknown";
  planCarryRate?: number;
};

function mean(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function momentumFromScores(values: number[]): "up" | "down" | "flat" | "unknown" {
  if (values.length < 3) {
    return "unknown";
  }
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const a = mean(first);
  const b = mean(second);
  if (a === undefined || b === undefined) {
    return "unknown";
  }
  if (b - a > 2) {
    return "up";
  }
  if (a - b > 2) {
    return "down";
  }
  return "flat";
}

export function buildMultiDayTrend(entries: RetrospectiveEntry[], lookbackDays: number): MultiDayTrendResult {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const snapshots: TrendSnapshot[] = sorted.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    scoreValue: typeof entry.score?.value === "number" ? entry.score.value : undefined,
  }));

  const scores = sorted
    .map((entry) => entry.score?.value)
    .filter((value): value is number => typeof value === "number");
  const averageScore = scores.length ? Math.round(mean(scores)! * 10) / 10 : undefined;

  let planMatches = 0;
  let planPairs = 0;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    const plan = prev.tomorrowPlan?.trim();
    if (!plan || plan.length < 2) {
      continue;
    }
    planPairs += 1;
    if (next.todayWhatIDid.includes(plan)) {
      planMatches += 1;
    }
  }
  const planCarryRate = planPairs > 0 ? Math.round((planMatches / planPairs) * 100) : undefined;

  const scoreMomentum = scores.length >= 3 ? momentumFromScores(scores) : ("unknown" as const);

  const bullets: string[] = [];
  if (sorted.length === 0) {
    bullets.push("所选时间窗口内暂无复盘记录，提交几天数据后会自动生成趋势。");
  } else {
    bullets.push(`最近 ${lookbackDays} 天共有 ${sorted.length} 条复盘记录。`);
    if (averageScore !== undefined) {
      bullets.push(`有评分的记录平均分为 ${averageScore}（仅统计已生成评分的条目）。`);
    }
    if (scoreMomentum === "up") {
      bullets.push("评分走势：后半段相对前半段略有抬升。");
    } else if (scoreMomentum === "down") {
      bullets.push("评分走势：后半段相对前半段略有回落，可关注节奏与预期管理。");
    } else if (scoreMomentum === "flat") {
      bullets.push("评分走势：整体较平稳。");
    }
    if (planCarryRate !== undefined) {
      bullets.push(`「上一条明日计划」在次日「今天做了什么」中被承接的比例约 ${planCarryRate}%。`);
    }
  }

  return {
    lookbackDays,
    entryCount: sorted.length,
    snapshots,
    bullets,
    averageScore,
    scoreMomentum,
    planCarryRate,
  };
}

export function formatTrendForPrompt(result: MultiDayTrendResult): string {
  return result.bullets.join(" ");
}
