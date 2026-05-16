import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, notes, noteMetadata } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(notes.updatedAt);

  const userMetadata = await db
    .select()
    .from(noteMetadata)
    .where(eq(noteMetadata.userId, userId));

  const metadataSet = new Set(userMetadata.map((m) => `${m.noteType}/${m.noteTitle}`));

  const byType = userNotes.reduce<Record<string, typeof userNotes>>((acc, note) => {
    if (!acc[note.noteType]) acc[note.noteType] = [];
    acc[note.noteType].push(note);
    return acc;
  }, {});

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
          <div className="flex flex-col gap-10">
            {Object.entries(NOTE_TYPE_REGISTRY).map(([type, typeConfig]) => {
              const typeNotes = byType[type];
              if (!typeNotes || typeNotes.length === 0) return null;
              const TypeIcon = typeConfig.icon;
              return (
                <section key={type}>
                  <div className="flex items-center gap-2 mb-4">
                    <TypeIcon size={15} className="text-indigo-600" />
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {typeConfig.label}s
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeNotes.map((note) => {
                      const hasMetadata = metadataSet.has(`${note.noteType}/${note.title}`);
                      return (
                        <Card key={note.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <h2 className="font-semibold text-gray-900 truncate">{note.title}</h2>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Clock size={11} />
                              {note.updatedAt.toLocaleDateString()}
                            </p>
                          </CardHeader>
                          <CardContent>
                            {note.summary && (
                              <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                                {note.summary}
                              </p>
                            )}
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(typeConfig.modes).map(([modeKey, modeConfig]) => {
                                const ModeIcon = modeConfig.icon;
                                const isHighlighted =
                                  modeKey !== typeConfig.defaultMode && hasMetadata;
                                return (
                                  <Button
                                    key={modeKey}
                                    variant={isHighlighted ? "default" : "ghost"}
                                    size="sm"
                                    asChild
                                    className="flex-1 text-xs"
                                  >
                                    <Link
                                      href={`/learn?noteType=${type}&title=${encodeURIComponent(note.title)}&mode=${modeKey}`}
                                    >
                                      <ModeIcon size={12} className="mr-1" /> {modeConfig.label}
                                    </Link>
                                  </Button>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
