import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { db, notes, noteMetadata } from "@/lib/db";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { TripPlannerPanel, type TripPlanData } from "@/components/TripPlannerPanel";

export default async function SharedNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [note] = await db
    .select({ userId: notes.userId, noteType: notes.noteType, title: notes.title, content: notes.content, isPublic: notes.isPublic })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.isPublic, true)))
    .limit(1);

  const isTrip = note?.noteType === "trip";

  let tripData: TripPlanData | null = null;
  if (note && isTrip) {
    const [meta] = await db
      .select({ content: noteMetadata.content })
      .from(noteMetadata)
      .where(and(eq(noteMetadata.userId, note.userId), eq(noteMetadata.noteType, note.noteType), eq(noteMetadata.noteTitle, note.title)))
      .limit(1);
    if (meta?.content) {
      try {
        const parsed = JSON.parse(meta.content);
        if (parsed.tripDetails && parsed.activities) tripData = parsed as TripPlanData;
      } catch { /* non-fatal */ }
    }
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header className="px-6 h-14 flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-800">
          <BookOpen size={16} className="text-violet-500" />
          Memory
        </Link>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden px-4 pb-6 sm:pb-10">
        {!note ? (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <p>This note isn&apos;t available. It may have been unshared or deleted.</p>
          </div>
        ) : (
          <div className={`h-full mx-auto rounded-2xl bg-white/72 backdrop-blur-sm border border-white/70 shadow-xl overflow-hidden flex flex-col ${isTrip ? "max-w-5xl" : "max-w-2xl"}`}>
            {isTrip ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-6 sm:px-8 pt-6 sm:pt-8">
                  <h1 className="text-xl font-bold text-gray-900 mb-4">{note.title}</h1>
                </div>
                <TripPlannerPanel data={tripData} />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">
                <h1 className="text-xl font-bold text-gray-900 mb-6">{note.title}</h1>
                {note.content ? (
                  <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs">
                    <MarkdownRenderer>{note.content}</MarkdownRenderer>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No content saved yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
