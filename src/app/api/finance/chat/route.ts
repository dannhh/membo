import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { eq, and, desc } from "drizzle-orm";
import { db, financeAccounts, financeTransactions, financeBudgets } from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface Message { role: "user" | "assistant"; content: string }

const TOOLS = [{
  functionDeclarations: [
    {
      name: "add_account",
      description: "Create a new financial account (bank, cash, credit card, savings, investment, or debt/loan)",
      parameters: {
        type: "object",
        properties: {
          name:         { type: "string",  description: "Account name, e.g. VCB, Techcombank, MB Bank" },
          type:         { type: "string",  description: "One of: cash, bank, savings, credit, investment, debt" },
          balanceCents: { type: "number",  description: "Current balance in cents (e.g. $100.50 = 10050). Default 0." },
          color:        { type: "string",  description: "Hex color, e.g. #6366f1. Optional." },
        },
        required: ["name", "type"],
      },
    },
    {
      name: "add_transaction",
      description: "Record a new income or expense transaction",
      parameters: {
        type: "object",
        properties: {
          accountId:    { type: "string", description: "Account ID from the account list" },
          type:         { type: "string", description: "income or expense" },
          amountCents:  { type: "number", description: "Amount in cents (e.g. $50 = 5000)" },
          category:     { type: "string", description: "Category from the available list" },
          description:  { type: "string", description: "Optional short description" },
          date:         { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["accountId", "type", "amountCents", "category", "date"],
      },
    },
    {
      name: "update_account_balance",
      description: "Update the current balance of an existing account",
      parameters: {
        type: "object",
        properties: {
          accountId:    { type: "string", description: "Account ID" },
          balanceCents: { type: "number", description: "New balance in cents" },
        },
        required: ["accountId", "balanceCents"],
      },
    },
    {
      name: "set_budget",
      description: "Set or update a monthly spending budget for a category",
      parameters: {
        type: "object",
        properties: {
          category:   { type: "string", description: "Expense category" },
          limitCents: { type: "number", description: "Budget limit in cents" },
          month:      { type: "string", description: "Month in YYYY-MM format" },
        },
        required: ["category", "limitCents", "month"],
      },
    },
  ],
}];

async function executeFunction(name: string, args: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
  try {
    if (name === "add_account") {
      const [account] = await db.insert(financeAccounts).values({
        userId,
        name: String(args.name),
        type: String(args.type),
        balanceCents: Number(args.balanceCents) || 0,
        color: String(args.color || "#6366f1"),
        currency: "USD",
        dueDay: null,
        savingsStartDate: null,
        savingsTermMonths: null,
        savingsRate: null,
      }).returning();
      return { success: true, accountId: account.id, message: `Created "${account.name}" (${account.type}) with balance $${(account.balanceCents / 100).toFixed(0)}` };
    }

    if (name === "add_transaction") {
      const [tx] = await db.insert(financeTransactions).values({
        userId,
        accountId: String(args.accountId),
        type: String(args.type),
        amountCents: Number(args.amountCents),
        category: String(args.category),
        description: String(args.description || ""),
        date: String(args.date),
        toAccountId: null,
      }).returning();
      return { success: true, transactionId: tx.id };
    }

    if (name === "update_account_balance") {
      await db.update(financeAccounts)
        .set({ balanceCents: Number(args.balanceCents), updatedAt: new Date() })
        .where(and(eq(financeAccounts.id, String(args.accountId)), eq(financeAccounts.userId, userId)));
      return { success: true };
    }

    if (name === "set_budget") {
      const cat = String(args.category);
      const mon = String(args.month);
      const limit = Number(args.limitCents);
      const existing = await db.select().from(financeBudgets)
        .where(and(eq(financeBudgets.userId, userId), eq(financeBudgets.category, cat), eq(financeBudgets.month, mon)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(financeBudgets).set({ limitCents: limit, updatedAt: new Date() }).where(eq(financeBudgets.id, existing[0].id));
      } else {
        await db.insert(financeBudgets).values({ userId, category: cat, limitCents: limit, month: mon });
      }
      return { success: true };
    }

    return { error: "Unknown function" };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, month }: { messages: Message[]; month: string } = await req.json();
  if (!messages?.length) return Response.json({ error: "Missing messages" }, { status: 400 });

  const [accounts, transactions, budgets] = await Promise.all([
    db.select().from(financeAccounts).where(eq(financeAccounts.userId, userId)),
    db.select().from(financeTransactions)
      .where(eq(financeTransactions.userId, userId))
      .orderBy(desc(financeTransactions.date))
      .limit(200),
    db.select().from(financeBudgets)
      .where(and(eq(financeBudgets.userId, userId), eq(financeBudgets.month, month))),
  ]);

  const totalAssets  = accounts.filter((a) => ["cash","bank","savings","investment"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0);
  const totalDebts   = accounts.filter((a) => a.type === "debt").reduce((s,a)=>s+a.balanceCents,0);
  const totalCredit  = accounts.filter((a) => a.type === "credit").reduce((s,a)=>s+a.balanceCents,0);
  const netWorth     = totalAssets - totalDebts - totalCredit;
  const monthTxs     = transactions.filter((t) => t.date.startsWith(month));
  const monthIncome  = monthTxs.filter((t)=>t.type==="income").reduce((s,t)=>s+t.amountCents,0);
  const monthExpenses = monthTxs.filter((t)=>t.type==="expense").reduce((s,t)=>s+t.amountCents,0);

  const fmt = (cents: number) => `$${(cents/100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const systemPrompt = `You are a personal finance AI assistant. You can BOTH analyze finances AND perform actions (add accounts, record transactions, set budgets, update balances) using the provided tools.

When the user asks you to add, record, or update something — DO IT using the appropriate tool. Confirm what you did afterward in a friendly message.

## Available expense categories
Food & Dining, Transport, Housing, Entertainment, Healthcare, Education, Shopping, Subscriptions, Utilities, Travel, Personal Care, Other

## Available income categories
Salary, Business, Investment Returns, Gift, Freelance, Other

## Account types
cash, bank, savings, credit, investment, debt

## Current Financial Snapshot (${month})
Net Worth: ${fmt(netWorth)} | Assets: ${fmt(totalAssets)} | Credit: ${fmt(totalCredit)} | Debts: ${fmt(totalDebts)}

## Accounts (include ID when using tools)
${accounts.map((a)=>`- id:${a.id} | ${a.name} (${a.type}): ${fmt(a.balanceCents)}`).join("\n") || "No accounts yet."}

## This Month: ${month}
- Income: ${fmt(monthIncome)} | Expenses: ${fmt(monthExpenses)} | Net: ${fmt(monthIncome - monthExpenses)}

## Monthly Budgets
${budgets.length > 0 ? budgets.map((b)=>{
  const spent = monthTxs.filter((t)=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amountCents,0);
  return `- ${b.category}: ${fmt(spent)} / ${fmt(b.limitCents)} (${Math.round(spent/b.limitCents*100)}%)`;
}).join("\n") : "No budgets set."}

## Recent Transactions (last 50)
${transactions.slice(0,50).map((t)=>`- [${t.date}] ${t.type} ${fmt(t.amountCents)} · ${t.category}${t.description?" · "+t.description:""}`).join("\n") || "No transactions yet."}

Respond in the same language the user writes in. Be concise and helpful.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      tools: TOOLS as never,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user" as const,
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(messages[messages.length - 1].content);
    let actionsExecuted = 0;

    while (true) {
      const calls = result.response.functionCalls();
      if (!calls?.length) break;

      actionsExecuted += calls.length;
      const parts: Part[] = await Promise.all(
        calls.map(async (call) => {
          const response = await executeFunction(call.name, call.args as Record<string, unknown>, userId);
          return { functionResponse: { name: call.name, response } } as Part;
        })
      );
      result = await chat.sendMessage(parts);
    }

    return Response.json({ text: result.response.text(), actionsExecuted });
  } catch (e) {
    console.error("[finance/chat]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
