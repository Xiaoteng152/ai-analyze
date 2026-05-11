import type {
  RetrospectiveEntry,
  RetrospectiveInput,
  RetrospectiveScore,
} from "@/types/retrospective";
import { config, getProviderConfig, type AnalysisProvider } from "@/lib/config";
import { createChatCompletion } from "@/lib/ai-client";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const DEFAULT_AI_MODEL = config.openrouterModel;
export const DEFAULT_AI_PROVIDER: AnalysisProvider = config.defaultAnalysisProvider;

export type RetrospectiveAnalysis = {
  todayEvaluation: string;
  comparisonSummary: string;
  fullReport: string;
  nextActions: string[];
  score: RetrospectiveScore;
  analysisStatus: "complete" | "fallback";
  analysisProvider: AnalysisProvider | "local";
  analysisModel?: string;
};

export type RetrospectivePersonalization = {
  profileBackground?: string;
  workStyleTags?: string[];
  multiDayTrendText?: string;
};

type AnalysisOptions = {
  model?: string | null;
  provider?: AnalysisProvider | null;
  personalization?: RetrospectivePersonalization;
};

function stripMarkdownFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

function safeParseAnalysis(text: string): Partial<RetrospectiveAnalysis> | null {
  try {
    return JSON.parse(stripMarkdownFence(text)) as Partial<RetrospectiveAnalysis>;
  } catch {
    return null;
  }
}

function buildLocalAnalysis(
  current: RetrospectiveInput,
  previous: RetrospectiveEntry | null,
  personalization?: RetrospectivePersonalization
): RetrospectiveAnalysis {
  const currentPieces = [
    current.todayWhatIDid,
    current.highlightMoment,
    current.whatWentWrong,
    current.tomorrowPlan,
  ]
    .filter(Boolean)
    .map((value) => value.trim());

  const repeatIssue =
    previous?.whatWentWrong && current.whatWentWrong.includes(previous.whatWentWrong);
  const carryPlan =
    previous?.tomorrowPlan && current.todayWhatIDid.includes(previous.tomorrowPlan);

  const profileHint =
    personalization?.profileBackground?.trim() && personalization.profileBackground.trim().length > 0
      ? "结合你提供的个人背景，建议把产出与长期目标对齐。"
      : "";
  const styleHint =
    personalization?.workStyleTags && personalization.workStyleTags.length > 0
      ? `结合你的工作风格标签（${personalization.workStyleTags.join("、")}），注意节奏与能量分配。`
      : "";

  const todayEvaluation = `今天整体推进稳定，完成了${currentPieces[0] || "主要任务"}。${
    current.highlightMoment ? `亮点是${current.highlightMoment}。` : ""
  }${profileHint ? ` ${profileHint}` : ""}${styleHint ? ` ${styleHint}` : ""}`;

  let comparisonSummary = previous
    ? `${carryPlan ? "延续了上次计划。" : "计划承接还不够明显。"}${
        repeatIssue ? "上次问题仍有重复。" : "重复问题控制得更好。"
      }`
    : "这是第一条记录，后续会在第二条开始生成对比。";

  if (personalization?.multiDayTrendText?.trim()) {
    comparisonSummary = `${comparisonSummary} 多日趋势：${personalization.multiDayTrendText.trim()}`;
  }

  const scoreValue = Math.max(
    60,
    Math.min(
      95,
      60 +
        Math.min(current.todayWhatIDid.length, 80) * 0.25 +
        Math.min(current.highlightMoment.length, 40) * 0.2 +
        Math.min(current.tomorrowPlan.length, 50) * 0.2 -
        Math.min(current.whatWentWrong.length, 60) * 0.12
    )
  );

  return {
    todayEvaluation,
    comparisonSummary,
    fullReport: [
      "今日复盘",
      current.todayWhatIDid,
      "",
      "高光时刻",
      current.highlightMoment || "暂无",
      "",
      "问题与不足",
      current.whatWentWrong || "暂无",
      "",
      "明日建议",
      current.tomorrowPlan || "暂无",
      "",
      "对比摘要",
      comparisonSummary,
    ].join("\n"),
    nextActions: current.tomorrowPlan
      ? [current.tomorrowPlan, "把明日计划拆成 1-3 个可执行动作", "记录明天的结果，方便继续对比"]
      : ["补充明日计划", "把计划拆成可执行动作", "记录明天结果"],
    score: {
      value: Math.round(scoreValue),
      scale: "100",
      label: "临时评分",
      rationale: "根据今日输入完整度与与上次承接情况生成的临时分数。",
    },
    analysisStatus: "fallback",
    analysisProvider: "local",
  };
}

