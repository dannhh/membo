import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, chatHistory } from "@/lib/db";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const noteType = searchParams.get("noteType");
  const title = searchParams.get("title");
  const mode = searchParams.get("mode");
  const subMode = searchParams.get("subMode") ?? "";

  if (!noteType || !title || !mode) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const [row] = await db
    .select({ messages: chatHistory.messages })
    .from(chatHistory)
    .where(
      and(
        eq(chatHistory.userId, userId),
        eq(chatHistory.noteType, noteType),
        eq(chatHistory.noteTitle, title),
        eq(chatHistory.mode, mode),
        eq(chatHistory.subMode, subMode),
      )
    )
    .limit(1);

  if (!row) return Response.json({ messages: [] });

  try {
    return Response.json({ messages: JSON.parse(row.messages) });
  } catch {
    return Response.json({ messages: [] });
  }
}
