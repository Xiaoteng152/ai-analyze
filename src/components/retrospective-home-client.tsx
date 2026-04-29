"use client";

import { useState } from "react";

import type { RetrospectiveEntry, RetrospectiveInput } from "@/types/retrospective";

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function RetrospectiveHomeClient({
  initialLatestEntry,
  initialPreviousEntry,
}: {
  initialLatestEntry: RetrospectiveEntry | null;
  initialPreviousEntry: RetrospectiveEntry | null;
}) {
  const [form, setForm] = useState<RetrospectiveInput>(EMPTY_FORM);
  const [latestEntry, setLatestEntry] = useState<RetrospectiveEntry | null>(initialLatestEntry);
  const [previousEntry, setPreviousEntry] = useState<RetrospectiveEntry | null>(initialPreviousEntry);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        body: JSON.stringify(form),
      });

      const payload = (await res.json()) as ApiResponse<RetrospectiveEntry>;
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "提交失败，请稍后重试");
        return;
      }

      await loadCompareLatest();
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

  const compareLines = buildCompareLines();

  return (
    <main className="grain flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_22px_80px_rgba(79,56,34,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                    AI DAILY RETROSPECTIVE
                  </p>
                  <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    把今天说清楚，再把明天想明白。
                  </h1>
                </div>
                <div className="hidden rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-ink-soft lg:block">
                  MVP · 单人复盘
                </div>
              </div>

              <p className="max-w-2xl text-base leading-8 text-ink-soft sm:text-lg">
                支持文字与语音转文字输入，自动整理出结构化复盘表格，
                对比上一条记录，给出今日评分、评价和明日建议。
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ["输入", "今日完成、高光、问题、明日计划"],
                  ["分析", "结构化表格 + 对比 + 评分"],
                  ["沉淀", "为履历与性格分析预留扩展位"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-[1.5rem] border border-line bg-white/80 p-4 backdrop-blur"
                  >
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line bg-[#efe2cf] px-6 py-8 sm:px-10 lg:border-t-0 lg:border-l lg:px-8">
              <div className="rounded-[1.75rem] border border-[#cfae86] bg-[#fff8ef] p-5 shadow-[0_16px_32px_rgba(131,74,39,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent-deep">
                      最新复盘记录
                    </p>
                    <p className="mt-2 text-xl font-semibold text-foreground">
                      {latestEntry ? formatDate(latestEntry.createdAt) : "暂无记录"}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                    语音转文字待接入
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  {INPUT_FIELDS.map((field) => (
                    <div key={field.key} className="rounded-2xl bg-white p-3">
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

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:p-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
                  复盘录入区
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  手动输入已打通，提交后会保存并刷新最新记录
                </h2>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              {INPUT_FIELDS.map((field) => (
                <label key={field.key} className="grid gap-2">
                  <span className="text-sm font-semibold text-foreground">{field.label}</span>
                  <textarea
                    className="min-h-28 resize-none rounded-[1.5rem] border border-line bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-accent"
                    placeholder={`在这里填写${field.label}`}
                    value={form[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                </label>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "提交中..." : "提交本次复盘"}
                </button>
                {message ? <p className="text-sm text-sage">{message}</p> : null}
                {error ? <p className="text-sm text-[#b2442f]">{error}</p> : null}
              </div>
            </form>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-line bg-[#182226] p-6 text-white shadow-[0_16px_48px_rgba(24,34,38,0.18)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#e6b58c]">
                    AI 输出看板
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    下一步接入评分、评价与对比逻辑
                  </h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  临时评分规则
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white/6 p-4">
                  <p className="text-sm font-semibold">今日评价</p>
                  <p className="mt-3 text-sm leading-7 text-white/74">
                    当前阶段已完成数据模型、存储与提交链路，后续可以在这个区域接入 AI 总结输出。
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-white/6 p-4">
                  <p className="text-sm font-semibold">和上次相比</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-white/74">
                    {compareLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:p-8">
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
                    className="rounded-[1.25rem] border border-dashed border-line bg-[#fbf6ed] px-4 py-3 text-sm leading-6 text-ink-soft"
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
