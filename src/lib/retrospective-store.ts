import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RetrospectiveEntry } from "@/types/retrospective";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "retrospectives.json");

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readEntries(): Promise<RetrospectiveEntry[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as RetrospectiveEntry[];
  } catch {
    return [];
  }
}

async function writeEntries(entries: RetrospectiveEntry[]): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export async function getAllEntries(): Promise<RetrospectiveEntry[]> {
  return readEntries();
}

export async function getLatestEntry(): Promise<RetrospectiveEntry | null> {
  const entries = await readEntries();
  if (entries.length === 0) {
    return null;
  }
  return entries[entries.length - 1] ?? null;
}

export async function getPreviousEntry(): Promise<RetrospectiveEntry | null> {
  const entries = await readEntries();
  if (entries.length < 2) {
    return null;
  }
  return entries[entries.length - 2] ?? null;
}

export async function saveEntry(entry: RetrospectiveEntry): Promise<RetrospectiveEntry> {
  const entries = await readEntries();
  entries.push(entry);
  await writeEntries(entries);
  return entry;
}
