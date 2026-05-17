import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db, financeInstallments } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    const rows = await db
      .select()
      .from(financeInstallments)
      .where(
        accountId
          ? and(eq(financeInstallments.userId, userId), eq(financeInstallments.accountId, accountId))
          : eq(financeInstallments.userId, userId)
      )
      .orderBy(financeInstallments.createdAt);

    return Response.json(rows);
  } catch (e) {
    console.error("[GET /api/finance/installments]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { accountId, description, totalAmountCents, monthlyAmountCents, totalMonths, startMonth, category }: {
      accountId: string; description: string;
      totalAmountCents: number; monthlyAmountCents: number;
      totalMonths: number; startMonth: string; category?: string;
    } = await req.json();

    if (!accountId || !description || !totalMonths || !startMonth) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const [row] = await db.insert(financeInstallments).values({
      userId, accountId, description,
      totalAmountCents, monthlyAmountCents, totalMonths, startMonth,
      category: category ?? "Shopping",
    }).returning();

    return Response.json(row);
  } catch (e) {
    console.error("[POST /api/finance/installments]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id, description, totalAmountCents, monthlyAmountCents, totalMonths, startMonth, category }: {
      id: string; description?: string;
      totalAmountCents?: number; monthlyAmountCents?: number;
      totalMonths?: number; startMonth?: string; category?: string;
    } = await req.json();

    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const [row] = await db
      .update(financeInstallments)
      .set({
        ...(description !== undefined && { description }),
        ...(totalAmountCents !== undefined && { totalAmountCents }),
        ...(monthlyAmountCents !== undefined && { monthlyAmountCents }),
        ...(totalMonths !== undefined && { totalMonths }),
        ...(startMonth !== undefined && { startMonth }),
        ...(category !== undefined && { category }),
      })
      .where(and(eq(financeInstallments.id, id), eq(financeInstallments.userId, userId)))
      .returning();

    return Response.json(row ?? null);
  } catch (e) {
    console.error("[PUT /api/finance/installments]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id }: { id: string } = await req.json();
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    await db.delete(financeInstallments).where(
      and(eq(financeInstallments.id, id), eq(financeInstallments.userId, userId))
    );
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/finance/installments]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
