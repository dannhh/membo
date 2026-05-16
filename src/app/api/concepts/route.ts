import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, concepts, progress } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userConcepts = await db
    .select()
    .from(concepts)
    .where(eq(concepts.userId, userId))
    .orderBy(concepts.updatedAt);

  const userProgress = await db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId));

  const progressMap = new Map(userProgress.map((p) => [p.conceptName, p]));

  return Response.json(
    userConcepts.map((c) => ({
      name: c.name,
      updatedAt: c.updatedAt,
      hasProgress: progressMap.has(c.name),
      progressUpdatedAt: progressMap.get(c.name)?.updatedAt ?? null,
    }))
  );
}
