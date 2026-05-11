export const DEFAULT_TREND_LOOKBACK_DAYS = 7;
export const MAX_PROFILE_LENGTH = 4000;
export const MAX_WORK_STYLE_TAGS = 12;

export const WORK_STYLE_PRESET_LABELS = [
  "深度工作偏好",
  "多任务切换型",
  "偏完美主义",
  "快速迭代型",
  "内向深度思考",
  "协作驱动型",
  "晨型人",
  "夜猫子型",
] as const;

export type UserContextState = {
  profileBackground: string;
  workStyleTags: string[];
  trendLookbackDays: number;
  updatedAt?: string;
};
