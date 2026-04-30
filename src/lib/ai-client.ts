import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { getProviderConfig, type AnalysisProvider } from "@/lib/config";

const clientCache = new Map<AnalysisProvider, OpenAI>();

function getClient(provider: AnalysisProvider) {
  const cachedClient = clientCache.get(provider);
  if (cachedClient) {
    return cachedClient;
  }

  const providerConfig = getProviderConfig(provider);
  if (!providerConfig.apiKey) {
    throw new Error(`Missing API key for ${provider}`);
  }

  console.log(`[ai] Client initialized (${provider})`);
  const client = new OpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseUrl,
  });

  clientCache.set(provider, client);
  return client;
}

export function getChatModel(provider: AnalysisProvider) {
  return getProviderConfig(provider).defaultModel;
}

export async function createChatCompletion(
  provider: AnalysisProvider,
  messages: ChatCompletionMessageParam[],
  model?: string
) {
  return getClient(provider).chat.completions.create({
    model: model?.trim() || getChatModel(provider),
    messages,
    temperature: 0.4,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  });
}
