import { auth } from "@clerk/nextjs/server";
import { eq, and, lte, asc } from "drizzle-orm";
import { db, flashcards } from "@/lib/db";

// POST /api/flashcards  { noteType, noteTitle, source, cards: [{front, back}] }
// Persist the cards the learner approved in the review step. New cards start
// due immediately; cards whose front already exists for the note are skipped.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { noteType, noteTitle, source, cards }: {
    noteType?: string;
    noteTitle?: string;
    source?: string;
    cards?: { front?: string; back?: string }[];
  } = await req.json();

  if (!noteType || !noteTitle || !Array.isArray(cards)) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const cleaned = cards
    .map((c) => ({ front: (c.front ?? "").trim(), back: (c.back ?? "").trim() }))
    .filter((c) => c.front && c.back);
  if (cleaned.length === 0) return Response.json({ saved: 0, skipped: 0 });

  const existing = await db
    .select({ front: flashcards.front })
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), eq(flashcards.noteType, noteType), eq(flashcards.noteTitle, noteTitle)));
  const seen = new Set(existing.map((e) => e.front));
  const src = source === "vocab" ? "vocab" : "concept";
  const toInsert = cleaned
    .filter((c) => !seen.has(c.front))
    .map((c) => ({ userId, noteType, noteTitle, front: c.front, back: c.back, source: src }));

  if (toInsert.length > 0) await db.insert(flashcards).values(toInsert);
  return Response.json({ saved: toInsert.length, skipped: cleaned.length - toInsert.length });
}

// GET /api/flashcards                         → all cards currently due (across notes)
// GET /api/flashcards?count=1                 → just the due count (nav badge / widget)
// GET /api/flashcards?noteType=&title=        → due cards for one note
// GET /api/flashcards?noteType=&title=&all=1  → every card for one note (for the modal list)
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const noteType = searchParams.get("noteType");
  const title = searchParams.get("title");
  const all = searchParams.get("all");
  const countOnly = searchParams.get("count");
  const now = new Date();

  const conds = [eq(flashcards.userId, userId)];
  if (noteType && title) {
    conds.push(eq(flashcards.noteType, noteType), eq(flashcards.noteTitle, title));
  }
  // Default to due-only; `all=1` returns the note's whole deck.
  if (!all) conds.push(lte(flashcards.dueAt, now));

  const rows = await db
    .select()
    .from(flashcards)
    .where(and(...conds))
    .orderBy(asc(flashcards.dueAt));

  const dueCount = all ? rows.filter((c) => c.dueAt <= now).length : rows.length;

  if (countOnly) return Response.json({ dueCount });

  return Response.json({
    dueCount,
    cards: rows.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      noteType: c.noteType,
      noteTitle: c.noteTitle,
      source: c.source,
      dueAt: c.dueAt,
    })),
  });
}
