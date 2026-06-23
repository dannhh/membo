import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, flashcards, flashcardReviews } from "@/lib/db";
import { scheduleNext, type ReviewGrade } from "@/lib/srs";
import { getReviewStats } from "@/lib/flashcards";

const VALID_GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

// POST /api/flashcards/:id  { grade } → apply an SM-2 review to one card
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { grade }: { grade: ReviewGrade } = await req.json();
  if (!VALID_GRADES.includes(grade)) {
    return Response.json({ error: "Invalid grade" }, { status: 400 });
  }

  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), eq(flashcards.id, id)))
    .limit(1);
  if (!card) return Response.json({ error: "Not found" }, { status: 404 });

  const next = scheduleNext(
    {
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      intervalDays: card.intervalDays,
      lapses: card.lapses,
    },
    grade
  );

  await Promise.all([
    db
      .update(flashcards)
      .set({
        easeFactor: next.easeFactor,
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        lapses: next.lapses,
        dueAt: next.dueAt,
        lastReviewedAt: new Date(),
      })
      .where(and(eq(flashcards.userId, userId), eq(flashcards.id, id))),
    db.insert(flashcardReviews).values({ userId, cardId: id, grade }),
  ]);

  const stats = await getReviewStats(userId);
  return Response.json({ ok: true, dueAt: next.dueAt, intervalDays: next.intervalDays, stats });
}

// DELETE /api/flashcards/:id → remove a card from the deck
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.id, id)));
  return Response.json({ ok: true });
}
