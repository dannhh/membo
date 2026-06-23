"use client";

import { useMemo, useState } from "react";
import { Folder as FolderIcon, X, Layers } from "lucide-react";
import { FolderTree, buildFolderPaths, type FolderRow } from "@/components/FolderTree";
import { NoteCard, type NoteRow } from "@/components/DashboardTree";
import { useSession } from "@/components/SessionProvider";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatBar } from "@/components/ChatBar";
import { ReviewQueue } from "@/components/ReviewQueue";
import { cn } from "@/lib/utils";

export function NotesWorkspace({ initialNotes, initialFolders, userName }: { initialNotes: NoteRow[]; initialFolders: FolderRow[]; userName?: string | null }) {
  const { session, closeSession } = useSession();
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState({ done: 0, total: 0 });
  const [reviewScope, setReviewScope] = useState<{ noteType: string; title: string } | null>(null);

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

  const totalDue = useMemo(() => notes.reduce((sum, n) => sum + (n.dueCount ?? 0), 0), [notes]);

  async function refreshNotes() {
    try {
      const res = await fetch("/api/notes");
      const data: NoteRow[] = await res.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setNotes(data);
      }
    } catch {
      // non-fatal — list just stays as-is until next refresh
    }
  }

  // Close the session immediately, then pull fresh notes so a newly created
  // note shows up without a manual page refresh.
  function handleCloseSession() {
    closeSession();
    refreshNotes();
  }

  function startReview() {
    setReviewScope(null);
    setReviewProgress({ done: 0, total: totalDue });
    setReviewing(true);
  }

  function reviewNote(noteType: string, title: string) {
    const due = notes.find((n) => n.noteType === noteType && n.title === title)?.dueCount ?? 0;
    setReviewScope({ noteType, title });
    setReviewProgress({ done: 0, total: due });
    setReviewing(true);
  }

  function exitReview() {
    setReviewing(false);
    setReviewScope(null);
    refreshNotes();
  }

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
    : notes.filter((n) => n.folderId === selectedFolderId);

  const isEmpty = !session && notes.length === 0 && folders.length === 0;

  return (
    <div className="flex h-full w-full">
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] bg-white shadow-2xl p-4 overflow-y-auto transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-auto lg:translate-x-0 lg:h-full lg:w-56 lg:shrink-0 lg:border-r lg:border-gray-100 lg:p-4 lg:shadow-none"
        )}
      >
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">{userName ? `${userName}'s Notes` : "Your Notes"}</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <FolderTree
          folders={folders}
          counts={counts}
          selectedFolderId={selectedFolderId}
          onSelect={(id) => { setSelectedFolderId(id); setSidebarOpen(false); }}
          onCreate={handleCreateFolder}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
        />
      </aside>

      <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden p-6 sm:p-8 flex flex-col">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <p className="font-medium">No notes yet.</p>
              <p className="text-sm mt-1">Type below to start a session.</p>
            </div>
          </div>
        ) : (
          <>
            {!session && !reviewing && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden shrink-0 self-start mb-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300"
              >
                <FolderIcon size={14} />
                Folders
              </button>
            )}
            {!session && (reviewing || totalDue > 0) && (
              reviewing ? (
                <div className="shrink-0 mb-4 flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Layers size={17} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {reviewScope ? reviewScope.title : "Reviewing flashcards"}
                      </p>
                      <span className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
                        {reviewProgress.done}/{reviewProgress.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-violet-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${reviewProgress.total ? (reviewProgress.done / reviewProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={exitReview}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors shrink-0"
                    aria-label="Exit review"
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startReview}
                  className="shrink-0 mb-4 w-full text-left flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 hover:from-violet-100 hover:to-purple-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Layers size={17} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {totalDue} flashcard{totalDue === 1 ? "" : "s"} due for review
                    </p>
                    <p className="text-xs text-gray-500">Review now to lock it into memory →</p>
                  </div>
                </button>
              )
            )}
            {session ? (
              <div className="flex-1 min-h-0 flex flex-col rounded-[28px] bg-white shadow-lg border border-gray-200 overflow-hidden">
                <ChatInterface
                  initialNoteType={session.noteType}
                  initialTitle={session.title}
                  initialMode={session.mode}
                  initialSubMode={session.subMode}
                  initialFolderId={session.folderId}
                  onClose={handleCloseSession}
                />
              </div>
            ) : reviewing ? (
              <div className="flex-1 min-h-0 flex flex-col rounded-[28px] bg-white shadow-lg border border-gray-200 overflow-hidden p-5 sm:p-7">
                <ReviewQueue
                  embedded
                  noteType={reviewScope?.noteType}
                  title={reviewScope?.title}
                  onProgress={(done, total) => setReviewProgress({ done, total })}
                  onClose={exitReview}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pb-24">
                {visibleNotes.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <p className="font-medium">No notes here.</p>
                  </div>
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
                        onReview={reviewNote}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {!reviewing && <ChatBar currentFolderId={selectedFolderId ?? null} />}
      </div>
    </div>
  );
}
