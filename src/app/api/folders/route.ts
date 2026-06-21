import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";
import { db, folders, notes } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userFolders = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId));

  return Response.json(userFolders);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, parentId }: { name: string; parentId?: string | null } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Missing name" }, { status: 400 });

  const [row] = await db
    .insert(folders)
    .values({ userId, name: name.trim(), parentId: parentId ?? null })
    .returning();

  return Response.json(row);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, parentId }: { id: string; name?: string; parentId?: string | null } = await req.json();
  if (!id || (name === undefined && parentId === undefined)) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (parentId !== undefined) updates.parentId = parentId;

  await db
    .update(folders)
    .set(updates)
    .where(and(eq(folders.userId, userId), eq(folders.id, id)));

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id }: { id: string } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const userFolders = await db
    .select({ id: folders.id, parentId: folders.parentId })
    .from(folders)
    .where(eq(folders.userId, userId));

  const idsToDelete = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    for (const f of userFolders) {
      if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
        idsToDelete.add(f.id);
        added = true;
      }
    }
  }

  const ids = [...idsToDelete];

  await db
    .update(notes)
    .set({ folderId: null })
    .where(and(eq(notes.userId, userId), inArray(notes.folderId, ids)));

  await db
    .delete(folders)
    .where(and(eq(folders.userId, userId), inArray(folders.id, ids)));

  return Response.json({ ok: true });
}
