import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, calendarEvents } from "@/lib/db";
import { toGCalBody, gcalCreateEvent, gcalUpdateEvent, gcalDeleteEvent, getClerkGoogleToken } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  const conditions = [eq(calendarEvents.userId, userId)];
  if (month) {
    conditions.push(gte(calendarEvents.date, `${month}-01`));
    conditions.push(lte(calendarEvents.date, `${month}-31`));
  }

  const rows = await db.select().from(calendarEvents).where(and(...conditions));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, date, startTime, endTime, type, color, noteTitle } = await req.json();

  const [created] = await db
    .insert(calendarEvents)
    .values({ userId, title, description: description ?? "", date, startTime, endTime, type: type ?? "event", color: color ?? "#6366f1", noteTitle })
    .returning();

  const token = await getClerkGoogleToken(userId);
  if (token) {
    try {
      const gev = await gcalCreateEvent(token, toGCalBody({ title, description, date, startTime, endTime }));
      const [withGoogleId] = await db
        .update(calendarEvents)
        .set({ googleEventId: gev.id })
        .where(eq(calendarEvents.id, created.id))
        .returning();
      return NextResponse.json(withGoogleId);
    } catch {
      // Google sync failed — return local event without blocking
    }
  }

  return NextResponse.json(created);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...fields } = await req.json();
  const [updated] = await db
    .update(calendarEvents)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
    .returning();

  if (updated.googleEventId) {
    const token = await getClerkGoogleToken(userId);
    if (token) {
      try {
        await gcalUpdateEvent(
          token,
          updated.googleEventId,
          toGCalBody({
            title: updated.title,
            description: updated.description,
            date: updated.date,
            startTime: updated.startTime,
            endTime: updated.endTime,
          })
        );
      } catch {
        // Google sync failed — local update already committed
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  const [deleted] = await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
    .returning();

  if (deleted?.googleEventId) {
    const token = await getClerkGoogleToken(userId);
    if (token) {
      try {
        await gcalDeleteEvent(token, deleted.googleEventId);
      } catch {
        // Google sync failed — local delete already committed
      }
    }
  }

  return NextResponse.json({ ok: true });
}
