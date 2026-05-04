import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CollectedItem, DataSourceId, MonthlySummary } from "@/types/retrospective";

const DATA_DIR = path.join(process.cwd(), "data");
const COLLECTED_ITEMS_FILE = path.join(DATA_DIR, "collected-items.json");
const MONTHLY_SUMMARIES_FILE = path.join(DATA_DIR, "monthly-summaries.json");

async function ensureJsonFile(filePath: string): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureJsonFile(filePath);
  const raw = await readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, values: T[]): Promise<void> {
  await writeFile(filePath, JSON.stringify(values, null, 2), "utf8");
}

function getItemDedupeKey(item: CollectedItem): string {
  const stableId = item.metadata?.commitHash ?? item.metadata?.retrospectiveId ?? item.title;
  return `${item.sourceId}:${String(stableId)}:${item.occurredAt}`;
}

export async function getCollectedItems(): Promise<CollectedItem[]> {
  return readJsonArray<CollectedItem>(COLLECTED_ITEMS_FILE);
}

export async function getCollectedItemsByMonth(month: string): Promise<CollectedItem[]> {
  const items = await getCollectedItems();
  return items
    .filter((item) => item.month === month)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export async function getSourceItemCount(sourceId: DataSourceId): Promise<number> {
  const items = await getCollectedItems();
  return items.filter((item) => item.sourceId === sourceId).length;
}

export async function saveCollectedItems(itemsToSave: CollectedItem[]): Promise<CollectedItem[]> {
  if (itemsToSave.length === 0) {
    return [];
  }

  const existingItems = await getCollectedItems();
  const existingKeys = new Set(existingItems.map(getItemDedupeKey));
  const newItems = itemsToSave.filter((item) => !existingKeys.has(getItemDedupeKey(item)));

  if (newItems.length === 0) {
    return [];
  }

  const nextItems = [...existingItems, ...newItems].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt)
  );
  await writeJsonArray(COLLECTED_ITEMS_FILE, nextItems);
  return newItems;
}

export async function getMonthlySummaries(): Promise<MonthlySummary[]> {
  return readJsonArray<MonthlySummary>(MONTHLY_SUMMARIES_FILE);
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary | null> {
  const summaries = await getMonthlySummaries();
  return summaries.find((summary) => summary.month === month) ?? null;
}

export async function saveMonthlySummary(summary: MonthlySummary): Promise<MonthlySummary> {
  const summaries = await getMonthlySummaries();
  const nextSummaries = [
    ...summaries.filter((item) => item.month !== summary.month),
    summary,
  ].sort((a, b) => a.month.localeCompare(b.month));

  await writeJsonArray(MONTHLY_SUMMARIES_FILE, nextSummaries);
  return summary;
}
