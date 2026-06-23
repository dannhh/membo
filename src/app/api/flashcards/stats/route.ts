import { auth } from "@clerk/nextjs/server";
import { getReviewStats } from "@/lib/flashcards";

// GET /api/flashcards/stats → lifetime accuracy/studied counts + daily streak
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getReviewStats(userId);
  return Response.json(stats);
}
