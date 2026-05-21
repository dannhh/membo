import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const AUTOFILL_MARK = "__autofill__";

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fromMins(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// Algorithmic fallback: fills gaps with fixed 2-hour blocks
function algorithmicFill(
  weekEvents: { date: string; startTime: string | null; endTime: string | null }[],
  weekStart: string,
  remainingMins: number
): { date: string; startTime: string; endTime: string }[] {
  const WORK_START = 9 * 60;
  const WORK_END   = 21 * 60;
  const BLOCK      = 120;

  const busyByDate: Record<string, { start: number; end: number }[]> = {};
  for (const e of weekEvents) {
    if (!e.startTime || !e.endTime) continue;
    if (!busyByDate[e.date]) busyByDate[e.date] = [];
    busyByDate[e.date].push({ start: toMins(e.startTime), end: toMins(e.endTime) });
  }

  const startDate = new Date(weekStart + "T12:00:00");
  const allDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const orderedDates = [...allDates.slice(0, 5), ...allDates.slice(5)];

  const slots: { date: string; startTime: string; endTime: string }[] = [];

  for (const date of orderedDates) {
    if (remainingMins <= 0) break;
    const busy = (busyByDate[date] ?? []).sort((a, b) => a.start - b.start);
    let cursor = WORK_START;
    for (const slot of [...busy, { start: WORK_END, end: WORK_END }]) {
      while (remainingMins > 0 && cursor + BLOCK <= slot.start) {
        const take = Math.min(BLOCK, remainingMins);
        slots.push({ date, startTime: fromMins(cursor), endTime: fromMins(cursor + take) });
        remainingMins -= take;
        cursor += take;
      }
      cursor = Math.max(cursor, slot.end);
    }
  }

  return slots;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalHrs, weekStart, weekEnd }: { goalHrs: number; weekStart: string; weekEnd: string } =
    await req.json();

  // 1. Remove old auto-fill blocks for this week
  const removed = await db
    .delete(calendarEvents)
    .where(and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.noteTitle, AUTOFILL_MARK),
      gte(calendarEvents.date, weekStart),
      lte(calendarEvents.date, weekEnd)
    ))
    .returning();

  // 2. Fetch all remaining events for the week
  const weekEvents = await db
    .select()
    .from(calendarEvents)
    .where(and(
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.date, weekStart),
      lte(calendarEvents.date, weekEnd)
    ));

  // 3. How many hours still need to be scheduled
  const manualStudyHrs = weekEvents
    .filter((e) => e.type === "study")
    .reduce((acc, e) => {
      if (e.startTime && e.endTime)
        return acc + Math.max(0, (toMins(e.endTime) - toMins(e.startTime)) / 60);
      return acc + 1;
    }, 0);

  const remainingHrs = Math.max(0, goalHrs - manualStudyHrs);
  if (remainingHrs <= 0) return NextResponse.json({ created: [], removed });

  // 4. Build event list for Gemini context
  const timedEvents = weekEvents.filter((e) => e.startTime && e.endTime);
  const eventSummary = timedEvents.length > 0
    ? timedEvents
        .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
        .map((e) => `  ${e.date} ${e.startTime}–${e.endTime}  "${e.title}" [${e.type}]`)
        .join("\n")
    : "  (no existing timed events)";

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt =
    `You are an expert productivity scheduler who understands human energy rhythms and wellbeing.\n` +
    `Schedule exactly ${remainingHrs} hours of focused deep-work time for the week ${weekStart} to ${weekEnd}.\n\n` +
    `Existing calendar events:\n${eventSummary}\n\n` +
    `HARD constraints (never violate):\n` +
    `- Only schedule within 08:00–21:00\n` +
    `- Never overlap any existing event\n` +
    `- Leave at least 15 min buffer before and after every existing event\n` +
    `- Never schedule during lunch: 12:00–13:30\n` +
    `- Never schedule during afternoon rest: 13:30–14:30\n` +
    `- Never schedule during dinner time: 18:30–19:30\n` +
    `- No focus block longer than 3 hours — the brain needs breaks\n` +
    `- Leave at least 10 min gap between consecutive focus blocks on the same day\n\n` +
    `SOFT preferences (follow when possible):\n` +
    `- Best focus window: 08:30–12:00 (use for hardest/longest blocks)\n` +
    `- Good afternoon window: 14:30–18:30\n` +
    `- Light evening work only: 19:30–21:00 (max 1 h per day in this slot)\n` +
    `- Use varied block lengths (45 min, 1 h, 1.5 h, 2 h, 2.5 h) — match the gap size naturally\n` +
    `- Spread across multiple days; no single day should carry more than 40% of the weekly total\n` +
    `- Prioritise Mon–Fri; use Sat/Sun only if weekdays cannot fit the remaining hours\n` +
    `- If a day already has meetings/events in the morning, put focus time in the afternoon instead\n\n` +
    `Return ONLY a JSON array — no markdown, no explanation outside the JSON:\n` +
    `[{"date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM"}, ...]\n\n` +
    `The total duration of all returned blocks must sum to exactly ${remainingHrs} hours.`;

  let toCreate: { date: string; startTime: string; endTime: string }[] = [];

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      toCreate = parsed.filter(
        (s) => typeof s.date === "string" && typeof s.startTime === "string" && typeof s.endTime === "string"
      );
    }
  } catch {
    // AI failed — fall back to algorithmic fill
    toCreate = algorithmicFill(weekEvents, weekStart, Math.round(remainingHrs * 60));
  }

  // 5. Persist
  const created = toCreate.length > 0
    ? await db
        .insert(calendarEvents)
        .values(toCreate.map((s) => ({
          userId,
          title: "Focus Time",
          description: "",
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          type: "study" as const,
          color: "#10b981",
          noteTitle: AUTOFILL_MARK,
        })))
        .returning()
    : [];

  return NextResponse.json({ created, removed });
}
