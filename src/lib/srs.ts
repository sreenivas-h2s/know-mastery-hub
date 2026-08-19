// SM-2 inspired spaced repetition with a half-life retention model.

export type Grade = 0 | 1 | 2 | 3; // again | hard | good | easy

export interface SchedulingState {
  ease: number; // ease factor, 1.3 - 3.0
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: number; // epoch ms
  lastReviewedAt: number | null;
  strength: number; // 0..1 mastery estimate
}

export const DAY = 86_400_000;

export function initialScheduling(now = Date.now()): SchedulingState {
  return {
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: now,
    lastReviewedAt: null,
    strength: 0,
  };
}

const EASE_DELTA: Record<Grade, number> = { 0: -0.2, 1: -0.15, 2: 0, 3: 0.15 };

/** Apply a review grade and return the next scheduling state. */
export function schedule(state: SchedulingState, grade: Grade, now = Date.now()): SchedulingState {
  const ease = clamp(state.ease + EASE_DELTA[grade], 1.3, 3);

  let repetitions = state.repetitions;
  let lapses = state.lapses;
  let intervalDays: number;

  if (grade === 0) {
    repetitions = 0;
    lapses += 1;
    intervalDays = 0.007; // ~10 minutes: relearn inside the same session
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = grade === 1 ? 0.5 : 1;
    else if (repetitions === 2) intervalDays = grade === 1 ? 2 : 3;
    else intervalDays = Math.min(365, state.intervalDays * ease * (grade === 1 ? 0.6 : 1));
    if (grade === 3) intervalDays *= 1.25;
  }

  const strengthDelta = grade === 0 ? -0.3 : grade === 1 ? 0.06 : grade === 2 ? 0.16 : 0.24;

  return {
    ease,
    intervalDays,
    repetitions,
    lapses,
    dueAt: now + intervalDays * DAY,
    lastReviewedAt: now,
    strength: clamp(state.strength + strengthDelta, 0, 1),
  };
}

/** Predicted probability of recall right now (exponential forgetting curve). */
export function retention(state: SchedulingState, now = Date.now()): number {
  if (!state.lastReviewedAt) return 0;
  const halfLife = Math.max(0.15, state.intervalDays * 0.9);
  const elapsed = (now - state.lastReviewedAt) / DAY;
  return clamp(Math.pow(2, -elapsed / halfLife), 0, 1);
}

export function isDue(state: SchedulingState, now = Date.now()) {
  return state.dueAt <= now;
}

export function formatDue(state: SchedulingState, now = Date.now()) {
  const diff = state.dueAt - now;
  if (diff <= 0) return "due now";
  const hours = diff / 3_600_000;
  if (hours < 1) return `in ${Math.round(hours * 60)}m`;
  if (hours < 24) return `in ${Math.round(hours)}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}