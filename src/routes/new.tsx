import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addPath } from "@/lib/learning-store";
import { generateLearningPath } from "@/lib/tutor.functions";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Build a Learning Path — SynapseAI" },
      {
        name: "description",
        content:
          "Generate an adaptive, dependency-ordered concept map on any topic, tuned to your level and goal.",
      },
      { property: "og:title", content: "Build a Learning Path — SynapseAI" },
      {
        property: "og:description",
        content: "Generate an adaptive concept map on any topic, tuned to your level and goal.",
      },
    ],
  }),
  component: NewPathPage,
});

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SUGGESTIONS = [
  "Bayesian inference",
  "How transformers work",
  "Organic chemistry: reaction mechanisms",
  "Macroeconomics: monetary policy",
  "Linear algebra: eigenvectors",
];

function NewPathPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateLearningPath);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("beginner");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (topic.trim().length < 2) return;
    setLoading(true);
    try {
      const generated = await generate({ data: { topic: topic.trim(), level, goal: goal.trim() } });
      const id = addPath(generated, topic.trim(), level);
      toast.success("Your adaptive path is ready");
      navigate({ to: "/path/$pathId", params: { pathId: id } });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not generate the path");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Adaptive curriculum generator
        </span>
        <h1 className="mt-4 text-4xl font-semibold">
          What do you want to <span className="text-gradient">master</span>?
        </h1>
        <p className="mt-2 text-muted-foreground">
          We map the topic into atomic concepts ordered by prerequisites, then schedule each one
          into your long-term memory with spaced repetition.
        </p>

        <form onSubmit={onSubmit} className="surface mt-8 space-y-6 rounded-2xl p-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Neural networks from scratch"
              className="h-12 text-base"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current level</Label>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition-all ${
                    level === l
                      ? "border-primary bg-primary/10 text-foreground glow"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Your goal (optional)</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Pass my exam in 3 weeks / ship a side project / explain it to my team"
              rows={3}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Designing your concept map…
              </>
            ) : (
              <>
                <Wand2 className="size-4" /> Generate learning path
              </>
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}