import { getMonthKey } from "@/lib/date-utils";
import { getDataSourcePlugins } from "@/lib/source-plugins";
import type { CollectedItem, MonthlySummary, SourceSummary } from "@/types/retrospective";

function summarizeSource(sourceId: CollectedItem["sourceId"], items: CollectedItem[]): SourceSummary {
  const plugin = getDataSourcePlugins().find((candidate) => candidate.id === sourceId);
  if (plugin) {
    return plugin.summarize(items);
  }

  const latestCollectedAt = items
    .map((item) => item.collectedAt)
    .sort()
    .at(-1);

  return {
    sourceId,
    sourceLabel: items[0]?.sourceLabel ?? sourceId,
    itemCount: items.length,
    latestCollectedAt,
    highlights: items.slice(-5).map((item) => item.title),
  };
}

function groupBySource(items: CollectedItem[]): SourceSummary[] {
  const grouped = new Map<CollectedItem["sourceId"], CollectedItem[]>();
  for (const item of items) {
    grouped.set(item.sourceId, [...(grouped.get(item.sourceId) ?? []), item]);
  }

  return Array.from(grouped.entries()).map(([sourceId, sourceItems]) =>
    summarizeSource(sourceId, sourceItems)
  );
}

function pickTitles(items: CollectedItem[], sourceId?: CollectedItem["sourceId"], limit = 5): string[] {
  return items
    .filter((item) => (sourceId ? item.sourceId === sourceId : true))
    .slice(-limit)
    .map((item) => item.title)
    .filter(Boolean);
}

function buildNarrative(month: string, items: CollectedItem[], sourceSummaries: SourceSummary[]): string {
  if (items.length === 0) {
    return `${month} 暂时没有可归纳的数据。开启 Git 读取或补充手动输入后，这里会自动沉淀本月脉络。`;
  }

  const sourceText = sourceSummaries
    .map((source) => `${source.sourceLabel} ${source.itemCount} 条`)
    .join("、");
  const latestTitles = pickTitles(items, undefined, 4).join("；");

  return `${month} 共沉淀 ${items.length} 条数据，来源包括 ${sourceText}。近期重点集中在：${latestTitles || "暂无明确标题"}。`;
}

export function buildMonthlySummary(month: string, items: CollectedItem[]): MonthlySummary {
  const now = new Date().toISOString();
  const sourceSummaries = groupBySource(items);
  const gitTitles = pickTitles(items, "git", 5);
  const manualTitles = pickTitles(items, "manual", 5);
  const allTitles = pickTitles(items, undefined, 8);

  return {
    id: `month-${month}`,
    month,
    createdAt: now,
    updatedAt: now,
    itemCount: items.length,
    sourceSummaries,
    headline: items.length
      ? `${month} 月度归纳已基于 ${items.length} 条数据生成`
      : `${month} 还没有可归纳的数据`,
    narrative: buildNarrative(month, items, sourceSummaries),
    keyThemes: [
      ...(gitTitles.length ? [`代码推进：${gitTitles.slice(0, 3).join("；")}`] : []),
      ...(manualTitles.length ? [`手动复盘：${manualTitles.slice(0, 3).join("；")}`] : []),
      ...(allTitles.length ? [`本月线索：${allTitles.slice(0, 3).join("；")}`] : []),
    ].slice(0, 4),
    wins: gitTitles.length
      ? gitTitles.slice(0, 3)
      : manualTitles.slice(0, 3),
    risks: items.length
      ? ["来源覆盖仍然偏少，月度判断应结合手动补充。", "浏览和聊天数据尚未接入，需要授权设计后再读取。"]
      : ["暂无数据，无法形成可靠趋势。"],
    nextMonthFocus: items.length
      ? ["保持 Git 自动读取节奏", "每天补充一条主观复盘", "月底检查反复出现的问题和推进断点"]
      : ["先开启 Git 读取", "补充本月关键事件", "生成第一份月度归纳"],
  };
}

export function getDefaultMonth(): string {
  return getMonthKey();
}
