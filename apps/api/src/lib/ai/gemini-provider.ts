import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from "@google/genai";
import { env } from "../../config/env";
import { stringifySafe } from "../../utils/json";
import type {
  AiProvider,
  AiToolChoice,
  AiToolDefinition,
  ChooseToolInput,
  SummarizeInput,
} from "./provider";

/** Hard ceiling on a single model call so a hang never ties up a request slot. */
const REQUEST_TIMEOUT_MS = 25_000;

const TYPE_MAP = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
} as const;

/** Translate the neutral tool defs into Gemini function declarations. */
function toFunctionDeclarations(tools: AiToolDefinition[]): FunctionDeclaration[] {
  return tools.map((tool) => {
    const entries = Object.entries(tool.parameters);
    const declaration: FunctionDeclaration = { name: tool.name, description: tool.description };
    if (entries.length > 0) {
      declaration.parameters = {
        type: Type.OBJECT,
        properties: Object.fromEntries(
          entries.map(([name, param]) => [name, { type: TYPE_MAP[param.type], description: param.description }]),
        ),
      };
    }
    return declaration;
  });
}

/**
 * Google Gemini implementation of the AI provider, using the official
 * `@google/genai` SDK and Gemini's function-calling. The client is null when
 * GEMINI_API_KEY is absent, so the service can return a clean 503 instead of
 * crashing.
 */
export class GeminiProvider implements AiProvider {
  readonly providerName = "gemini";
  readonly model: string;
  private readonly client: GoogleGenAI | null;

  constructor() {
    this.model = env.AI_MODEL;
    this.client = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): GoogleGenAI {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return this.client;
  }

  async chooseTool({ system, question, tools, history }: ChooseToolInput): Promise<AiToolChoice> {
    const client = this.requireClient();
    const contents: Content[] = [
      ...(history ?? []).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: question }] },
    ];
    const response = await client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: system,
        temperature: 0,
        tools: [{ functionDeclarations: toFunctionDeclarations(tools) }],
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });

    const call = response.functionCalls?.find((candidate) => Boolean(candidate.name));
    if (call?.name) {
      return { toolCall: { name: call.name, args: (call.args as Record<string, unknown>) ?? {} }, text: "" };
    }
    return { toolCall: null, text: (response.text ?? "").trim() };
  }

  async summarizeToolResult({ system, question, tools, toolCall, toolResult }: SummarizeInput): Promise<string> {
    const client = this.requireClient();

    // Decimal/Date-safe plain JSON. Gemini's functionResponse must be an object,
    // so wrap arrays/primitives under `result`.
    const safe = JSON.parse(stringifySafe(toolResult)) as unknown;
    const responseObject: Record<string, unknown> =
      safe !== null && typeof safe === "object" && !Array.isArray(safe)
        ? (safe as Record<string, unknown>)
        : { result: safe };

    const contents: Content[] = [
      { role: "user", parts: [{ text: question }] },
      { role: "model", parts: [{ functionCall: { name: toolCall.name, args: toolCall.args } }] },
      { role: "user", parts: [{ functionResponse: { name: toolCall.name, response: responseObject } }] },
    ];

    const response = await client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: system,
        tools: [{ functionDeclarations: toFunctionDeclarations(tools) }],
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });

    return (response.text ?? "").trim();
  }
}
