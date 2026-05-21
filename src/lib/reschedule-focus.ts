import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";

export const AUTOFILL_MARK = "__autofill__";

const WORK_START = 8 * 60;
const WORK_END = 21 * 60;
const BUFFER = 15;

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fromMins(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function overlaps(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  return toMins(a.startTime) < toMins(b.endTime) && toMins(a.endTime) > toMins(b.startTime);
}

function findFreeSlot(
  durationMins: number,
  busyBlocks: { start: number; end: number }[],
  preferredStart: number
): { startTime: string; endTime: string } | null {
  const sorted = [...busyBlocks].sort((a, b) => a.start - b.start);
  const candidates: { start: number }[] = [];

  let cursor = WORK_START;
  for (const slot of [...sorted, { start: WORK_END, end: WORK_END }]) {
    const freeEnd = slot.start - BUFFER;
    while (cursor + durationMins <= freeEnd) {
      candidates.push({ start: cursor });
      cursor += 15;
    }
    cursor = Math.max(cursor, slot.end + BUFFER);
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => Math.abs(a.start - preferredStart) - Math.abs(b.start - preferredStart)
  );
  const best = candidates[0];
  return { startTime: fromMins(best.start), endTime: fromMins(best.start + durationMins) };
}

type DbEvent = typeof calendarEvents.$inferSelect;

/**
 * For each newly added/moved timed event, find any autofill Focus Time blocks
 * on the same date that now overlap and move them to the nearest free slot.
 * Returns { rescheduled, deleted } — rescheduled contains the updated DB rows.
 */
export async function rescheduleFocusBlocks(
  userId: string,
  triggerEvents: { date: string; startTime: string; endTime: string }[]
): Promise<{ rescheduled: DbEvent[]; deleted: number }> {
  if (triggerEvents.length === 0) return { rescheduled: [], deleted: 0 };

  const dateSet = new Set(triggerEvents.map((e) => e.date));
  const allRescheduled: DbEvent[] = [];
  let totalDeleted = 0;

  for (const date of dateSet) {
    const triggers = triggerEvents.filter((e) => e.date === date);

    const dayEvents = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.date, date)));

    const overlappingFocus = dayEvents.filter(
      (e) =>
        e.noteTitle === AUTOFILL_MARK &&
        e.startTime &&
        e.endTime &&
        triggers.some((t) =>
          overlaps(
            { startTime: e.startTime!, endTime: e.endTime! },
            { startTime: t.startTime, endTime: t.endTime }
          )
        )
    );

    if (overlappingFocus.length === 0) continue;

    const focusIds = new Set(overlappingFocus.map((e) => e.id));
    const busyBlocks = dayEvents
      .filter((e) => !focusIds.has(e.id) && e.startTime && e.endTime)
      .map((e) => ({ start: toMins(e.startTime!), end: toMins(e.endTime!) }));

    for (const focus of overlappingFocus) {
      const duration = toMins(focus.endTime!) - toMins(focus.startTime!);
      const slot = findFreeSlot(duration, busyBlocks, toMins(focus.startTime!));

      if (slot) {
        const [updated] = await db
          .update(calendarEvents)
          .set({ startTime: slot.startTime, endTime: slot.endTime, updatedAt: new Date() })
          .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, focus.id)))
          .returning();
        allRescheduled.push(updated);
        busyBlocks.push({ start: toMins(slot.startTime), end: toMins(slot.endTime) });
      } else {
        await db
          .delete(calendarEvents)
          .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, focus.id)));
        totalDeleted++;
      }
    }
  }

  return { rescheduled: allRescheduled, deleted: totalDeleted };
}
