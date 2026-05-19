import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { db, financeTransactions, financeAccounts } from "@/lib/db";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM filter

  let rows = await db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.userId, userId))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt));

  if (month) rows = rows.filter((r) => r.date.startsWith(month));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId, type, amountCents, category, description, date, toAccountId }: {
    accountId: string; type: string; amountCents: number;
    category: string; description?: string; date: string; toAccountId?: string;
  } = await req.json();

  if (!accountId || !type || !amountCents || !category || !date) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const [tx] = await db.insert(financeTransactions).values({
    userId, accountId, type, amountCents, category, description: description ?? "", date,
    toAccountId: toAccountId ?? null,
  }).returning();

  // Adjust account balance(s)
  if (type === "income") {
    await db.update(financeAccounts)
      .set({ balanceCents: await addToBalance(accountId, userId, amountCents), updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));
  } else if (type === "expense") {
    await db.update(financeAccounts)
      .set({ balanceCents: await addToBalance(accountId, userId, -amountCents), updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));
  } else if (type === "transfer" && toAccountId) {
    const fromBal = await addToBalance(accountId, userId, -amountCents);
    const toBal = await addToBalance(toAccountId, userId, amountCents);
    await Promise.all([
      db.update(financeAccounts).set({ balanceCents: fromBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId))),
      db.update(financeAccounts).set({ balanceCents: toBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, toAccountId), eq(financeAccounts.userId, userId))),
    ]);
  }

  return Response.json(tx);
}

async function addToBalance(accountId: string, userId: string, deltaCents: number): Promise<number> {
  const [acc] = await db.select({ balanceCents: financeAccounts.balanceCents })
    .from(financeAccounts)
    .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)))
    .limit(1);
  return (acc?.balanceCents ?? 0) + deltaCents;
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, accountId, type, amountCents, category, description, date, toAccountId }: {
    id: string; accountId: string; type: string; amountCents: number;
    category: string; description?: string; date: string; toAccountId?: string;
  } = await req.json();

  if (!id || !accountId || !type || !amountCents || !category || !date) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const [old] = await db.select().from(financeTransactions)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, userId)))
    .limit(1);

  if (!old) return Response.json({ error: "Not found" }, { status: 404 });

  // Reverse old balance effect
  if (old.type === "income") {
    const bal = await addToBalance(old.accountId, userId, -old.amountCents);
    await db.update(financeAccounts).set({ balanceCents: bal, updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, old.accountId), eq(financeAccounts.userId, userId)));
  } else if (old.type === "expense") {
    const bal = await addToBalance(old.accountId, userId, old.amountCents);
    await db.update(financeAccounts).set({ balanceCents: bal, updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, old.accountId), eq(financeAccounts.userId, userId)));
  } else if (old.type === "transfer" && old.toAccountId) {
    const [fromBal, toBal] = await Promise.all([
      addToBalance(old.accountId, userId, old.amountCents),
      addToBalance(old.toAccountId, userId, -old.amountCents),
    ]);
    await Promise.all([
      db.update(financeAccounts).set({ balanceCents: fromBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, old.accountId), eq(financeAccounts.userId, userId))),
      db.update(financeAccounts).set({ balanceCents: toBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, old.toAccountId), eq(financeAccounts.userId, userId))),
    ]);
  }

  // Apply new balance effect
  if (type === "income") {
    const bal = await addToBalance(accountId, userId, amountCents);
    await db.update(financeAccounts).set({ balanceCents: bal, updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));
  } else if (type === "expense") {
    const bal = await addToBalance(accountId, userId, -amountCents);
    await db.update(financeAccounts).set({ balanceCents: bal, updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));
  } else if (type === "transfer" && toAccountId) {
    const [fromBal, toBal] = await Promise.all([
      addToBalance(accountId, userId, -amountCents),
      addToBalance(toAccountId, userId, amountCents),
    ]);
    await Promise.all([
      db.update(financeAccounts).set({ balanceCents: fromBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId))),
      db.update(financeAccounts).set({ balanceCents: toBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, toAccountId), eq(financeAccounts.userId, userId))),
    ]);
  }

  const [updated] = await db.update(financeTransactions).set({
    accountId, type, amountCents, category,
    description: description ?? "", date, toAccountId: toAccountId ?? null,
  }).where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, userId)))
    .returning();

  return Response.json(updated);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id }: { id: string } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Reverse the balance effect before deleting
  const [tx] = await db.select().from(financeTransactions)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, userId)))
    .limit(1);

  if (tx) {
    const delta = tx.type === "income" ? -tx.amountCents : tx.type === "expense" ? tx.amountCents : 0;
    if (delta !== 0) {
      const newBal = await addToBalance(tx.accountId, userId, delta);
      await db.update(financeAccounts).set({ balanceCents: newBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, tx.accountId), eq(financeAccounts.userId, userId)));
    }
    if (tx.type === "transfer" && tx.toAccountId) {
      const newBal = await addToBalance(tx.toAccountId, userId, -tx.amountCents);
      await db.update(financeAccounts).set({ balanceCents: newBal, updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, tx.toAccountId), eq(financeAccounts.userId, userId)));
    }
    await db.delete(financeTransactions)
      .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, userId)));
  }

  return Response.json({ ok: true });
}
