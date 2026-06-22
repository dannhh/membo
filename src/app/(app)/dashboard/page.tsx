import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, notes, folders } from "@/lib/db";
import { NotesWorkspace } from "@/components/NotesWorkspace";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userName = user?.firstName ?? user?.username ?? null;

  const [userNotes, userFolders] = await Promise.all([
    db
      .select({
        id: notes.id,
        title: notes.title,
        noteType: notes.noteType,
        content: notes.content,
        summary: notes.summary,
        folderId: notes.folderId,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt)),
    db
      .select({ id: folders.id, name: folders.name, parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.userId, userId)),
  ]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden px-3 sm:px-4 pt-3 pb-4">
      <div className="h-full max-w-6xl mx-auto rounded-2xl bg-white/72 backdrop-blur-sm border border-white/70 shadow-xl overflow-hidden">
        <NotesWorkspace initialNotes={userNotes} initialFolders={userFolders} userName={userName} />
      </div>
    </div>
  );
}
