"use client";

import { useState } from "react";
import Link from "next/link";

import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from "@/lib/retrospective-analysis";
import type {
  CollectedItem,
  MonthlySummary,
  RetrospectiveEntry,
  RetrospectiveInput,
} from "@/types/retrospective";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const INPUT_FIELDS: Array<{
  key: keyof RetrospectiveInput;
  label: string;
}> = [
  { key: "todayWhatIDid", label: "今天做了什么" },
  { key: "highlightMoment", label: "高光时刻" },
  { key: "whatWentWrong", label: "做得不好的地方" },
  { key: "tomorrowPlan", label: "明天准备做什么" },
];

const EMPTY_FORM: RetrospectiveInput = {
  todayWhatIDid: "",
  highlightMoment: "",
  whatWentWrong: "",
  tomorrowPlan: "",
};

const PROVIDER_MODEL_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  openrouter: [
    { label: "deepseek-ai/DeepSeek-R1", value: "deepseek-ai/DeepSeek-R1" },
    { label: "deepseek-ai/DeepSeek-V3", value: "deepseek-ai/DeepSeek-V3" },
    { label: "deepseek-ai/DeepSeek-R1-0528", value: "deepseek-ai/DeepSeek-R1-0528" },
  ],
  openai: [
    { label: "gpt-5.4", value: "gpt-5.4" },
    { label: "gpt-5.5", value: "gpt-5.5" },
    { label: "gpt-5.4-mini", value: "gpt-5.4-mini" },
  ],
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function truncate(text: string, max = 100): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trimEnd()}…`;
}

export function RetrospectiveHomeClient({
  initialLatestEntry,
  initialPreviousEntry,
  initialMonth,
  initialMonthlySummary,
  initialMonthlyItems,
}: {
  initialLatestEntry: RetrospectiveEntry | null;
  initialPreviousEntry: RetrospectiveEntry | null;
  initialMonth: string;
  initialMonthlySummary: MonthlySummary;
  initialMonthlyItems: CollectedItem[];
}) {
  const [form, setForm] = useState<RetrospectiveInput>(EMPTY_FORM);
  const [latestEntry, setLatestEntry] = useState<RetrospectiveEntry | null>(initialLatestEntry);
  const [previousEntry, setPreviousEntry] = useState<RetrospectiveEntry | null>(initialPreviousEntry);
  const [month, setMonth] = useState(initialMonth);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>(initialMonthlySummary);
  const [monthlyItems, setMonthlyItems] = useState<CollectedItem[]>(initialMonthlyItems);
  const [provider, setProvider] = useState<string>(DEFAULT_AI_PROVIDER);
  const [model, setModel] = useState<string>(PROVIDER_MODEL_OPTIONS[DEFAULT_AI_PROVIDER][0]?.value ?? DEFAULT_AI_MODEL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCollectingGit, setIsCollectingGit] = useState(false);
  const [isSummarizingMonth, setIsSummarizingMonth] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function loadCompareLatest() {
    const res = await fetch("/api/retrospectives/compare-latest", { cache: "no-store" });
    const payload = (await res.json()) as ApiResponse<{
      latest: RetrospectiveEntry | null;
      previous: RetrospectiveEntry | null;
    }>;
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error ?? "读取复盘对比失败");
    }
    setLatestEntry(payload.data.latest);
    setPreviousEntry(payload.data.previous);
  }

  async function loadMonthlySummary(nextMonth = month) {
    const res = await fetch(`/api/monthly-summaries?month=${encodeURIComponent(nextMonth)}`, {
      cache: "no-store",
    });
    const payload = (await res.json()) as ApiResponse<{
      month: string;
      summary: MonthlySummary;
      items: CollectedItem[];
    }>;
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error ?? "读取月度归纳失败");
    }
    setMonth(payload.data.month);
    setMonthlySummary(payload.data.summary);
    setMonthlyItems(payload.data.items);
  }

  async function collectGitData() {
    setIsCollectingGit(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/sources/git/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, month }),
      });
      const payload = (await res.json()) as ApiResponse<{ saved: number; collected: number }>;
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Git 数据读取失败");
        return;
      }

      await loadMonthlySummary(month);
      setMessage(
        payload.data.saved > 0
          ? `Git 已读取 ${payload.data.collected} 条，新增保存 ${payload.data.saved} 条。`
          : "Git 已读取，未发现新的可保存数据。"
      );
    } catch {
      setError("Git 数据读取失败，请确认当前目录是 Git 仓库。");
    } finally {
      setIsCollectingGit(false);
    }
  }

  async function generateMonthlySummary() {
    setIsSummarizingMonth(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/monthly-summaries?month=${encodeURIComponent(month)}`, {
        method: "POST",
      });
      const payload = (await res.json()) as ApiResponse<{
        month: string;
        summary: MonthlySummary;
        items: CollectedItem[];
      }>;
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "生成月度归纳失败");
        return;
      }

      setMonth(payload.data.month);
      setMonthlySummary(payload.data.summary);
      setMonthlyItems(payload.data.items);
      setMessage("月度归纳已刷新。");
    } catch {
      setError("生成月度归纳失败，请稍后重试。");
    } finally {
      setIsSummarizingMonth(false);
    }
  }

  const availableModels = PROVIDER_MODEL_OPTIONS[provider] ?? PROVIDER_MODEL_OPTIONS.openrouter;

  function updateField(field: keyof RetrospectiveInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/retrospectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          provider,
          model,
        }),
      });

      const payload = (await res.json()) as ApiResponse<RetrospectiveEntry>;
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "提交失败，请稍后重试");
        return;
      }

      await loadCompareLatest();
      await loadMonthlySummary(month);
      setForm(EMPTY_FORM);
      setMessage("提交成功，已保存本次复盘。");
    } catch {
      setError("提交失败，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function buildCompareLines(): string[] {
    if (!latestEntry || !previousEntry) {
      return ["至少需要两条记录，才可以进行上一条对比。"];
    }

    const carryOver = previousEntry.tomorrowPlan
      ? latestEntry.todayWhatIDid.includes(previousEntry.tomorrowPlan)
      : false;
    const issueRepeat = previousEntry.whatWentWrong
      ? latestEntry.whatWentWrong.includes(previousEntry.whatWentWrong)
      : false;
    const highlightCarry = previousEntry.highlightMoment
      ? latestEntry.todayWhatIDid.includes(previousEntry.highlightMoment)
      : false;

    return [
      carryOver ? "计划承接：已承接上一条明日计划。" : "计划承接：未明显承接上一条明日计划。",
      issueRepeat ? "问题重复：上一条问题在本次仍然出现。" : "问题重复：未发现明显重复问题。",
      highlightCarry
        ? "完成延续：上一条高光内容在本次执行中有延续。"
        : "完成延续：未检测到上一条高光内容的明确延续。",
    ];
  }

  function getTodayEvaluation(): string {
    if (latestEntry?.todayEvaluation) {
      return truncate(latestEntry.todayEvaluation, 100);
    }

    return "提交后这里会显示一段控制在 100 字左右的今日评价。";
  }

  function getComparisonSummary(): string {
    if (latestEntry?.comparisonSummary) {
      return truncate(latestEntry.comparisonSummary, 100);
    }

    return truncate(buildCompareLines().join(" "), 100);
  }

  function getScoreLabel(): string {
    if (!latestEntry?.score) {
      return "临时评分待生成";
    }

    const suffix =
      latestEntry.score.scale === "100"
        ? "/100"
        : latestEntry.score.scale === "5"
          ? "/5"
          : " 评级";
    return `${latestEntry.score.value}${suffix}`;
  }

  const hasFullReport = Boolean(latestEntry?.fullReport);
  const gitSourceSummary = monthlySummary.sourceSummaries.find((source) => source.sourceId === "git");
  const manualSourceSummary = monthlySummary.sourceSummaries.find((source) => source.sourceId === "manual");

  return (
    <main className="grain flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-6 lg:px-10">
        <section className="overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_22px_80px_rgba(79,56,34,0.12)] sm:rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
              <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                    AI DAILY RETROSPECTIVE
                  </p>
                  <h1 className="max-w-2xl text-[clamp(2rem,8vw,3.25rem)] font-semibold tracking-tight text-foreground leading-tight">
                    把今天说清楚，再把明天想明白。
                  </h1>
                </div>
                <div className="inline-flex w-fit rounded-full border border-line bg-white/80 px-3 py-1.5 text-xs text-ink-soft sm:px-4 sm:py-2 sm:text-sm">
                  MVP · 单人复盘
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-ink-soft sm:text-base sm:leading-8">
                支持文字与语音转文字输入，自动整理出结构化复盘表格，
                对比上一条记录，给出今日评分、评价和明日建议。
              </p>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
                {[
                  ["输入", "今日完成、高光、问题、明日计划"],
                  ["分析", "结构化表格 + 对比 + 评分"],
                  ["沉淀", "为履历与性格分析预留扩展位"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-[1.25rem] border border-line bg-white/80 p-3.5 backdrop-blur sm:rounded-[1.5rem] sm:p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line bg-[#efe2cf] px-5 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l lg:px-8">
              <div className="rounded-[1.5rem] border border-[#cfae86] bg-[#fff8ef] p-4 shadow-[0_16px_32px_rgba(131,74,39,0.08)] sm:rounded-[1.75rem] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-deep">
                      最新复盘记录
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground sm:text-xl">
                      {latestEntry ? formatDate(latestEntry.createdAt) : "暂无记录"}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                    语音转文字待接入
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm sm:mt-5">
                  {INPUT_FIELDS.map((field) => (
                    <div key={field.key} className="rounded-[1rem] bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">
                        {field.label}
                      </p>
                      <p className="mt-2 leading-6 text-foreground">
                        {latestEntry?.[field.key] || "暂无内容"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:rounded-[2rem] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                  数据源插件
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  内部插件化采集
                </h2>
              </div>
              <span className="w-fit rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-soft">
                {month}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {[
                {
                  title: "Git 代码",
                  text: "读取当前仓库提交、分支、文件变更和未提交状态。",
                  status: gitSourceSummary ? `${gitSourceSummary.itemCount} 条` : "未读取",
                  action: collectGitData,
                  disabled: isCollectingGit,
                  button: isCollectingGit ? "读取中..." : "同意并读取",
                },
                {
                  title: "手动输入",
                  text: "你提交的复盘会自动进入本月归纳池。",
                  status: manualSourceSummary ? `${manualSourceSummary.itemCount} 条` : "等待输入",
                  action: undefined,
                  disabled: true,
                  button: "已启用",
                },
                {
                  title: "聊天 / 浏览",
                  text: "保留插件位。读取前会单独做授权确认。",
                  status: "待接入",
                  action: undefined,
                  disabled: true,
                  button: "规划中",
                },
              ].map((source) => (
                <div
                  key={source.title}
                  className="grid gap-3 rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:rounded-[1.5rem]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{source.title}</p>
                      <span className="rounded-full bg-[#f3e1cf] px-2.5 py-1 text-xs font-semibold text-accent-deep">
                        {source.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{source.text}</p>
                  </div>
                  <button
                    type="button"
                    disabled={source.disabled}
                    onClick={source.action}
                    className="inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                  >
                    {source.button}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:rounded-[2rem] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                  月份档案
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  {monthlySummary.headline}
                </h2>
              </div>
              <button
                type="button"
                disabled={isSummarizingMonth}
                onClick={generateMonthlySummary}
                className="inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSummarizingMonth ? "归纳中..." : "刷新归纳"}
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-ink-soft">{monthlySummary.narrative}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["数据量", `${monthlySummary.itemCount} 条`],
                ["来源数", `${monthlySummary.sourceSummaries.length} 个`],
                ["最近采集", monthlyItems.at(-1)?.collectedAt ? formatDate(monthlyItems.at(-1)?.collectedAt ?? "") : "暂无"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1rem] border border-line bg-[#fffdf8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:rounded-[1.5rem]">
                <p className="text-sm font-semibold text-foreground">本月主题</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  {(monthlySummary.keyThemes.length ? monthlySummary.keyThemes : ["等待更多数据形成主题。"]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:rounded-[1.5rem]">
                <p className="text-sm font-semibold text-foreground">下月关注</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  {monthlySummary.nextMonthFocus.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:rounded-[2rem] sm:p-8">
            <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                  复盘录入区
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  手动输入已打通，提交后会保存并刷新最新记录
                </h2>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              {INPUT_FIELDS.map((field) => (
                <label key={field.key} className="grid gap-2">
                  <span className="text-sm font-semibold text-foreground">{field.label}</span>
                  <textarea
                    className="min-h-24 resize-none rounded-[1.25rem] border border-line bg-[#fffdf8] px-4 py-3.5 text-base leading-7 text-foreground outline-none transition focus:border-accent sm:min-h-28 sm:rounded-[1.5rem] sm:text-sm"
                    placeholder={`在这里填写${field.label}`}
                    value={form[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                </label>
              ))}

                <div className="grid gap-4 rounded-[1.25rem] border border-line bg-white/70 p-4 sm:rounded-[1.5rem]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">AI 连接设置</p>
                      <p className="mt-1 text-xs leading-5 text-ink-soft">
                        密钥保存在后端环境变量，不会随请求暴露，可在 `.env.local` 中替换。
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f3e1cf] px-3 py-1 text-xs font-semibold text-accent-deep">
                      后端配置
                    </span>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">供应商</span>
                    <select
                      className="rounded-[1rem] border border-line bg-[#fffdf8] px-4 py-3.5 text-base text-foreground outline-none transition focus:border-accent"
                      value={provider}
                      onChange={(event) => {
                        const nextProvider = event.target.value;
                        setProvider(nextProvider);
                        setModel(PROVIDER_MODEL_OPTIONS[nextProvider]?.[0]?.value ?? DEFAULT_AI_MODEL);
                      }}
                    >
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">模型</span>
                    <select
                      className="rounded-[1rem] border border-line bg-[#fffdf8] px-4 py-3.5 text-base text-foreground outline-none transition focus:border-accent"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    >
                      {availableModels.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
                >
                  {isSubmitting ? "提交中..." : "提交本次复盘"}
                </button>
                {message ? <p className="text-sm text-sage">{message}</p> : null}
                {error ? <p className="text-sm text-[#b2442f]">{error}</p> : null}
              </div>
            </form>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.75rem] border border-line bg-[#182226] p-5 text-white shadow-[0_16px_48px_rgba(24,34,38,0.18)] sm:rounded-[2rem] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#e6b58c]">
                      AI 输出看板
                    </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    今日评价与上次相比
                  </h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  {latestEntry?.analysisProvider === "openrouter"
                    ? "OpenRouter"
                    : latestEntry?.analysisProvider === "openai"
                      ? "OpenAI"
                      : "本地兜底"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-white/6 p-4 sm:rounded-[1.5rem]">
                  <p className="text-sm font-semibold">今日评价</p>
                  <p className="mt-3 text-sm leading-7 text-white/74 sm:text-[15px]">
                    {getTodayEvaluation()}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-white/6 p-4 sm:rounded-[1.5rem]">
                  <p className="text-sm font-semibold">和上次相比</p>
                  <p className="mt-3 text-sm leading-7 text-white/74 sm:text-[15px]">
                    {getComparisonSummary()}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/4 p-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.5rem]">
                <div>
                  <p className="text-sm font-semibold">今日评分</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{getScoreLabel()}</p>
                </div>
                {hasFullReport && latestEntry ? (
                  <Link
                    href={`/report/${latestEntry.id}`}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
                  >
                    查看完整报告
                  </Link>
                ) : null}
              </div>

              {latestEntry?.nextActions?.length ? (
                <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/4 p-4 sm:mt-5 sm:rounded-[1.5rem]">
                  <p className="text-sm font-semibold">明日建议</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-white/74">
                    {latestEntry.nextActions.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:rounded-[2rem] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                后续扩展坑位
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  "补充个人履历/背景信息，增强建议的上下文感知",
                  "引入性格画像或工作风格标签，形成更个性化的反馈",
                  "从“上一条对比”扩展到“多日趋势观察”",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1rem] border border-dashed border-line bg-[#fbf6ed] px-4 py-3 text-sm leading-6 text-ink-soft sm:rounded-[1.25rem]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
