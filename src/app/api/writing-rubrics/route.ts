import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, writingRubrics } from "@/lib/db";
import { BUILTIN_WRITING_RUBRICS } from "@/lib/note-types/concept/writing-rubrics";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const custom = await db
    .select()
    .from(writingRubrics)
    .where(eq(writingRubrics.userId, userId));

  return Response.json({ builtin: BUILTIN_WRITING_RUBRICS, custom });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, prompt }: { name: string; prompt: string } = await req.json();
  if (!name?.trim() || !prompt?.trim()) {
    return Response.json({ error: "Missing name or prompt" }, { status: 400 });
  }

  const [row] = await db
    .insert(writingRubrics)
    .values({ userId, name: name.trim(), prompt: prompt.trim() })
    .returning();

  return Response.json(row);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id }: { id: string } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(writingRubrics)
    .where(and(eq(writingRubrics.userId, userId), eq(writingRubrics.id, id)));

  return Response.json({ ok: true });
}
