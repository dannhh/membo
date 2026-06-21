"use client";

import { useMemo, useState } from "react";
import { FolderTree, buildFolderPaths, type FolderRow } from "@/components/FolderTree";
import { DashboardTree, NoteCard, type NoteRow } from "@/components/DashboardTree";
import { useSession } from "@/components/SessionProvider";
import { ChatInterface } from "@/components/ChatInterface";

export function NotesWorkspace({ initialNotes, initialFolders }: { initialNotes: NoteRow[]; initialFolders: FolderRow[] }) {
  const { session, closeSession } = useSession();
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);

  const folderPaths = useMemo(() => buildFolderPaths(folders), [folders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    let unfiled = 0;
    for (const n of notes) {
      if (n.folderId) c[n.folderId] = (c[n.folderId] ?? 0) + 1;
      else unfiled++;
    }
    c.__unfiled__ = unfiled;
    return c;
  }, [notes]);

  function handleDelete(noteType: string, title: string) {
    setNotes((prev) => prev.filter((n) => !(n.noteType === noteType && n.title === title)));
  }

  function handleRename(noteType: string, oldTitle: string, newTitle: string) {
    setNotes((prev) => prev.map((n) => (n.noteType === noteType && n.title === oldTitle ? { ...n, title: newTitle } : n)));
  }

  function handleMove(noteType: string, title: string, folderId: string | null) {
    setNotes((prev) => prev.map((n) => (n.noteType === noteType && n.title === title ? { ...n, folderId } : n)));
  }

  async function handleCreateFolder(name: string, parentId: string | null) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    const row = await res.json();
    if (row?.id) setFolders((prev) => [...prev, row]);
  }

  function handleRenameFolder(id: string, name: string) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    fetch("/api/folders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
  }

  function handleDeleteFolder(id: string) {
    const idsToDelete = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
          idsToDelete.add(f.id);
          added = true;
        }
      }
    }
    setFolders((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    setNotes((prev) => prev.map((n) => (n.folderId && idsToDelete.has(n.folderId) ? { ...n, folderId: null } : n)));
    if (selectedFolderId && idsToDelete.has(selectedFolderId)) setSelectedFolderId(undefined);
    fetch("/api/folders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const visibleNotes =
    selectedFolderId === undefined ? notes
    : selectedFolderId === null ? notes.filter((n) => !n.folderId)
    : notes.filter((n) => n.folderId === selectedFolderId);

  if (!session && notes.length === 0 && folders.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <h1 className="text-xl font-bold text-gray-800 mb-6 shrink-0">Your Notes</h1>
        <div className="flex-1 flex items-center justify-center text-center text-gray-400">
          <div>
            <p className="font-medium">No notes yet.</p>
            <p className="text-sm mt-1">Type below to start a session.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <aside className="w-56 shrink-0 border-r border-gray-100 pr-4 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Your Notes</h1>
        <FolderTree
          folders={folders}
          counts={counts}
          selectedFolderId={selectedFolderId}
          onSelect={setSelectedFolderId}
          onCreate={handleCreateFolder}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
        />
      </aside>

      <div className="flex-1 min-w-0 h-full">
        {session ? (
          <div className="h-full flex flex-col rounded-[28px] bg-white shadow-lg border border-gray-200 overflow-hidden">
            <ChatInterface
              initialNoteType={session.noteType}
              initialTitle={session.title}
              initialMode={session.mode}
              initialSubMode={session.subMode}
              onClose={closeSession}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto pb-24">
            {visibleNotes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium">No notes here.</p>
              </div>
            ) : selectedFolderId === undefined || selectedFolderId === null ? (
              <DashboardTree
                notes={visibleNotes}
                folders={folders}
                folderPaths={folderPaths}
                onDelete={handleDelete}
                onRename={handleRename}
                onMove={handleMove}
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                {visibleNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    type={note.noteType}
                    subMode={note.content?.includes("# Vocabulary:") ? "vocab" : "general"}
                    folders={folders}
                    folderPaths={folderPaths}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onMove={handleMove}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
