import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, notes, noteMetadata, chatHistory } from "@/lib/db";

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { noteType, title }: { noteType: string; title: string } = await req.json();
  if (!noteType || !title) return Response.json({ error: "Missing fields" }, { status: 400 });

  await Promise.all([
    db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title))),
    db.delete(noteMetadata).where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title))),
    db.delete(chatHistory).where(and(eq(chatHistory.userId, userId), eq(chatHistory.noteType, noteType), eq(chatHistory.noteTitle, title))),
  ]);

  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const noteType = searchParams.get("noteType");
  const title = searchParams.get("title");

  if (noteType && title) {
    const [row] = await db
      .select({ content: noteMetadata.content })
      .from(noteMetadata)
      .where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title)))
      .limit(1);
    return Response.json({ metadataContent: row?.content ?? null });
  }

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(notes.updatedAt);

  const userMetadata = await db
    .select()
    .from(noteMetadata)
    .where(eq(noteMetadata.userId, userId));

  const metadataSet = new Set(userMetadata.map((m) => `${m.noteType}/${m.noteTitle}`));

  return Response.json(
    userNotes.map((n) => ({
      id: n.id,
      noteType: n.noteType,
      title: n.title,
      summary: n.summary,
      folderId: n.folderId,
      updatedAt: n.updatedAt,
      hasMetadata: metadataSet.has(`${n.noteType}/${n.title}`),
    }))
  );
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { noteType, title, metadataContent }: {
    noteType: string;
    title: string;
    metadataContent: string;
  } = await req.json();

  if (!noteType || !title || !metadataContent) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(noteMetadata)
    .where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title)))
    .limit(1);

  if (existing.length > 0) {
    let merged = metadataContent;
    try {
      const prev = JSON.parse(existing[0].content || "{}");
      const next = JSON.parse(metadataContent);
      merged = JSON.stringify({ ...prev, ...next });
    } catch { /* fallback to replacement */ }
    await db
      .update(noteMetadata)
      .set({ content: merged, updatedAt: new Date() })
      .where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title)));
  } else {
    await db.insert(noteMetadata).values({ userId, noteType, noteTitle: title, content: metadataContent });
  }

  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { noteType, title, summary, newTitle, folderId }: {
    noteType: string;
    title: string;
    summary?: string;
    newTitle?: string;
    folderId?: string | null;
  } = await req.json();

  if (!noteType || !title || (!summary && !newTitle && folderId === undefined)) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const noteUpdates: Record<string, unknown> = { updatedAt: new Date() };
  if (summary !== undefined) noteUpdates.summary = summary;
  if (newTitle !== undefined) noteUpdates.title = newTitle;
  if (folderId !== undefined) noteUpdates.folderId = folderId;

  const existing = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notes)
      .set(noteUpdates)
      .where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title)));
  } else {
    await db.insert(notes).values({ userId, noteType, title: newTitle ?? title, summary });
  }

  // Cascade title rename to related tables
  if (newTitle && newTitle !== title) {
    await Promise.all([
      db.update(noteMetadata)
        .set({ noteTitle: newTitle, updatedAt: new Date() })
        .where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title))),
      db.update(chatHistory)
        .set({ noteTitle: newTitle, updatedAt: new Date() })
        .where(and(eq(chatHistory.userId, userId), eq(chatHistory.noteType, noteType), eq(chatHistory.noteTitle, title))),
    ]);
  }

  return Response.json({ ok: true });
}
