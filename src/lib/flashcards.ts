import { and, eq, lte, count } from "drizzle-orm";
import { db, flashcards } from "@/lib/db";

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
