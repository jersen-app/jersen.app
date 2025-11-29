import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Provider types
export type AIProvider = "gemini" | "openai" | "anthropic";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIGenerateOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Provider configurations
const PROVIDER_CONFIG = {
  gemini: {
    defaultModel: "gemini-2.0-flash-exp",
    apiKey: process.env.GEMINI_API_KEY,
  },
  openai: {
    defaultModel: "gpt-4-turbo",
    apiKey: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    defaultModel: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
};

/**
 * Generate text using AI
 */
export async function generateText(
  messages: AIMessage[],
  options: AIGenerateOptions = {}
): Promise<string> {
  const provider = options.provider || "gemini";

  switch (provider) {
    case "gemini":
      return generateWithGemini(messages, options);
    case "openai":
      throw new Error("OpenAI not implemented yet");
    case "anthropic":
      throw new Error("Anthropic not implemented yet");
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Generate with Gemini
 */
async function generateWithGemini(
  messages: AIMessage[],
  options: AIGenerateOptions
): Promise<string> {
  const apiKey = PROVIDER_CONFIG.gemini.apiKey;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: options.model || PROVIDER_CONFIG.gemini.defaultModel,
  });

  // Convert messages to Gemini format
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const history = conversationMessages.slice(0, -1).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemMessage?.content,
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 8192,
    },
  });

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response.text();

  return response;
}

/**
 * Stream text generation (for chat UI)
 */
export async function* streamText(
  messages: AIMessage[],
  options: AIGenerateOptions = {}
): AsyncGenerator<string> {
  const provider = options.provider || "gemini";

  if (provider !== "gemini") {
    throw new Error(`Streaming not implemented for ${provider} yet`);
  }

  const apiKey = PROVIDER_CONFIG.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: options.model || PROVIDER_CONFIG.gemini.defaultModel,
  });

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const history = conversationMessages.slice(0, -1).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemMessage?.content,
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 8192,
    },
  });

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    yield text;
  }
}
