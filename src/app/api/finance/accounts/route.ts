import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, financeAccounts } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await db
      .select()
      .from(financeAccounts)
      .where(eq(financeAccounts.userId, userId))
      .orderBy(financeAccounts.createdAt);

    return Response.json(accounts);
  } catch (e) {
    console.error("[GET /api/finance/accounts]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { name, type, balanceCents, currency, color }: {
      name: string; type: string; balanceCents: number; currency?: string; color?: string;
    } = await req.json();

    if (!name || !type) return Response.json({ error: "Missing fields" }, { status: 400 });

    const [account] = await db.insert(financeAccounts).values({
      userId, name, type, balanceCents: balanceCents ?? 0, currency: currency ?? "USD", color: color ?? "#6366f1",
    }).returning();

    return Response.json(account);
  } catch (e) {
    console.error("[POST /api/finance/accounts]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, type, balanceCents, currency, color }: {
      id: string; name?: string; type?: string; balanceCents?: number; currency?: string; color?: string;
    } = await req.json();

    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const [account] = await db
      .update(financeAccounts)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(balanceCents !== undefined && { balanceCents }),
        ...(currency !== undefined && { currency }),
        ...(color !== undefined && { color }),
        updatedAt: new Date(),
      })
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
      .returning();

    return Response.json(account ?? null);
  } catch (e) {
    console.error("[PUT /api/finance/accounts]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id }: { id: string } = await req.json();
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    await db.delete(financeAccounts).where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/finance/accounts]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
