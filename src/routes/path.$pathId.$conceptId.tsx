import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { conceptMastery, gradeCard, markStudied, useAppState } from "@/lib/learning-store";
import { formatDue, schedule, type Grade } from "@/lib/srs";
import { askTutor, gradeExplanation } from "@/lib/tutor.functions";

export const Route = createFileRoute("/path/$pathId/$conceptId")({
  head: () => ({
    meta: [
      { title: "Learn a Concept — SynapseAI" },
      {
        name: "description",
        content:
          "Adaptive explanation, analogy, misconception check, free recall grading and instant scheduling into your review queue.",
      },
      { property: "og:title", content: "Learn a Concept — SynapseAI" },
      {
        property: "og:description",
        content: "Adaptive explanations, free-recall grading and automatic review scheduling.",
      },
    ],
  }),
  component: ConceptPage,
});

const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: 0, label: "Forgot", tone: "border-destructive/50 text-destructive hover:bg-destructive/10" },
  { grade: 1, label: "Hard", tone: "border-accent/50 text-accent hover:bg-accent/10" },
  { grade: 2, label: "Good", tone: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: 3, label: "Easy", tone: "border-success/50 text-success hover:bg-success/10" },
];

function ConceptPage() {
  const { pathId, conceptId } = Route.useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const ask = useServerFn(askTutor);
  const grade = useServerFn(gradeExplanation);

  const [question, setQuestion] = useState("");
  const [answerThread, setAnswerThread] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const [recall, setRecall] = useState("");
  const [feedback, setFeedback] = useState<{
    score: number;
    verdict: string;
    missing: string[];
  } | null>(null);
  const [grading, setGrading] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const path = state.paths.find((p) => p.id === pathId);
  const concept = path?.concepts.find((c) => c.id === conceptId);

  if (!path || !concept) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold">Concept not found</h1>
          <Button asChild className="mt-5">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const mastery = conceptMastery(concept);
  const card = concept.cards[cardIndex];
  const index = path.concepts.findIndex((c) => c.id === conceptId);
  const next = path.concepts[index + 1];

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 2 || !concept) return;
    setAsking(true);
    const q = question.trim();
    setQuestion("");
    try {
      const res = await ask({
        data: {
          concept: concept.title,
          explanation: concept.explanation,
          question: q,
          mastery,
        },
      });
      setAnswerThread((t) => [...t, { q, a: res.answer }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tutor unavailable");
    } finally {
      setAsking(false);
    }
  }

  async function onGradeRecall() {
    if (recall.trim().length < 10 || !concept) return;
    setGrading(true);
    try {
      const res = await grade({
        data: {
          concept: concept.title,
          question: `Explain ${concept.title} in your own words.`,
          correctAnswer: concept.explanation,
          learnerAnswer: recall.trim(),
        },
      });
      setFeedback(res);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grade your answer");
    } finally {
      setGrading(false);
    }
  }

  function onGradeCard(g: Grade) {
    if (!card) return;
    gradeCard(path!.id, concept!.id, card.id, g);
    setPicked(null);
    if (cardIndex + 1 < concept!.cards.length) setCardIndex(cardIndex + 1);
    else toast.success("Concept scheduled into your review queue");
  }

  return (
    <AppShell>
      <Link
        to="/path/$pathId"
        params={{ pathId: path.id }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {path.title}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="surface rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-primary">
              <span>Concept {index + 1}</span>
              <span>Difficulty {concept.difficulty}/5</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{concept.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{concept.summary}</p>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
              {concept.explanation.split(/\n+/).map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Lightbulb className="size-4" /> Analogy
                </div>
                <p className="text-sm text-muted-foreground">{concept.analogy}</p>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <div className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  <AlertTriangle className="size-4" /> Common misconception
                </div>
                <p className="text-sm text-muted-foreground">{concept.misconception}</p>
              </div>
            </div>
          </section>

          <section className="surface rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Free recall</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explain this concept from memory. Retrieval practice builds far stronger traces than
              re-reading.
            </p>
            <Textarea
              value={recall}
              onChange={(e) => setRecall(e.target.value)}
              rows={5}
              placeholder={`Explain ${concept.title} in your own words…`}
              className="mt-4"
            />
            <Button onClick={onGradeRecall} disabled={grading || recall.trim().length < 10} className="mt-3">
              {grading ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" />}
              Get AI feedback
            </Button>
            {feedback ? (
              <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
                <div className="font-display text-2xl font-semibold text-gradient">
                  {feedback.score}/100
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{feedback.verdict}</p>
                {feedback.missing.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {feedback.missing.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Check & schedule</h2>
            {card ? (
              <>
                <p className="mt-3 text-sm font-medium">{card.question}</p>
                <div className="mt-3 space-y-2">
                  {card.choices.map((choice, i) => {
                    const show = picked !== null;
                    return (
                      <button
                        key={choice}
                        disabled={show}
                        onClick={() => setPicked(i)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all disabled:cursor-default ${
                          show && i === card.correctIndex
                            ? "border-success bg-success/10"
                            : show && picked === i
                              ? "border-destructive bg-destructive/10"
                              : "border-border hover:border-primary/60"
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {picked !== null ? (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground">{card.answer}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {GRADES.map((g) => (
                        <button
                          key={g.grade}
                          onClick={() => onGradeCard(g.grade)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${g.tone}`}
                        >
                          {g.label}
                          <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                            {formatDue(schedule(card.srs, g.grade))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Card {cardIndex + 1} of {concept.cards.length}
                  </p>
                )}
              </>
            ) : null}

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  markStudied(path.id, concept.id);
                  if (next) {
                    setCardIndex(0);
                    setPicked(null);
                    setFeedback(null);
                    setRecall("");
                    setAnswerThread([]);
                    navigate({
                      to: "/path/$pathId/$conceptId",
                      params: { pathId: path.id, conceptId: next.id },
                    });
                  } else {
                    navigate({ to: "/path/$pathId", params: { pathId: path.id } });
                  }
                }}
              >
                {next ? "Next concept" : "Finish path"} <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>

          <section className="surface rounded-2xl p-6">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <MessageCircleQuestion className="size-4 text-primary" /> Ask your tutor
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Answers adapt to your current mastery ({Math.round(mastery * 100)}%).
            </p>
            <div className="mt-4 space-y-4">
              {answerThread.map((entry) => (
                <div key={entry.q} className="space-y-2">
                  <p className="rounded-lg bg-secondary px-3 py-2 text-sm">{entry.q}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{entry.a}</p>
                </div>
              ))}
            </div>
            <form onSubmit={onAsk} className="mt-4 flex gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="Why does this work?"
              />
              <Button type="submit" size="icon" disabled={asking} className="h-auto">
                {asking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  );
}