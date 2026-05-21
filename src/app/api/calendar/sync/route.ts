import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, calendarEvents } from "@/lib/db";
import { gcalListEvents, parseGCalEvent, getClerkGoogleToken } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getClerkGoogleToken(userId);
  if (!token) {
    return NextResponse.json(
      { error: "No Google account connected. Sign in with Google to enable sync." },
      { status: 400 }
    );
  }

  const { month } = await req.json(); // YYYY-MM
  const [y, m] = month.split("-").map(Number);
  const timeMin = new Date(y, m - 1, 1).toISOString();
  const timeMax = new Date(y, m, 0, 23, 59, 59).toISOString();

  const googleEvents = await gcalListEvents(token, timeMin, timeMax);

  let imported = 0, updated = 0;

  for (const gev of googleEvents) {
    const { date, startTime, endTime, color } = parseGCalEvent(gev);
    const title = gev.summary ?? "(No title)";
    const description = gev.description ?? "";

    const existing = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.googleEventId, gev.id)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(calendarEvents)
        .set({ title, description, date, startTime, endTime, color, updatedAt: new Date() })
        .where(eq(calendarEvents.id, existing[0].id));
      updated++;
    } else {
      await db.insert(calendarEvents).values({
        userId, title, description, date, startTime, endTime,
        type: "event", color, googleEventId: gev.id,
      });
      imported++;
    }
  }

  return NextResponse.json({ imported, updated, total: googleEvents.length });
}
