import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { z } from "zod";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export const TUTOR_MODEL = "google/gemini-2.5-flash";

export function tutorModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");
  return createLovableAiGatewayProvider(key)(TUTOR_MODEL);
}

/** Stream a completion and return the full text (avoids long buffered calls). */
export async function streamToText(options: { system: string; prompt: string }) {
  const result = streamText({ model: tutorModel(), ...options });
  return await result.text;
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? raw).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI response was not valid JSON.");
  return body.slice(start, end + 1);
}

/** Ask for JSON, tolerate fences/prose, and validate with Zod. */
export async function generateJson<S extends z.ZodTypeAny>(options: {
  system: string;
  prompt: string;
  schema: S;
}): Promise<z.infer<S>> {
  const text = await streamToText({
    system: `${options.system}\n\nReply with a single raw JSON object only. No markdown, no commentary.`,
    prompt: options.prompt,
  });
  return options.schema.parse(JSON.parse(extractJson(text)));
}