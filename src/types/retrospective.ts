export type RetrospectiveInput = {
  todayWhatIDid: string;
  highlightMoment: string;
  whatWentWrong: string;
  tomorrowPlan: string;
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
  profileContext?: string;
  personalityNotes?: string;
  comparisonSummary?: string;
  todayEvaluation?: string;
  fullReport?: string;
  nextActions?: string[];
  score?: RetrospectiveScore;
  analysisStatus?: "complete" | "fallback";
  analysisProvider?: "openai" | "local";
  analysisModel?: string;
  analysisUpdatedAt?: string;
};
