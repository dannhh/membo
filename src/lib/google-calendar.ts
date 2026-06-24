import { clerkClient } from "@clerk/nextjs/server";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

const GCAL_COLOR_MAP: Record<number, string> = {
  1: "#7986cb", 2: "#33b679", 3: "#8e24aa", 4: "#e67c73",
  5: "#f6bf26", 6: "#f4511e", 7: "#039be5", 8: "#616161",
  9: "#3f51b5", 10: "#0b8043", 11: "#d50000",
};

export class GCalError extends Error {
  constructor(message: string, public status: number, public body: string = "") {
    super(message);
    this.name = "GCalError";
  }
}

export interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId?: string;
  status?: string;
}

export function parseGCalEvent(ev: GCalEvent) {
  const isAllDay = !!ev.start.date;
  const date = isAllDay ? ev.start.date! : ev.start.dateTime!.slice(0, 10);
  const startTime = isAllDay ? null : ev.start.dateTime!.slice(11, 16);
  const endTime = isAllDay ? null : (ev.end.dateTime?.slice(11, 16) ?? null);
  const color = ev.colorId ? (GCAL_COLOR_MAP[Number(ev.colorId)] ?? "#6366f1") : "#6366f1";
  return { date, startTime, endTime, color };
}

export function toGCalBody(fields: {
  title: string;
  description?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}) {
  const { title, description, date, startTime, endTime } = fields;
  if (!startTime) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const endDate = d.toISOString().slice(0, 10);
    return { summary: title, description: description ?? "", start: { date }, end: { date: endDate } };
  }
  return {
    summary: title,
    description: description ?? "",
    start: { dateTime: `${date}T${startTime}:00` },
    end: { dateTime: endTime ? `${date}T${endTime}:00` : `${date}T${startTime}:00` },
  };
}

export async function getClerkGoogleToken(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "google");
    return tokens.data[0]?.token ?? null;
  } catch (err) {
    console.error("[gcal] getClerkGoogleToken failed:", err);
    return null;
  }
}

export async function gcalListEvents(token: string, timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  const url = new URL(`${GCAL_BASE}/calendars/primary/events`);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GCalError(`Google Calendar list failed: ${res.status}`, res.status, body);
  }
  const data = await res.json();
  return (data.items ?? []).filter((e: GCalEvent) => e.status !== "cancelled");
}

export async function gcalCreateEvent(token: string, body: ReturnType<typeof toGCalBody>): Promise<GCalEvent> {
  const res = await fetch(`${GCAL_BASE}/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar create failed: ${res.status}`);
  return res.json();
}

export async function gcalUpdateEvent(token: string, googleEventId: string, body: ReturnType<typeof toGCalBody>): Promise<void> {
  const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${googleEventId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar update failed: ${res.status}`);
}

export async function gcalDeleteEvent(token: string, googleEventId: string): Promise<void> {
  const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete failed: ${res.status}`);
  }
}
