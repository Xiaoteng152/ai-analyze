import Link from "next/link";
import { notFound } from "next/navigation";

import { getEntryById } from "@/lib/retrospective-store";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <main className="grain min-h-screen px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
              完整报告
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:mt-3 sm:text-3xl">
              {formatDate(entry.createdAt)}
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent sm:w-auto"
          >
            返回首页
          </Link>
        </div>

        <section className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:rounded-[2rem] sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:rounded-[1.5rem]">
              <p className="text-sm font-semibold text-foreground">今日评价</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
                {entry.todayEvaluation || "暂无 AI 评价"}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:rounded-[1.5rem]">
              <p className="text-sm font-semibold text-foreground">和上次相比</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
                {entry.comparisonSummary || "暂无对比摘要"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 sm:mt-6">
            <div className="rounded-[1.25rem] border border-line bg-[#182226] p-4 text-white sm:rounded-[1.5rem]">
              <p className="text-sm font-semibold">评分</p>
              <p className="mt-3 text-2xl font-semibold sm:text-3xl">
                {entry.score ? `${entry.score.value}/${entry.score.scale === "5" ? 5 : 100}` : "暂无"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {entry.score?.rationale || "暂无评分说明"}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-line bg-[#fffdf8] p-4 sm:rounded-[1.5rem]">
              <p className="text-sm font-semibold text-foreground">明日建议</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                {(entry.nextActions?.length ? entry.nextActions : [entry.tomorrowPlan]).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-dashed border-line bg-[#fbf6ed] p-4 sm:mt-6 sm:rounded-[1.5rem]">
            <p className="text-sm font-semibold text-foreground">完整报告</p>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
              {entry.fullReport || "暂无完整报告"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4 sm:mt-6">
            {[
              ["今天做了什么", entry.todayWhatIDid],
              ["高光时刻", entry.highlightMoment],
              ["做得不好的地方", entry.whatWentWrong],
              ["明天准备做什么", entry.tomorrowPlan],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1rem] border border-line bg-white p-4 sm:rounded-[1.25rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">{label}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
