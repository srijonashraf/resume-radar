import OpenAI from "openai";
import { z } from "zod";
import { ExternalServiceError } from "../errors";

// ==================== CLIENT SETUP ====================

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
const model = process.env.OPENAI_MODEL || "openrouter/free";

if (!apiKey) {
  throw new ExternalServiceError(
    "OPENAI_API_KEY environment variable is required",
  );
}

const client = new OpenAI({
  apiKey,
  baseURL,
});

export const MODEL: string = model;

// ==================== UTILITY FUNCTIONS ====================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiResult<T> {
  data: T;
  usage: TokenUsage;
  metadata?: {
    [key: string]: unknown;
  };
}

const cleanJSON = (text: string): string => {
  let cleaned = text.trim();

  // Strip <thought>...</thought> blocks (thinking model output)
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");

  // Strip markdown code blocks
  cleaned = cleaned.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "");

  // Extract outermost JSON object if surrounded by extra text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Remove JS-style comments (not inside strings)
  cleaned = cleaned.replace(/\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return cleaned.trim();
};

const generateJson = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxTokens = 17000,
  retryCount = 0,
): Promise<AiResult<T>> => {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  const finishReason = completion.choices[0]?.finish_reason;
  const text = completion.choices[0]?.message?.content;

  const usage: TokenUsage = {
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
  };

  if (!text) {
    throw new ExternalServiceError("AI returned empty response", {
      details: { model: MODEL, finishReason },
    });
  }

  if (finishReason === "length") {
    throw new ExternalServiceError(
      "AI response truncated (max_tokens reached)",
      { details: { model: MODEL } },
    );
  }

  const cleaned = cleanJSON(text);

  const parseAndValidate = (): T => {
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  };

  try {
    const data = parseAndValidate();
    return { data, usage };
  } catch (parseError) {
    if (retryCount < 1) {
      console.warn(
        `JSON parse/validation failed for model ${MODEL}. Retrying (attempt ${retryCount + 1})...`,
      );
      return generateJson(prompt, schema, maxTokens, retryCount + 1);
    }

    console.error(
      `JSON parse/validation failed after retry for model ${MODEL}. Raw response (first 500 chars):`,
      text.slice(0, 500),
    );
    throw new ExternalServiceError(
      "AI response validation failed after retry",
      { details: { model: MODEL, cause: parseError } },
    );
  }
};

// ==================== TOOL CALLING ====================

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export async function callTool<T>(
  messages: OpenAI.ChatCompletionMessageParam[],
  tools: ToolDefinition[],
  targetTool: string,
  schema: z.ZodSchema<T>,
  maxRetries: number = 1,
): Promise<AiResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: { type: "function", function: { name: targetTool } },
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new ExternalServiceError("No response from AI model");
      }

      const toolCalls = message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        throw new ExternalServiceError("No tool calls in AI response");
      }

      const targetCall = toolCalls.find(
        (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall =>
          tc.type === "function" && tc.function.name === targetTool,
      );
      if (!targetCall) {
        const names = toolCalls
          .filter(
            (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall =>
              tc.type === "function",
          )
          .map((tc) => tc.function.name)
          .join(", ");
        throw new ExternalServiceError(
          `Expected tool call '${targetTool}' but got: ${names || "none"}`,
        );
      }

      const rawArgs = targetCall.function.arguments;
      const parsed = JSON.parse(rawArgs);
      const validated = schema.parse(parsed);

      return {
        data: validated,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof z.ZodError) {
        throw new ExternalServiceError(
          `AI tool call '${targetTool}' returned invalid data: ${error.message}`,
        );
      }

      if (error instanceof ExternalServiceError) {
        if (attempt === maxRetries) throw error;
      }

      if (attempt === maxRetries) {
        throw new ExternalServiceError(
          `AI tool call '${targetTool}' failed after ${attempt + 1} attempts: ${lastError.message}`,
        );
      }
    }
  }

  throw new ExternalServiceError(
    `AI tool call '${targetTool}' failed: ${lastError?.message}`,
  );
}
