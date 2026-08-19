import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider, TUTOR_MODEL } from "./ai-gateway.server";

const CardSchema = z.object({
  question: z.string(),
  answer: z.string(),
  choices: z.array(z.string()),
  correctIndex: z.number(),
  hint: z.string().optional().default(""),
});

const ConceptSchema = z.object({
  title: z.string(),
  summary: z.string(),
  explanation: z.string(),
  analogy: z.string().optional().default(""),
  misconception: z.string().optional().default(""),
  difficulty: z.number().optional().default(3),
  prerequisites: z.array(z.string()).optional().default([]),
  cards: z.array(CardSchema).min(1),
});

const PathSchema = z.object({
  title: z.string(),
  description: z.string(),
  concepts: z.array(ConceptSchema).min(1),
});

export type GeneratedPath = z.infer<typeof PathSchema>;
export type GeneratedConcept = z.infer<typeof ConceptSchema>;

function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");
  return createLovableAiGatewayProvider(key);
}

const GenerateInput = z.object({
  topic: z.string().min(2).max(120),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.string().max(300).optional(),
});

export const generateLearningPath = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const result = await generateText({
      model: gateway()(TUTOR_MODEL),
      output: Output.object({ schema: PathSchema }),
      system:
        "You are an expert curriculum designer and cognitive-science-informed tutor. " +
        "You build tight, dependency-ordered concept maps. Explanations are vivid, concrete and free of filler. " +
        "Each concept must be atomic enough to be reviewed as a single memory item.",
      prompt:
        `Design an adaptive learning path on "${data.topic}" for a ${data.level} learner.` +
        (data.goal ? ` Their goal: ${data.goal}.` : "") +
        ` Return 5-7 concepts ordered by prerequisite dependency. For each concept give:` +
        ` a one-sentence summary, a 120-180 word explanation (markdown-free plain prose, may use short paragraphs),` +
        ` a memorable analogy, the single most common misconception, difficulty 1-5,` +
        ` prerequisite concept titles (from earlier concepts, may be empty),` +
        ` and 2-3 recall questions with 4 answer choices each plus a short hint and an ideal answer.`,
    });
    const out = result.output;
    return {
      ...out,
      concepts: out.concepts.map((concept) => ({
        ...concept,
        difficulty: Math.min(5, Math.max(1, Math.round(concept.difficulty))),
        cards: concept.cards
          .filter((card) => card.choices.length >= 2)
          .map((card) => ({
            ...card,
            correctIndex: Math.min(Math.max(0, card.correctIndex), card.choices.length - 1),
          })),
      })),
    };
  });

const ExplainInput = z.object({
  concept: z.string(),
  explanation: z.string(),
  question: z.string().min(2).max(500),
  mastery: z.number().min(0).max(1),
});

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExplainInput.parse(input))
  .handler(async ({ data }) => {
    const level =
      data.mastery < 0.34
        ? "The learner is a novice here: use simple language, one concrete example, and avoid jargon."
        : data.mastery < 0.7
          ? "The learner has partial understanding: reinforce the mental model and address edge cases."
          : "The learner is close to mastery: go deeper, connect to advanced or adjacent ideas.";

    const result = await generateText({
      model: gateway()(TUTOR_MODEL),
      system:
        "You are a warm, precise Socratic tutor. Answer in under 160 words, plain prose, no markdown headers. " +
        "End with one short question that checks understanding.",
      prompt: `Concept: ${data.concept}\nReference explanation: ${data.explanation}\n${level}\nLearner asks: ${data.question}`,
    });
    return { answer: await result.text };
  });

const FeedbackInput = z.object({
  concept: z.string(),
  question: z.string(),
  correctAnswer: z.string(),
  learnerAnswer: z.string(),
});

export const gradeExplanation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data }) => {
    const result = await generateText({
      model: gateway()(TUTOR_MODEL),
      output: Output.object({
        schema: z.object({
          score: z.number().min(0).max(100),
          verdict: z.string(),
          missing: z.array(z.string()).max(3),
        }),
      }),
      system:
        "You grade a learner's free-recall explanation. Be encouraging but honest. " +
        "Score 0-100 on conceptual accuracy and completeness.",
      prompt: `Concept: ${data.concept}\nPrompt: ${data.question}\nIdeal answer: ${data.correctAnswer}\nLearner wrote: ${data.learnerAnswer}\nGive a two-sentence verdict and up to 3 missing key points.`,
    });
    return result.output;
  });