export async function generateRetrospectiveAnalysis(
  current: RetrospectiveInput,
  previous: RetrospectiveEntry | null,
  options: AnalysisOptions = {}
): Promise<RetrospectiveAnalysis> {
  const provider = options.provider ?? DEFAULT_AI_PROVIDER;
  const providerConfig = getProviderConfig(provider);
  const model = options.model?.trim() || (provider === "openai" ? config.openaiModel : config.openrouterModel);
  const personalization = options.personalization;

  if (!providerConfig.apiKey) {
    return buildLocalAnalysis(current, previous, personalization);
  }

  const prompt: ChatCompletionMessageParam = {
    role: "system",
    content:
      "你是一个中文每日复盘助手。请严格输出 JSON 对象，不要输出多余解释。字段必须包含 todayEvaluation, comparisonSummary, fullReport, nextActions, score。todayEvaluation 和 comparisonSummary 每个尽量控制在 100 字左右。score 是 0 到 100 的整数。nextActions 是 2 到 3 条简短中文建议。fullReport 可以更完整，但仍然要简洁有条理，适合二级页展示。若提供 userProfile、workStyleTags 或 multiDayTrendSummary，必须在评价与对比中自然融合这些上下文，但不要逐字复述隐私内容。",
  };

  const userPayload = {
    current,
    previous,
    userProfile: personalization?.profileBackground?.trim() || undefined,
    workStyleTags: personalization?.workStyleTags?.length ? personalization.workStyleTags : undefined,
    multiDayTrendSummary: personalization?.multiDayTrendText?.trim() || undefined,
  };
  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: JSON.stringify(userPayload),
  };

  try {
    const response = await createChatCompletion(
      provider,
      [prompt, userMessage],
      model
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return buildLocalAnalysis(current, previous, personalization);
    }

    const parsed = safeParseAnalysis(content);
    if (!parsed) {
      return buildLocalAnalysis(current, previous, personalization);
    }

    const fallback = buildLocalAnalysis(current, previous, personalization);

    return {
      todayEvaluation:
        typeof parsed.todayEvaluation === "string" && parsed.todayEvaluation.trim()
          ? parsed.todayEvaluation.trim()
          : fallback.todayEvaluation,
      comparisonSummary:
        typeof parsed.comparisonSummary === "string" && parsed.comparisonSummary.trim()
          ? parsed.comparisonSummary.trim()
          : fallback.comparisonSummary,
      fullReport:
        typeof parsed.fullReport === "string" && parsed.fullReport.trim()
          ? parsed.fullReport.trim()
          : fallback.fullReport,
      nextActions:
        Array.isArray(parsed.nextActions) && parsed.nextActions.length > 0
          ? parsed.nextActions.filter((item): item is string => typeof item === "string").slice(0, 3)
          : fallback.nextActions,
      score:
        parsed.score && typeof parsed.score.value === "number"
          ? {
              value: Math.max(0, Math.min(100, Math.round(parsed.score.value))),
              scale: parsed.score.scale === "5" || parsed.score.scale === "grade" ? parsed.score.scale : "100",
              label: parsed.score.label?.trim() || "AI 评分",
              rationale: parsed.score.rationale?.trim(),
            }
          : fallback.score,
      analysisStatus: "complete",
      analysisProvider: provider,
      analysisModel: model,
    };
  } catch {
    return buildLocalAnalysis(current, previous, personalization);
  }
}
