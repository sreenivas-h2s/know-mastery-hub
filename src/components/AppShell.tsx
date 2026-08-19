import { Link } from "@tanstack/react-router";
import { Brain, LayoutDashboard, Plus, Repeat } from "lucide-react";
import type { ReactNode } from "react";

import { dueCards, levelFromXp, useAppState } from "@/lib/learning-store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review", label: "Review", icon: Repeat },
  { to: "/new", label: "New path", icon: Plus },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const due = dueCards(state).length;
  const { level } = levelFromXp(state.xp);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary glow">
              <Brain className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Synapse<span className="text-gradient">AI</span>
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.to === "/review" && due > 0 ? (
                  <span className="ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    {due}
                  </span>
                ) : null}
              </Link>
            ))}
            <span className="ml-2 hidden rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:block">
              Lv {level} · {state.xp} XP
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
