import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, financeBudgets } from "@/lib/db";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  const rows = await db.select().from(financeBudgets)
    .where(and(
      eq(financeBudgets.userId, userId),
      ...(month ? [eq(financeBudgets.month, month)] : []),
    ));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { category, limitCents, month }: { category: string; limitCents: number; month: string } = await req.json();
  if (!category || !limitCents || !month) return Response.json({ error: "Missing fields" }, { status: 400 });

  // Upsert
  const existing = await db.select({ id: financeBudgets.id }).from(financeBudgets)
    .where(and(eq(financeBudgets.userId, userId), eq(financeBudgets.category, category), eq(financeBudgets.month, month)))
    .limit(1);

  let budget;
  if (existing.length > 0) {
    [budget] = await db.update(financeBudgets).set({ limitCents, updatedAt: new Date() })
      .where(and(eq(financeBudgets.userId, userId), eq(financeBudgets.category, category), eq(financeBudgets.month, month)))
      .returning();
  } else {
    [budget] = await db.insert(financeBudgets).values({ userId, category, limitCents, month }).returning();
  }

  return Response.json(budget);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id }: { id: string } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  await db.delete(financeBudgets).where(and(eq(financeBudgets.id, id), eq(financeBudgets.userId, userId)));
  return Response.json({ ok: true });
}
