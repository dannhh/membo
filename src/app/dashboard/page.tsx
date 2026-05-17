import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, notes } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import { DashboardTree } from "@/components/DashboardTree";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const userNotes = await db
    .select({
      id: notes.id,
      title: notes.title,
      noteType: notes.noteType,
      content: notes.content,
      summary: notes.summary,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(notes.updatedAt);

  const byType = userNotes.reduce<Record<string, typeof userNotes>>((acc, note) => {
    if (!acc[note.noteType]) acc[note.noteType] = [];
    acc[note.noteType].push(note);
    return acc;
  }, {});

  const sections = Object.entries(NOTE_TYPE_REGISTRY).flatMap(([type]) => {
    const typeNotes = byType[type];
    if (!typeNotes || typeNotes.length === 0) return [];

    const vocabNotes = typeNotes.filter((n) => n.content?.includes("# Vocabulary:"));
    const generalNotes = typeNotes.filter((n) => !n.content?.includes("# Vocabulary:"));

    return [{
      type,
      groups: [
        ...(vocabNotes.length ? [{ label: "Vocab", subMode: "vocab", notes: vocabNotes }] : []),
        ...(generalNotes.length ? [{ label: "General", subMode: "general", notes: generalNotes }] : []),
      ],
    }];
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Notes</h1>
          <Button asChild>
            <Link href="/learn">
              <Plus size={16} className="mr-1" /> New session
            </Link>
          </Button>
        </div>

        {userNotes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-medium">No notes yet.</p>
            <p className="text-sm mt-1">Start a session to begin.</p>
            <Button asChild className="mt-6">
              <Link href="/learn">Start your first session</Link>
            </Button>
          </div>
        ) : (
          <DashboardTree sections={sections} />
        )}
      </main>
    </div>
  );
}
