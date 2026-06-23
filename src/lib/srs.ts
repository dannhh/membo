// Spaced-repetition scheduler — SM-2 (the classic SuperMemo 2 algorithm).
// Pure functions: given a card's current schedule state and a review grade,
// compute the next interval, ease factor, and due date.

export type ReviewGrade = "again" | "hard" | "good" | "easy";

// Map the 4 review buttons onto SM-2 quality scores (0–5).
// < 3 counts as a lapse (the user failed to recall).
const QUALITY: Record<ReviewGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SrsState {
  easeFactor: number;
  repetitions: number;
  intervalDays: number;
  lapses: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

/**
 * Apply one review to a card's schedule state and return the updated state.
 * @param state current schedule fields from the flashcards row
 * @param grade which button the user pressed
 * @param now   injectable clock for deterministic tests (defaults to real now)
 */
export function scheduleNext(
  state: SrsState,
  grade: ReviewGrade,
  now: Date = new Date()
): SrsResult {
  const q = QUALITY[grade];
  let { easeFactor, repetitions, intervalDays, lapses } = state;

  if (q < 3) {
    // Failed recall — reset progress and relearn. Re-queue for the same day.
    repetitions = 0;
    intervalDays = 0;
    lapses += 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));

    // "Hard" still counts as a pass but shortens the next interval.
    if (grade === "hard") intervalDays = Math.max(1, Math.round(intervalDays * 0.8));

    repetitions += 1;
  }

  // Standard SM-2 ease-factor update, floored at 1.3.
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  return { easeFactor, repetitions, intervalDays, lapses, dueAt };
}
