import { and, eq, lte, count } from "drizzle-orm";
import { db, flashcards, flashcardReviews } from "@/lib/db";

// Map of `${noteType}/${noteTitle}` -> number of cards currently due, for a user.
// Used to badge note cards and surface per-note review counts.
export async function getDueCountsByNote(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ noteType: flashcards.noteType, noteTitle: flashcards.noteTitle, n: count() })
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), lte(flashcards.dueAt, new Date())))
    .groupBy(flashcards.noteType, flashcards.noteTitle);
  return new Map(rows.map((r) => [`${r.noteType}/${r.noteTitle}`, Number(r.n)]));
}

export interface ReviewStats {
  accuracy: number; // lifetime % of grades that weren't "again"
  studied: number;  // lifetime count of grades submitted
  streak: number;   // consecutive days (including today, if studied yet) with at least one review
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10); // UTC YYYY-MM-DD, consistent with rest of the app

// Gamification stats for the flashcard review screen — lifetime accuracy/studied
// counts plus a daily streak, derived from the append-only review log.
export async function getReviewStats(userId: string): Promise<ReviewStats> {
  const rows = await db
    .select({ grade: flashcardReviews.grade, reviewedAt: flashcardReviews.reviewedAt })
    .from(flashcardReviews)
    .where(eq(flashcardReviews.userId, userId));

  if (rows.length === 0) return { accuracy: 0, studied: 0, streak: 0 };

  const passed = rows.filter((r) => r.grade !== "again").length;
  const accuracy = Math.round((passed / rows.length) * 100);

  const studiedDays = new Set(rows.map((r) => dayKey(r.reviewedAt)));
  const cursor = new Date();
  if (!studiedDays.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (studiedDays.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { accuracy, studied: rows.length, streak };
}
