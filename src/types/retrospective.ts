export type RetrospectiveInput = {
  todayWhatIDid: string;
  highlightMoment: string;
  whatWentWrong: string;
  tomorrowPlan: string;
};

export type DataSourceId = "manual" | "git" | "chat" | "browser";

export type DataSourcePermission = {
  required: boolean;
  scope: string[];
  userConsentAt?: string;
};

export type CollectedItem = {
  id: string;
  sourceId: DataSourceId;
  sourceLabel: string;
  collectedAt: string;
  occurredAt: string;
  month: string;
  title: string;
  summary: string;
  rawText?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SourceSummary = {
  sourceId: DataSourceId;
  sourceLabel: string;
  itemCount: number;
  latestCollectedAt?: string;
  highlights: string[];
};

export type MonthlySummary = {
  id: string;
  month: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  sourceSummaries: SourceSummary[];
  headline: string;
  narrative: string;
  keyThemes: string[];
  wins: string[];
  risks: string[];
  nextMonthFocus: string[];
};

export type RetrospectiveScore = {
  value: number;
  scale: "100" | "5" | "grade";
  label?: string;
  rationale?: string;
};

export type RetrospectiveEntry = RetrospectiveInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputSource: "manual" | "voice_to_text";
  collectedItemIds?: string[];
  profileContext?: string;
  personalityNotes?: string;
  comparisonSummary?: string;
  todayEvaluation?: string;
  fullReport?: string;
  nextActions?: string[];
  score?: RetrospectiveScore;
  analysisStatus?: "complete" | "fallback";
  analysisProvider?: "openrouter" | "openai" | "local";
  analysisModel?: string;
  analysisUpdatedAt?: string;
};
