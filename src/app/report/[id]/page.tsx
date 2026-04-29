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
    <main className="grain min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
              完整报告
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {formatDate(entry.createdAt)}
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            返回首页
          </Link>
        </div>

        <section className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_12px_48px_rgba(79,56,34,0.08)] sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-line bg-[#fffdf8] p-4">
              <p className="text-sm font-semibold text-foreground">今日评价</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
                {entry.todayEvaluation || "暂无 AI 评价"}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-line bg-[#fffdf8] p-4">
              <p className="text-sm font-semibold text-foreground">和上次相比</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
                {entry.comparisonSummary || "暂无对比摘要"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-line bg-[#182226] p-4 text-white">
              <p className="text-sm font-semibold">评分</p>
              <p className="mt-3 text-3xl font-semibold">
                {entry.score ? `${entry.score.value}/${entry.score.scale === "5" ? 5 : 100}` : "暂无"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {entry.score?.rationale || "暂无评分说明"}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-line bg-[#fffdf8] p-4">
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

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-line bg-[#fbf6ed] p-4">
            <p className="text-sm font-semibold text-foreground">完整报告</p>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
              {entry.fullReport || "暂无完整报告"}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ["今天做了什么", entry.todayWhatIDid],
              ["高光时刻", entry.highlightMoment],
              ["做得不好的地方", entry.whatWentWrong],
              ["明天准备做什么", entry.tomorrowPlan],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.25rem] border border-line bg-white p-4">
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
