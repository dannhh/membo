import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface EventSummary {
  type: string;
  date: string;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { events }: { events: EventSummary[] } = await req.json();

  const studyEvents = events.filter((e) => e.type === "study");

  const eventList = studyEvents
    .map((e) => `- ${e.date}: "${e.title}"${e.startTime && e.endTime ? ` (${e.startTime}–${e.endTime})` : ""}`)
    .join("\n") || "No study events recorded yet.";

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(
    `You are a productivity coach. The user has these study/focus events this month:\n${eventList}\n\n` +
    `Suggest a realistic weekly focus time goal in hours (integer, between 5 and 40). ` +
    `Consider their current study load and a healthy progression. ` +
    `Respond with ONLY a JSON object — no markdown, no explanation outside JSON: {"hours": <integer>, "reason": "<one sentence, max 80 chars>"}`
  );

  const text = result.response.text().trim();
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, ""));
    const hrs = Math.min(40, Math.max(5, Math.round(Number(parsed.hours))));
    return NextResponse.json({ suggestedHrs: hrs, reason: parsed.reason ?? "" });
  } catch {
    return NextResponse.json({ suggestedHrs: 20, reason: "A solid baseline for consistent weekly progress." });
  }
}