import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Sparkles, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { RingProgress } from "@/components/RingProgress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  conceptMastery,
  deletePath,
  pathMastery,
  useAppState,
  type Concept,
} from "@/lib/learning-store";
import { formatDue } from "@/lib/srs";

export const Route = createFileRoute("/path/$pathId")({
  head: () => ({
    meta: [
      { title: "Your Learning Path — SynapseAI" },
      {
        name: "description",
        content:
          "A prerequisite-ordered concept map with live mastery tracking and spaced review scheduling.",
      },
      { property: "og:title", content: "Your Learning Path — SynapseAI" },
      {
        property: "og:description",
        content: "A prerequisite-ordered concept map with live mastery and review scheduling.",
      },
    ],
  }),
  component: PathPage,
});

function masteryLabel(m: number) {
  if (m >= 0.8) return { text: "Mastered", tone: "text-success" };
  if (m >= 0.45) return { text: "Familiar", tone: "text-primary" };
  if (m > 0) return { text: "Learning", tone: "text-accent" };
  return { text: "New", tone: "text-muted-foreground" };
}

function PathPage() {
  const { pathId } = Route.useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const path = state.paths.find((p) => p.id === pathId);

  if (!path) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold">Path not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been removed from this device.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const mastery = pathMastery(path);
  const nextConcept: Concept | undefined =
    path.concepts.find((c) => c.unlocked && !c.studied) ??
    path.concepts.find((c) => c.unlocked && conceptMastery(c) < 0.8);

  return (
    <AppShell>
      <div className="surface flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-primary">{path.level} track</div>
          <h1 className="mt-2 text-3xl font-semibold">{path.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{path.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {nextConcept ? (
              <Button
                onClick={() =>
                  navigate({
                    to: "/path/$pathId/$conceptId",
                    params: { pathId: path.id, conceptId: nextConcept.id },
                  })
                }
              >
                Continue: {nextConcept.title} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/review">Review this path</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                deletePath(path.id);
                navigate({ to: "/" });
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
        <RingProgress
          value={mastery}
          label={`${Math.round(mastery * 100)}%`}
          sublabel="path mastery"
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Concept map</h2>
      <p className="text-sm text-muted-foreground">
        Concepts unlock as prerequisites are studied. Mastery is inferred from your recall history.
      </p>

      <ol className="mt-5 space-y-3">
        {path.concepts.map((concept, index) => {
          const m = conceptMastery(concept);
          const label = masteryLabel(m);
          const nextReview = concept.cards
            .filter((c) => c.srs.lastReviewedAt)
            .sort((a, b) => a.srs.dueAt - b.srs.dueAt)[0];

          const inner = (
            <div
              className={`surface flex items-center gap-4 rounded-2xl p-5 transition-all ${
                concept.unlocked ? "hover:border-primary/50 hover:glow" : "opacity-55"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary font-display text-sm">
                {concept.unlocked ? index + 1 : <Lock className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{concept.title}</h3>
                  <span className={`text-xs ${label.tone}`}>{label.text}</span>
                  {nextReview ? (
                    <span className="text-xs text-muted-foreground">
                      · review {formatDue(nextReview.srs)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{concept.summary}</p>
                <Progress value={m * 100} className="mt-3 h-1.5" />
              </div>
              <Sparkles className="hidden size-4 shrink-0 text-primary sm:block" />
            </div>
          );

          return (
            <li key={concept.id}>
              {concept.unlocked ? (
                <Link
                  to="/path/$pathId/$conceptId"
                  params={{ pathId: path.id, conceptId: concept.id }}
                  className="block"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}