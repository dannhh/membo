import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { db, writingSubmissions } from "@/lib/db";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const noteType = searchParams.get("noteType");
  const title = searchParams.get("title");

  if (!noteType || !title) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(writingSubmissions)
    .where(
      and(
        eq(writingSubmissions.userId, userId),
        eq(writingSubmissions.noteType, noteType),
        eq(writingSubmissions.noteTitle, title),
      )
    )
    .orderBy(desc(writingSubmissions.createdAt));

  return Response.json({ submissions: rows });
}
