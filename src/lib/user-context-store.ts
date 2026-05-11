import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_TREND_LOOKBACK_DAYS,
  MAX_PROFILE_LENGTH,
  MAX_WORK_STYLE_TAGS,
  type UserContextState,
} from "@/types/user-context";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTEXT_FILE = path.join(DATA_DIR, "user-context.json");

function clampTrendDays(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_TREND_LOOKBACK_DAYS;
  }
  return Math.min(90, Math.max(3, Math.round(value)));
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of tags) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim().slice(0, 32);
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_WORK_STYLE_TAGS) {
      break;
    }
  }
  return out;
}

export function createDefaultUserContext(): UserContextState {
  return {
    profileBackground: "",
    workStyleTags: [],
    trendLookbackDays: DEFAULT_TREND_LOOKBACK_DAYS,
  };
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function getUserContext(): Promise<UserContextState> {
  await ensureDataDir();
  try {
    const raw = await readFile(CONTEXT_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return createDefaultUserContext();
    }
    const record = parsed as Record<string, unknown>;
    const profile =
      typeof record.profileBackground === "string"
        ? record.profileBackground.slice(0, MAX_PROFILE_LENGTH)
        : "";
    return {
      profileBackground: profile,
      workStyleTags: normalizeTags(record.workStyleTags),
      trendLookbackDays: clampTrendDays(
        typeof record.trendLookbackDays === "number" ? record.trendLookbackDays : DEFAULT_TREND_LOOKBACK_DAYS
      ),
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    };
  } catch {
    return createDefaultUserContext();
  }
}

export type UserContextUpdateInput = {
  profileBackground?: string;
  workStyleTags?: unknown;
  trendLookbackDays?: number;
};

export async function saveUserContext(input: UserContextUpdateInput): Promise<UserContextState> {
  await ensureDataDir();
  const current = await getUserContext();
  const now = new Date().toISOString();

  const next: UserContextState = {
    profileBackground:
      typeof input.profileBackground === "string"
        ? input.profileBackground.slice(0, MAX_PROFILE_LENGTH)
        : current.profileBackground,
    workStyleTags: input.workStyleTags !== undefined ? normalizeTags(input.workStyleTags) : current.workStyleTags,
    trendLookbackDays:
      typeof input.trendLookbackDays === "number" ? clampTrendDays(input.trendLookbackDays) : current.trendLookbackDays,
    updatedAt: now,
  };

  await writeFile(CONTEXT_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}
