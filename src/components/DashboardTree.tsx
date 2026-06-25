"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronRight, Clock, Pencil, Trash2, X, FolderInput, FileText, Layers, Globe, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import type { NoteType } from "@/lib/note-types";
import { TripPlannerPanel } from "@/components/TripPlannerPanel";
import type { TripPlanData } from "@/components/TripPlannerPanel";
import type { FolderRow } from "@/components/FolderTree";
import { useSession } from "@/components/SessionProvider";
import { CollapsibleMarkdown } from "@/components/CollapsibleMarkdown";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

interface WritingSubmissionRow {
  id: string;
  rubricName: string;
  essayText: string;
  feedback: string;
  score: string | null;
  createdAt: string;
}

function formatSubmissionDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" });
}

function SubmissionDetailCard({ submission }: { submission: WritingSubmissionRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? <ChevronDown size={14} className="shrink-0 text-gray-400" /> : <ChevronRight size={14} className="shrink-0 text-gray-400" />}
          <span className="text-sm text-gray-500 shrink-0">{formatSubmissionDate(submission.createdAt)}</span>
          <span className="text-sm font-medium text-gray-700 truncate">{submission.rubricName}</span>
        </div>
        {submission.score && (
          <span className="shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 bg-violet-100 text-violet-600">
            {submission.score}
          </span>
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Submission</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{submission.essayText}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Feedback</p>
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-gray-800">
              <MarkdownRenderer>{submission.feedback}</MarkdownRenderer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WritingHistoryPanel({ submissions, loading }: { submissions: WritingSubmissionRow[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-gray-400 px-6 py-5">Loading submission history...</p>;
  if (submissions.length === 0) return <p className="text-gray-400 italic text-sm px-6 py-5">No submissions yet.</p>;

  const latest = submissions[0];
  const scores = submissions.map((s) => parseFloat(s.score ?? "")).filter((n) => !isNaN(n));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  return (
    <div className="bg-gray-50 px-6 py-6 flex flex-col gap-6">
      {/* Latest Submission */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Latest Submission</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{latest.rubricName}</span>
            <span className="text-xs text-gray-400">{formatSubmissionDate(latest.createdAt)}</span>
          </div>
          {latest.score && (
            <span className="shrink-0 text-sm font-semibold rounded-full px-3 py-1 bg-violet-100 text-violet-600">
              {latest.score}
            </span>
          )}
        </div>
      </div>

      {/* Score Dashboard */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Score Dashboard</h2>
        <div className="flex gap-4 flex-wrap mb-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Attempts</span>
            <span className="text-2xl font-bold text-gray-800">{submissions.length}</span>
          </div>
          {avgScore !== null && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-1 min-w-[140px]">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Average</span>
              <span className="text-2xl font-bold text-gray-800">{avgScore.toFixed(1)}</span>
            </div>
          )}
          {bestScore !== null && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-1 min-w-[140px]">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Best</span>
              <span className="text-2xl font-bold text-gray-800">{bestScore.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Rubric</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">Score</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{formatSubmissionDate(s.createdAt)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{s.rubricName}</td>
                  <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{s.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Submission Detail</h2>
        <div className="flex flex-col gap-3">
          {submissions.map((s) => <SubmissionDetailCard key={s.id} submission={s} />)}
        </div>
      </div>
    </div>
  );
}

function NoteModal({ note, type, onClose, onReview, onContentChange }: { note: NoteRow; type: string; onClose: () => void; onReview: (noteType: string, title: string) => void; onContentChange?: (noteType: string, title: string, content: string) => void }) {
  const [tripData, setTripData] = useState<TripPlanData | null>(null);
  const isTrip = type === "trip";
  const [content, setContent] = useState(note.content ?? "");
  const isWriting = type === "concept" && !!content.includes("# Writing Practice:");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const canEdit = !isTrip && !isWriting;

  function startEditing() {
    setDraft(content);
    setEditing(true);
  }

  async function saveContent() {
    setSavingContent(true);
    try {
      await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType: type, title: note.title, content: draft }),
      });
      setContent(draft);
      onContentChange?.(type, note.title, draft);
      setEditing(false);
    } finally {
      setSavingContent(false);
    }
  }
  const [submissions, setSubmissions] = useState<WritingSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(isWriting);
  const [doc, setDoc] = useState<{ name: string | null; content: string } | null>(null);
  const [cards, setCards] = useState<{ id: string; front: string; back: string; dueAt: string }[]>([]);
  const [isPublic, setIsPublic] = useState(!!note.isPublic);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/${note.id}` : "";

  async function toggleShare() {
    const next = !isPublic;
    setSharing(true);
    try {
      await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType: type, title: note.title, isPublic: next }),
      });
      setIsPublic(next);
    } finally {
      setSharing(false);
    }
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (isTrip || isWriting) return;
    fetch(`/api/flashcards?noteType=${encodeURIComponent(type)}&title=${encodeURIComponent(note.title)}&all=1`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.cards)) setCards(d.cards); })
      .catch(() => {});
  }, [isTrip, isWriting, type, note.title]);

  useEffect(() => {
    if (!isTrip) return;
    fetch(`/api/notes?noteType=trip&title=${encodeURIComponent(note.title)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.metadataContent) {
          try {
            const parsed = JSON.parse(d.metadataContent);
            if (parsed.tripDetails && parsed.activities) setTripData(parsed as TripPlanData);
          } catch { /* non-fatal */ }
        }
      })
      .catch(() => {});
  }, [isTrip, note.title]);

  useEffect(() => {
    if (isTrip || isWriting) return;
    fetch(`/api/notes?noteType=${encodeURIComponent(type)}&title=${encodeURIComponent(note.title)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.documentContent) setDoc({ name: d.documentName ?? null, content: d.documentContent });
      })
      .catch(() => {});
  }, [isTrip, isWriting, type, note.title]);

  useEffect(() => {
    if (!isWriting) return;
    fetch(`/api/writing-submissions?noteType=concept&title=${encodeURIComponent(note.title)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.submissions)) setSubmissions(d.submissions);
      })
      .catch(() => {})
      .finally(() => setSubmissionsLoading(false));
  }, [isWriting, note.title]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-xl flex flex-col ${isTrip ? "w-full max-w-5xl" : "w-full max-w-2xl"}`}
        style={{ maxHeight: isTrip ? "90vh" : "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base truncate">{note.title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={savingContent}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveContent}
                    disabled={savingContent}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-50"
                  >
                    <Check size={13} />
                    {savingContent ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              )
            )}
            <button
              onClick={toggleShare}
              disabled={sharing}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                isPublic ? "bg-violet-100 text-violet-600 hover:bg-violet-200" : "border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Globe size={13} />
              {isPublic ? "Public" : "Share"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        {isPublic && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-violet-50 border-b border-violet-100 shrink-0">
            <Globe size={13} className="text-violet-500 shrink-0" />
            <p className="text-xs text-violet-700 truncate flex-1">Anyone with this link can view this note</p>
            <button
              onClick={copyShareLink}
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
        {isTrip ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TripPlannerPanel data={tripData} />
          </div>
        ) : isWriting ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <WritingHistoryPanel submissions={submissions} loading={submissionsLoading} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 text-gray-800">
            {editing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                spellCheck={false}
                className="w-full min-h-[50vh] resize-y rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-sm leading-relaxed text-gray-800 font-mono outline-none focus:border-violet-300 focus:bg-white"
                placeholder="Write note content in Markdown…"
              />
            ) : content
              ? <CollapsibleMarkdown content={content} />
              : doc || cards.length > 0
              ? null
              : <p className="text-gray-400 italic">No content saved yet.</p>
            }
            {!editing && doc && (
              <details className={`group ${content ? "mt-6 pt-5 border-t border-gray-100" : ""}`} open={!content}>
                <summary className="flex items-center gap-1.5 cursor-pointer list-none text-xs font-medium text-violet-600 hover:text-violet-700 select-none">
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">Imported document{doc.name ? `: ${doc.name}` : ""}</span>
                  <ChevronRight size={13} className="ml-auto transition-transform group-open:rotate-90" />
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-500 font-sans bg-gray-50 rounded-lg p-3 max-h-[45vh] overflow-y-auto">
                  {doc.content}
                </pre>
              </details>
            )}
            {!editing && cards.length > 0 && (() => {
              const dueNow = cards.filter((c) => new Date(c.dueAt) <= new Date()).length;
              return (
                <div className={content || doc ? "mt-6 pt-5 border-t border-gray-100" : ""}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-violet-600">
                      <Layers size={13} className="shrink-0" />
                      <span>{cards.length} flashcard{cards.length === 1 ? "" : "s"}{dueNow > 0 ? ` · ${dueNow} due` : ""}</span>
                    </div>
                    <button
                      onClick={() => { onClose(); onReview(type, note.title); }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        dueNow > 0 ? "bg-violet-500 text-white hover:bg-violet-600" : "border border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {dueNow > 0 ? `Review ${dueNow} due` : "Review all"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {cards.map((c) => (
                      <details key={c.id} className="group rounded-lg border border-gray-100 bg-gray-50/60">
                        <summary className="flex items-center gap-1.5 cursor-pointer list-none px-3 py-2 text-xs font-medium text-gray-700 select-none">
                          <ChevronRight size={12} className="shrink-0 transition-transform group-open:rotate-90 text-gray-400" />
                          <span className="truncate">{c.front}</span>
                        </summary>
                        <div className="px-3 pb-2.5 pl-7 prose prose-xs max-w-none text-xs text-gray-600">
                          <MarkdownRenderer>{c.back}</MarkdownRenderer>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export interface NoteRow {
  id: string;
  title: string;
  noteType: string;
  content: string | null;
  summary: string | null;
  updatedAt: Date;
  folderId: string | null;
  isPublic?: boolean;
  dueCount?: number;
}

export type DeleteFn = (noteType: string, title: string) => void;
export type RenameFn = (noteType: string, oldTitle: string, newTitle: string) => void;
export type MoveFn = (noteType: string, title: string, folderId: string | null) => void;

export function NoteCard({
  note, type, subMode, folders, folderPaths, onDelete, onRename, onMove, onReview, onContentChange,
}: {
  note: NoteRow;
  type: string;
  subMode: string;
  folders: FolderRow[];
  folderPaths: Record<string, string>;
  onDelete: DeleteFn;
  onRename: RenameFn;
  onMove: MoveFn;
  onReview: (noteType: string, title: string) => void;
  onContentChange?: (noteType: string, title: string, content: string) => void;
}) {
  const typeConfig = NOTE_TYPE_REGISTRY[type as NoteType];
  const isWritingNote = !!note.content?.includes("# Writing Practice:");
  const visibleModes = Object.entries(typeConfig.modes).filter(([modeKey]) =>
    isWritingNote ? modeKey === "writing" : modeKey !== "writing"
  );
  const { openSession } = useSession();
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [editValue, setEditValue] = useState(note.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: type, title: note.title }),
    });
    onDelete(type, note.title);
  }

  function startEditing() {
    setEditValue(note.title);
    setEditing(true);
  }

  async function saveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditing(false); return; }
    setEditing(false);
    onRename(type, note.title, trimmed);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: type, title: note.title, newTitle: trimmed }),
    });
  }

  async function handleMove(folderId: string | null) {
    setMoving(false);
    onMove(type, note.title, folderId);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: type, title: note.title, folderId }),
    });
  }

  return (
    <>
      {viewing && <NoteModal note={note} type={type} onClose={() => setViewing(false)} onReview={onReview} onContentChange={onContentChange} />}
      <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 hover:border-violet-200 transition-all duration-200 shrink-0 w-64 flex flex-col cursor-pointer" onClick={() => setViewing(true)}>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-1">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-b border-violet-400 outline-none leading-snug pb-0.5"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-semibold text-gray-900 text-sm leading-snug truncate">
                {note.title}
              </span>
              <button onClick={(e) => { e.stopPropagation(); startEditing(); }} className="shrink-0 text-gray-300 hover:text-violet-400 transition-colors" aria-label="Rename note">
                <Pencil size={11} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setMoving((v) => !v); }} className="text-gray-300 hover:text-violet-400 transition-colors mt-0.5" aria-label="Move to folder">
              <FolderInput size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setConfirming(true); }} className="text-gray-300 hover:text-red-400 transition-colors mt-0.5" aria-label="Delete note">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5 mb-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={10} />
            {new Date(note.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
          </p>
          {!!note.dueCount && note.dueCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onReview(type, note.title); }}
              className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-semibold hover:bg-violet-100 transition-colors"
              title={`${note.dueCount} flashcard(s) due — review`}
            >
              <Layers size={10} />
              {note.dueCount} to review
            </button>
          )}
        </div>
        {note.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{note.summary}</p>
        )}
        {moving && (
          <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-1.5 max-h-32 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleMove(null)}
              disabled={note.folderId === null}
              className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-white text-gray-600 disabled:text-gray-300"
            >
              Unfiled
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => handleMove(f.id)}
                disabled={note.folderId === f.id}
                className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-white text-gray-600 disabled:text-gray-300 truncate"
              >
                {folderPaths[f.id] ?? f.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {confirming ? (
        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="text-xs h-7 flex-1" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs h-7 flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={deleting}>
            Delete
          </Button>
        </div>
      ) : (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {visibleModes.map(([modeKey, modeConfig]) => {
            const ModeIcon = modeConfig.icon;
            return (
              <Button
                key={modeKey}
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 flex-1"
                onClick={() => openSession(type as NoteType, modeKey, note.title, subMode)}
              >
                <ModeIcon size={11} className="mr-1" />
                {modeConfig.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

