import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getMonthDateRange, getMonthKey } from "@/lib/date-utils";
import type {
  CollectedItem,
  DataSourceId,
  DataSourcePermission,
  SourceSummary,
} from "@/types/retrospective";

const execFileAsync = promisify(execFile);

export type CollectContext = {
  month: string;
  userConsent: boolean;
  cwd?: string;
};

export type DataSourcePlugin = {
  id: DataSourceId;
  name: string;
  permission: DataSourcePermission;
  collect(context: CollectContext): Promise<CollectedItem[]>;
  summarize(items: CollectedItem[]): SourceSummary;
};

async function runGit(args: string[], cwd = process.cwd()): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 1024 * 1024 * 5,
  });
  return stdout.trim();
}

function compactLines(text: string, maxLines = 8): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

function parseGitLog(raw: string, month: string): CollectedItem[] {
  const now = new Date().toISOString();

  return raw
    .split("\u001e")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [hash = "", date = now, subject = "Git commit", author = "", ...bodyParts] =
        chunk.split("\u001f");
      const rawText = bodyParts.join("\u001f").trim();

      return {
        id: crypto.randomUUID(),
        sourceId: "git",
        sourceLabel: "Git 代码",
        collectedAt: now,
        occurredAt: date,
        month,
        title: subject || hash,
        summary: rawText ? `${subject}\n${compactLines(rawText, 5)}` : subject,
        rawText,
        metadata: {
          commitHash: hash,
          author,
        },
      } satisfies CollectedItem;
    });
}

const gitPlugin: DataSourcePlugin = {
  id: "git",
  name: "Git 代码",
  permission: {
    required: true,
    scope: ["读取当前仓库提交记录", "读取当前分支", "读取文件变更统计", "读取未提交状态"],
  },
  async collect(context) {
    if (!context.userConsent) {
      throw new Error("Git 数据读取需要用户同意。");
    }

    const month = context.month || getMonthKey();
    const range = getMonthDateRange(month);
    const [branch, logRaw, statusRaw, diffStatRaw] = await Promise.all([
      runGit(["branch", "--show-current"], context.cwd),
      runGit(
        [
          "log",
          `--since=${range.since}`,
          `--until=${range.until}`,
          "--pretty=format:%x1e%H%x1f%cI%x1f%s%x1f%an%x1f%b",
          "--numstat",
          "--no-renames",
        ],
        context.cwd
      ),
      runGit(["status", "--short"], context.cwd),
      runGit(["diff", "--stat"], context.cwd),
    ]);

    const commits = parseGitLog(logRaw, month).map((item) => ({
      ...item,
      metadata: {
        ...item.metadata,
        branch,
      },
    }));

    if (!statusRaw && !diffStatRaw) {
      return commits;
    }

    const now = new Date().toISOString();
    return [
      ...commits,
      {
        id: crypto.randomUUID(),
        sourceId: "git",
        sourceLabel: "Git 代码",
        collectedAt: now,
        occurredAt: now,
        month,
        title: "当前工作区未提交变更",
        summary: compactLines(statusRaw || diffStatRaw, 12) || "工作区有未提交变更。",
        rawText: [statusRaw, diffStatRaw].filter(Boolean).join("\n\n"),
        metadata: {
          branch,
          kind: "working-tree",
        },
      },
    ];
  },
  summarize(items) {
    const latestCollectedAt = items
      .map((item) => item.collectedAt)
      .sort()
      .at(-1);

    return {
      sourceId: "git",
      sourceLabel: "Git 代码",
      itemCount: items.length,
      latestCollectedAt,
      highlights: items
        .slice(-5)
        .map((item) => item.title)
        .filter(Boolean),
    };
  },
};

const plugins: DataSourcePlugin[] = [gitPlugin];

export function getDataSourcePlugins(): DataSourcePlugin[] {
  return plugins;
}

export function getDataSourcePlugin(sourceId: DataSourceId): DataSourcePlugin | null {
  return plugins.find((plugin) => plugin.id === sourceId) ?? null;
}
