import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Flame, Lightbulb, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { dueCards, gradeCard, useAppState } from "@/lib/learning-store";
import { formatDue, schedule, type Grade } from "@/lib/srs";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Spaced Repetition Review — SynapseAI" },
      {
        name: "description",
        content:
          "Review the concepts your memory is about to forget. An SM-2 style scheduler picks the perfect moment for each item.",
      },
      { property: "og:title", content: "Spaced Repetition Review — SynapseAI" },
      {
        property: "og:description",
        content: "Review concepts right before you forget them, scheduled by an adaptive algorithm.",
      },
    ],
  }),
  component: ReviewPage,
});

const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: 0, label: "Forgot", tone: "border-destructive/50 text-destructive hover:bg-destructive/10" },
  { grade: 1, label: "Hard", tone: "border-accent/50 text-accent hover:bg-accent/10" },
  { grade: 2, label: "Good", tone: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: 3, label: "Easy", tone: "border-success/50 text-success hover:bg-success/10" },
];

function ReviewPage() {
  const state = useAppState();
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const queue = useMemo(() => dueCards(state), [state]);
  const current = queue[0];

  if (!current) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-lg rounded-2xl p-10 text-center">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 text-2xl font-semibold">
            {done > 0 ? "Session complete" : "Nothing due right now"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done > 0
              ? `You reviewed ${done} item${done === 1 ? "" : "s"}. Each one was pushed further into the future — exactly when your recall is predicted to dip.`
              : "Your memory is fresh. Study a new concept, and it will be scheduled for review automatically."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link to="/">Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/new">New path</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const { card, concept, path } = current;

  function onGrade(grade: Grade) {
    gradeCard(path.id, concept.id, card.id, grade);
    setDone((d) => d + 1);
    setRevealed(false);
    setPicked(null);
    if (grade >= 2) toast.success("+XP · scheduled further out");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Flame className="size-4 text-accent" /> {queue.length} due · {done} done
          </span>
          <span>{path.title}</span>
        </div>

        <div className="surface mt-4 rounded-2xl p-6 sm:p-8">
          <div className="text-xs uppercase tracking-widest text-primary">{concept.title}</div>
          <h1 className="mt-3 text-2xl font-semibold leading-snug">{card.question}</h1>

          <div className="mt-6 space-y-2">
            {card.choices.map((choice, index) => {
              const isCorrect = index === card.correctIndex;
              const show = picked !== null;
              return (
                <button
                  key={choice}
                  disabled={show}
                  onClick={() => {
                    setPicked(index);
                    setRevealed(true);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all disabled:cursor-default ${
                    show && isCorrect
                      ? "border-success bg-success/10"
                      : show && picked === index
                        ? "border-destructive bg-destructive/10"
                        : "border-border hover:border-primary/60 hover:bg-secondary/50"
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {!revealed ? (
            <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="size-3.5 text-accent" /> {card.hint}
            </p>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <div className="mb-1 inline-flex items-center gap-2 font-medium">
                <Sparkles className="size-4 text-primary" /> Why
              </div>
              <p className="text-muted-foreground">{card.answer}</p>
            </div>
          )}

          {revealed ? (
            <>
              <p className="mt-6 text-xs text-muted-foreground">
                How well did you recall this? Your answer sets the next interval.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    onClick={() => onGrade(g.grade)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${g.tone}`}
                  >
                    {g.label}
                    <span className="mt-0.5 block text-[11px] font-normal opacity-70">
                      {formatDue(schedule(card.srs, g.grade))}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}