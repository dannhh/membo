import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, calendarEvents } from "@/lib/db";
import { gcalListEvents, parseGCalEvent, getClerkGoogleToken, GCalError } from "@/lib/google-calendar";

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

  let googleEvents;
  try {
    googleEvents = await gcalListEvents(token, timeMin, timeMax);
  } catch (err) {
    if (err instanceof GCalError) {
      console.error(`[gcal] sync failed (${err.status}):`, err.body);
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          {
            error:
              "Google Calendar access was denied. Reconnect your Google account and grant calendar access.",
            status: err.status,
          },
          { status: 403 }
        );
      }
    } else {
      console.error("[gcal] sync failed:", err);
    }
    return NextResponse.json({ error: "Google Calendar sync failed. Please try again." }, { status: 502 });
  }

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
