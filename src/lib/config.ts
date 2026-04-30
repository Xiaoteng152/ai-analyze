export type AnalysisProvider = "openrouter" | "openai";

export const config = {
  defaultAnalysisProvider:
    process.env.AI_PROVIDER?.trim() === "openai" ? "openai" : "openrouter",
  openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() ?? "",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL?.trim() ?? "https://openrouter.fans/v1",
  openrouterModel: process.env.OPENROUTER_MODEL?.trim() ?? "deepseek-ai/DeepSeek-R1",
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1",
  openaiModel: process.env.OPENAI_MODEL?.trim() ?? "gpt-5.4",
} as const satisfies {
  defaultAnalysisProvider: AnalysisProvider;
  openrouterApiKey: string;
  openrouterBaseUrl: string;
  openrouterModel: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
};

export function getProviderConfig(provider: AnalysisProvider) {
  if (provider === "openai") {
    return {
      apiKey: config.openaiApiKey,
      baseUrl: config.openaiBaseUrl,
      defaultModel: config.openaiModel,
    };
  }

  return {
    apiKey: config.openrouterApiKey,
    baseUrl: config.openrouterBaseUrl,
    defaultModel: config.openrouterModel,
  };
}
