import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Brain, Flame, Plus, Repeat, Target, TrendingUp, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { RingProgress } from "@/components/RingProgress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  accuracyTrend,
  averageRetention,
  BADGES,
  dueCards,
  levelFromXp,
  masteredCount,
  pathMastery,
  upcomingForecast,
  useAppState,
} from "@/lib/learning-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SynapseAI — Adaptive Learning Intelligence" },
      {
        name: "description",
        content:
          "An AI tutor that models your evolving knowledge state, schedules spaced repetition reviews and gamifies consistent study with XP, streaks and mastery tracking.",
      },
      { property: "og:title", content: "SynapseAI — Adaptive Learning Intelligence" },
      {
        property: "og:description",
        content:
          "AI-generated concept maps, adaptive explanations, spaced repetition and a gamified mastery dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useAppState();
  const due = dueCards(state);
  const { level, progress, toNext } = levelFromXp(state.xp);
  const retention = averageRetention(state);
  const forecast = upcomingForecast(state);
  const trend = accuracyTrend(state);
  const mastered = masteredCount(state);
  const totalConcepts = state.paths.flatMap((p) => p.concepts).length;

  if (!state.paths.length) {
    return (
      <AppShell>
        <section className="surface rounded-3xl p-8 text-center sm:p-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Brain className="size-3.5 text-primary" /> Adaptive Learning Intelligence
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Learning designed for <span className="text-gradient">exactly one person</span>. You.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            SynapseAI builds a prerequisite-ordered concept map for any topic, adapts every
            explanation to your current knowledge state, then defends that knowledge from forgetting
            with a spaced repetition scheduler.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/new">
              <Plus className="size-4" /> Create your first path
            </Link>
          </Button>

          <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Knowledge tracing",
                body: "Every answer updates a per-concept mastery estimate that drives what you see next.",
              },
              {
                icon: Repeat,
                title: "Spaced repetition",
                body: "An SM-2 style scheduler resurfaces each item right before your predicted forgetting point.",
              },
              {
                icon: Flame,
                title: "Gamified progress",
                body: "XP, levels, streaks and badges turn consistency into the default behaviour.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border p-5">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Your knowledge state</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {due.length > 0
              ? `${due.length} item${due.length === 1 ? "" : "s"} are slipping out of memory — review them now.`
              : "Everything is consolidated. Keep the streak alive with a new concept."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant={due.length ? "default" : "outline"}>
            <Link to="/review">
              <Repeat className="size-4" /> Review {due.length ? `(${due.length})` : ""}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/new">
              <Plus className="size-4" /> New path
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="surface flex items-center gap-6 rounded-2xl p-6">
          <RingProgress value={progress} label={`Lv ${level}`} sublabel={`${toNext} XP to next`} />
          <div className="space-y-3">
            <Stat icon={Zap} label="Total XP" value={state.xp} tone="text-primary" />
            <Stat icon={Flame} label="Day streak" value={state.streak} tone="text-accent" />
            <Stat icon={Award} label="Best streak" value={state.bestStreak} tone="text-success" />
          </div>
        </div>

        <div className="surface rounded-2xl p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Predicted recall</h2>
          <div className="mt-1 font-display text-4xl font-semibold text-gradient">
            {Math.round(retention * 100)}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Average probability you can recall a studied item right now.
          </p>
          <Progress value={retention * 100} className="mt-4 h-2" />
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Concepts mastered</span>
            <span className="font-medium">
              {mastered}/{totalConcepts}
            </span>
          </div>
        </div>

        <div className="surface rounded-2xl p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Review forecast</h2>
          <div className="mt-3 h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="reviews" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface rounded-2xl p-6">
          <h2 className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" /> Recall accuracy over time
          </h2>
          <div className="mt-4 h-[180px]">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} width={30} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Complete reviews on two different days to unlock this chart.
              </div>
            )}
          </div>
        </div>

        <div className="surface rounded-2xl p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Badges</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {BADGES.map((badge) => {
              const earned = state.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-3 transition-all ${
                    earned ? "border-accent/50 bg-accent/10" : "border-border opacity-50"
                  }`}
                >
                  <Award className={`size-4 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                  <div className="mt-2 text-sm font-medium">{badge.label}</div>
                  <div className="text-[11px] text-muted-foreground">{badge.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Learning paths</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.paths.map((path) => {
          const mastery = pathMastery(path);
          return (
            <Link
              key={path.id}
              to="/path/$pathId"
              params={{ pathId: path.id }}
              className="surface rounded-2xl p-5 transition-all hover:border-primary/50 hover:glow"
            >
              <div className="text-xs uppercase tracking-widest text-primary">{path.level}</div>
              <h3 className="mt-2 font-medium">{path.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.description}</p>
              <Progress value={mastery * 100} className="mt-4 h-1.5" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{path.concepts.length} concepts</span>
                <span>{Math.round(mastery * 100)}% mastery</span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`size-4 ${tone}`} />
      <div>
        <div className="font-display text-lg font-semibold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
