import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq, and, desc } from "drizzle-orm";
import { db, financeAccounts, financeTransactions, financeBudgets } from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface Message { role: "user" | "assistant"; content: string }

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

  const totalAssets = accounts.filter((a) => ["cash","bank","savings","investment"].includes(a.type)).reduce((s,a)=>s+a.balanceCents,0);
  const totalDebts = accounts.filter((a) => a.type === "debt").reduce((s,a)=>s+a.balanceCents,0);
  const totalCredit = accounts.filter((a) => a.type === "credit").reduce((s,a)=>s+a.balanceCents,0);
  const netWorth = totalAssets - totalDebts - totalCredit;

  const monthTxs = transactions.filter((t) => t.date.startsWith(month));
  const monthIncome = monthTxs.filter((t)=>t.type==="income").reduce((s,t)=>s+t.amountCents,0);
  const monthExpenses = monthTxs.filter((t)=>t.type==="expense").reduce((s,t)=>s+t.amountCents,0);

  const fmt = (cents: number) => `$${(cents/100).toFixed(2)}`;

  const systemPrompt = `You are a personal finance advisor AI. You help analyze the user's finances, answer questions, and give actionable advice. Be concise and specific. Use the data below.

## Current Financial Snapshot (${month})

### Net Worth
- Assets: ${fmt(totalAssets)}
- Credit card balances: ${fmt(totalCredit)}
- Debts/Loans: ${fmt(totalDebts)}
- Net Worth: ${fmt(netWorth)}

### Accounts
${accounts.map((a)=>`- ${a.name} (${a.type}): ${fmt(a.balanceCents)}`).join("\n") || "No accounts yet."}

### This Month: ${month}
- Total income: ${fmt(monthIncome)}
- Total expenses: ${fmt(monthExpenses)}
- Net: ${fmt(monthIncome - monthExpenses)}

### Monthly Budgets
${budgets.length > 0 ? budgets.map((b)=>{
  const spent = monthTxs.filter((t)=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amountCents,0);
  return `- ${b.category}: ${fmt(spent)} / ${fmt(b.limitCents)} (${Math.round(spent/b.limitCents*100)}%)`;
}).join("\n") : "No budgets set."}

### Recent Transactions (last 50)
${transactions.slice(0,50).map((t)=>`- [${t.date}] ${t.type.toUpperCase()} ${fmt(t.amountCents)} · ${t.category}${t.description?" · "+t.description:""}`).join("\n") || "No transactions yet."}

Respond in the same language the user writes in. Be helpful and specific. Do not invent data not shown above.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
  const history = messages.slice(0,-1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user" as const,
    parts: [{ text: m.content }],
  }));
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(messages[messages.length - 1].content);
  return Response.json({ text: result.response.text() });
}
