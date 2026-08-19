import { useSyncExternalStore } from "react";

import {
  initialScheduling,
  isDue,
  retention,
  schedule,
  type Grade,
  type SchedulingState,
} from "./srs";
import type { GeneratedPath } from "./tutor.functions";

export interface Card {
  id: string;
  question: string;
  answer: string;
  choices: string[];
  correctIndex: number;
  hint: string;
  srs: SchedulingState;
}

export interface Concept {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  analogy: string;
  misconception: string;
  difficulty: number;
  prerequisites: string[];
  cards: Card[];
  unlocked: boolean;
  studied: boolean;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  topic: string;
  level: string;
  createdAt: number;
  concepts: Concept[];
}

export interface ReviewLog {
  at: number;
  grade: Grade;
  conceptId: string;
  pathId: string;
}

export interface AppState {
  paths: LearningPath[];
  xp: number;
  streak: number;
  bestStreak: number;
  lastStudyDay: string | null;
  studyDays: string[];
  log: ReviewLog[];
  badges: string[];
}

const KEY = "ali.state.v1";

const emptyState: AppState = {
  paths: [],
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastStudyDay: null,
  studyDays: [],
  log: [],
  badges: [],
};

let state: AppState = emptyState;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): AppState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState;
    return { ...emptyState, ...(JSON.parse(raw) as AppState) };
  } catch {
    return emptyState;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    state = read();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => emptyState,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export function addPath(generated: GeneratedPath, topic: string, level: string) {
  const id = uid();
  const path: LearningPath = {
    id,
    title: generated.title,
    description: generated.description,
    topic,
    level,
    createdAt: Date.now(),
    concepts: generated.concepts.map((c, index) => ({
      id: uid(),
      title: c.title,
      summary: c.summary,
      explanation: c.explanation,
      analogy: c.analogy,
      misconception: c.misconception,
      difficulty: c.difficulty,
      prerequisites: c.prerequisites,
      unlocked: index === 0,
      studied: false,
      cards: c.cards.map((card) => ({
        id: uid(),
        question: card.question,
        answer: card.answer,
        choices: card.choices,
        correctIndex: card.correctIndex,
        hint: card.hint,
        srs: initialScheduling(),
      })),
    })),
  };
  setState((prev) => ({ ...prev, paths: [path, ...prev.paths] }));
  return id;
}

export function deletePath(pathId: string) {
  setState((prev) => ({ ...prev, paths: prev.paths.filter((p) => p.id !== pathId) }));
}

function registerStudyDay(prev: AppState, now: number): Partial<AppState> {
  const today = dayKey(now);
  if (prev.lastStudyDay === today) return {};
  const yesterday = dayKey(now - 86_400_000);
  const streak = prev.lastStudyDay === yesterday ? prev.streak + 1 : 1;
  return {
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastStudyDay: today,
    studyDays: [...new Set([...prev.studyDays, today])].slice(-120),
  };
}

const XP_BY_GRADE: Record<Grade, number> = { 0: 4, 1: 8, 2: 14, 3: 18 };

export function gradeCard(pathId: string, conceptId: string, cardId: string, grade: Grade) {
  const now = Date.now();
  setState((prev) => {
    const paths = prev.paths.map((p) =>
      p.id !== pathId
        ? p
        : {
            ...p,
            concepts: p.concepts.map((c) =>
              c.id !== conceptId
                ? c
                : {
                    ...c,
                    studied: true,
                    cards: c.cards.map((card) =>
                      card.id !== cardId ? card : { ...card, srs: schedule(card.srs, grade, now) },
                    ),
                  },
            ),
          },
    );
    const next: AppState = {
      ...prev,
      paths: unlockNext(paths),
      xp: prev.xp + XP_BY_GRADE[grade],
      log: [...prev.log, { at: now, grade, conceptId, pathId }].slice(-500),
      ...registerStudyDay(prev, now),
    };
    return { ...next, badges: computeBadges(next) };
  });
}

export function markStudied(pathId: string, conceptId: string) {
  setState((prev) => {
    const paths = prev.paths.map((p) =>
      p.id !== pathId
        ? p
        : {
            ...p,
            concepts: p.concepts.map((c) => (c.id === conceptId ? { ...c, studied: true } : c)),
          },
    );
    return { ...prev, paths: unlockNext(paths) };
  });
}

function unlockNext(paths: LearningPath[]): LearningPath[] {
  return paths.map((p) => ({
    ...p,
    concepts: p.concepts.map((c, i) => ({
      ...c,
      unlocked: i === 0 || c.unlocked || (p.concepts[i - 1]?.studied ?? false),
    })),
  }));
}

export const BADGES: { id: string; label: string; description: string }[] = [
  { id: "first-steps", label: "First Steps", description: "Complete your first review" },
  { id: "streak-3", label: "Consistent", description: "3-day study streak" },
  { id: "streak-7", label: "Unstoppable", description: "7-day study streak" },
  { id: "xp-500", label: "Scholar", description: "Earn 500 XP" },
  { id: "reviews-50", label: "Memory Athlete", description: "50 reviews completed" },
  { id: "mastered-5", label: "Concept Master", description: "Master 5 concepts" },
];

function computeBadges(s: AppState): string[] {
  const earned = new Set(s.badges);
  if (s.log.length >= 1) earned.add("first-steps");
  if (s.streak >= 3) earned.add("streak-3");
  if (s.streak >= 7) earned.add("streak-7");
  if (s.xp >= 500) earned.add("xp-500");
  if (s.log.length >= 50) earned.add("reviews-50");
  if (masteredCount(s) >= 5) earned.add("mastered-5");
  return [...earned];
}

// ---- derived selectors ----

export function conceptMastery(concept: Concept) {
  if (!concept.cards.length) return 0;
  return concept.cards.reduce((sum, c) => sum + c.srs.strength, 0) / concept.cards.length;
}

export function pathMastery(path: LearningPath) {
  if (!path.concepts.length) return 0;
  return path.concepts.reduce((s, c) => s + conceptMastery(c), 0) / path.concepts.length;
}

export function masteredCount(s: AppState) {
  return s.paths.flatMap((p) => p.concepts).filter((c) => conceptMastery(c) >= 0.8).length;
}

export interface DueCard {
  card: Card;
  concept: Concept;
  path: LearningPath;
}

export function dueCards(s: AppState, now = Date.now()): DueCard[] {
  const out: DueCard[] = [];
  for (const path of s.paths) {
    for (const concept of path.concepts) {
      if (!concept.studied) continue;
      for (const card of concept.cards) {
        if (card.srs.lastReviewedAt !== null && isDue(card.srs, now)) {
          out.push({ card, concept, path });
        }
      }
    }
  }
  return out.sort((a, b) => a.card.srs.dueAt - b.card.srs.dueAt);
}

export function upcomingForecast(s: AppState, days = 7) {
  const now = Date.now();
  const buckets = Array.from({ length: days }, (_, i) => ({
    day: i === 0 ? "Today" : new Date(now + i * 86_400_000).toLocaleDateString(undefined, { weekday: "short" }),
    reviews: 0,
  }));
  for (const path of s.paths) {
    for (const concept of path.concepts) {
      for (const card of concept.cards) {
        if (card.srs.lastReviewedAt === null) continue;
        const offset = Math.floor((card.srs.dueAt - now) / 86_400_000);
        const index = Math.max(0, offset);
        if (index < days) buckets[index]!.reviews += 1;
      }
    }
  }
  return buckets;
}

export function averageRetention(s: AppState, now = Date.now()) {
  const cards = s.paths.flatMap((p) => p.concepts).flatMap((c) => c.cards).filter((c) => c.srs.lastReviewedAt);
  if (!cards.length) return 0;
  return cards.reduce((sum, c) => sum + retention(c.srs, now), 0) / cards.length;
}

export function accuracyTrend(s: AppState) {
  const byDay = new Map<string, { correct: number; total: number }>();
  for (const entry of s.log.slice(-200)) {
    const key = dayKey(entry.at);
    const bucket = byDay.get(key) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (entry.grade >= 2) bucket.correct += 1;
    byDay.set(key, bucket);
  }
  return [...byDay.entries()].map(([day, v]) => ({
    day: day.slice(5),
    accuracy: Math.round((v.correct / v.total) * 100),
  }));
}

export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const currentFloor = Math.pow(level - 1, 2) * 60;
  const nextFloor = Math.pow(level, 2) * 60;
  return {
    level,
    progress: (xp - currentFloor) / (nextFloor - currentFloor),
    toNext: Math.max(0, Math.ceil(nextFloor - xp)),
  };
}