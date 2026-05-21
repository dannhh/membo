import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { rescheduleFocusBlocks } from "@/lib/reschedule-focus";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEvent }: { newEvent: { date: string; startTime: string; endTime: string } } =
    await req.json();

  if (!newEvent.startTime || !newEvent.endTime) {
    return NextResponse.json({ rescheduled: [], deleted: 0 });
  }

  const result = await rescheduleFocusBlocks(userId, [newEvent]);
  return NextResponse.json(result);
}
