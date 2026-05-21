import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { rescheduleFocusBlocks, AUTOFILL_MARK } from "@/lib/reschedule-focus";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface Message { role: "user" | "assistant"; content: string }

const EVENT_COLOR: Record<string, string> = {
  event: "#6366f1",
  task:  "#f59e0b",
  study: "#10b981",
};

const TOOLS = [{
  functionDeclarations: [
    {
      name: "add_event",
      description: "Create a new calendar event, task, or study/focus block",
      parameters: {
        type: "object",
        properties: {
          title:       { type: "string",  description: "Event title" },
          date:        { type: "string",  description: "Date in YYYY-MM-DD" },
          type:        { type: "string",  description: "One of: event, task, study" },
          startTime:   { type: "string",  description: "Start time HH:MM (optional for all-day)" },
          endTime:     { type: "string",  description: "End time HH:MM (optional)" },
          description: { type: "string",  description: "Optional notes" },
        },
        required: ["title", "date", "type"],
      },
    },
    {
      name: "delete_event",
      description: "Delete a calendar event by its ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Event ID from the event list" },
        },
        required: ["id"],
      },
    },
    {
      name: "reschedule_event",
      description: "Move or retiming an existing event — change its date, start time, or end time",
      parameters: {
        type: "object",
        properties: {
          id:        { type: "string", description: "Event ID" },
          date:      { type: "string", description: "New date YYYY-MM-DD (omit to keep current)" },
          startTime: { type: "string", description: "New start time HH:MM (omit to keep current)" },
          endTime:   { type: "string", description: "New end time HH:MM (omit to keep current)" },
        },
        required: ["id"],
      },
    },
  ],
}];

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: Record<string, unknown>; mutated?: object }> {
  if (name === "add_event") {
    const type = String(args.type ?? "event");
    const [created] = await db
      .insert(calendarEvents)
      .values({
        userId,
        title:       String(args.title),
        date:        String(args.date),
        type,
        startTime:   args.startTime ? String(args.startTime) : null,
        endTime:     args.endTime   ? String(args.endTime)   : null,
        description: String(args.description ?? ""),
        color:       EVENT_COLOR[type] ?? "#6366f1",
        completed:   false,
      })
      .returning();
    return { result: { success: true, id: created.id, message: `Created "${created.title}" on ${created.date}` }, mutated: created };
  }

  if (name === "delete_event") {
    const [deleted] = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, String(args.id)), eq(calendarEvents.userId, userId)))
      .returning();
    return { result: { success: !!deleted, message: deleted ? `Deleted "${deleted.title}"` : "Event not found" }, mutated: deleted };
  }

  if (name === "reschedule_event") {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (args.date)      patch.date      = String(args.date);
    if (args.startTime) patch.startTime = String(args.startTime);
    if (args.endTime)   patch.endTime   = String(args.endTime);
    const [updated] = await db
      .update(calendarEvents)
      .set(patch)
      .where(and(eq(calendarEvents.id, String(args.id)), eq(calendarEvents.userId, userId)))
      .returning();
    return { result: { success: !!updated, message: updated ? `Rescheduled "${updated.title}" to ${updated.date}` : "Event not found" }, mutated: updated };
  }

  return { result: { error: "Unknown function" } };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, weekStart, weekEnd, focusGoalHrs }: {
    messages: Message[];
    weekStart: string;
    weekEnd: string;
    focusGoalHrs: number;
  } = await req.json();

  if (!messages?.length) return Response.json({ error: "Missing messages" }, { status: 400 });

  // Load events for a wider window (2 weeks around current)
  const rangeStart = (() => { const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const rangeEnd   = (() => { const d = new Date(weekEnd   + "T12:00:00"); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

  const events = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.date, rangeStart), lte(calendarEvents.date, rangeEnd)));

  const eventLines = events.length > 0
    ? events
        .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
        .map((e) => `  id:${e.id} | ${e.date} ${e.startTime ?? "all-day"}${e.endTime ? "–"+e.endTime : ""} | "${e.title}" [${e.type}]${e.completed ? " ✓" : ""}`)
        .join("\n")
    : "  (no events in this range)";

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt =
    `You are a smart calendar assistant. You can answer questions about the user's schedule AND perform actions ` +
    `(add events, delete events, reschedule events) using the provided tools.\n\n` +
    `Today: ${today} | Current week: ${weekStart} to ${weekEnd}\n` +
    `Weekly Focus Time goal: ${focusGoalHrs} hrs\n\n` +
    `## Calendar events (${rangeStart} – ${rangeEnd})\n${eventLines}\n\n` +
    `When the user asks you to create, move, or delete something — USE the appropriate tool immediately, then confirm in a friendly message.\n` +
    `For scheduling requests, pick sensible times (e.g. "tomorrow morning" = 09:00, "afternoon" = 14:00).\n` +
    `Event types: "event" (default), "task" (has a checkbox), "study" (focus/learning).\n` +
    `Respond in the same language the user writes in. Be concise.`;

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
    const mutatedEvents: object[] = [];

    while (true) {
      const calls = result.response.functionCalls();
      if (!calls?.length) break;

      actionsExecuted += calls.length;
      const parts: Part[] = await Promise.all(
        calls.map(async (call) => {
          const { result: res, mutated } = await executeFunction(call.name, call.args as Record<string, unknown>, userId);
          if (mutated) mutatedEvents.push(mutated);
          return { functionResponse: { name: call.name, response: res } } as Part;
        })
      );
      result = await chat.sendMessage(parts);
    }

    // Auto-reschedule Focus Time blocks that overlap with newly added/moved events
    const timedTriggers = (mutatedEvents as { date: string; startTime?: string | null; endTime?: string | null; noteTitle?: string | null }[])
      .filter((ev) => ev.startTime && ev.endTime && ev.noteTitle !== AUTOFILL_MARK)
      .map((ev) => ({ date: ev.date, startTime: ev.startTime!, endTime: ev.endTime! }));

    let focusRescheduled = 0;
    let focusDeleted = 0;
    if (timedTriggers.length > 0) {
      const { rescheduled, deleted } = await rescheduleFocusBlocks(userId, timedTriggers);
      focusRescheduled = rescheduled.length;
      focusDeleted = deleted;
      mutatedEvents.push(...rescheduled);
    }

    return Response.json({ text: result.response.text(), actionsExecuted, mutatedEvents, focusRescheduled, focusDeleted });
  } catch (e) {
    console.error("[calendar/chat]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
