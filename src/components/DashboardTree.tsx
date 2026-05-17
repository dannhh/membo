"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronRight, Clock, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import type { NoteType } from "@/lib/note-types";
import { TripPlannerPanel } from "@/components/TripPlannerPanel";
import type { TripPlanData } from "@/components/TripPlannerPanel";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

function NoteModal({ note, type, onClose }: { note: NoteRow; type: string; onClose: () => void }) {
  const [tripData, setTripData] = useState<TripPlanData | null>(null);
  const isTrip = type === "trip";

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-xl flex flex-col ${isTrip ? "w-full max-w-5xl max-h-[90vh]" : "w-full max-w-2xl max-h-[80vh]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{note.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {isTrip ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TripPlannerPanel data={tripData} />
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 text-gray-800">
            {note.content
              ? <MarkdownRenderer>{note.content}</MarkdownRenderer>
              : <p className="text-gray-400 italic">No content saved yet.</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}

interface NoteRow {
  id: string;
  title: string;
  noteType: string;
  content: string | null;
  summary: string | null;
  updatedAt: Date;
}

interface Group {
  label: string;
  subMode: string;
  notes: NoteRow[];
}

interface TypeSection {
  type: string;
  groups: Group[];
}

function noteKey(noteType: string, title: string) {
  return `${noteType}/${title}`;
}

function NoteCard({ note, type, subMode, onDelete, onRename }: { note: NoteRow; type: string; subMode: string; onDelete: (noteType: string, title: string) => void; onRename: (noteType: string, oldTitle: string, newTitle: string) => void }) {
  const typeConfig = NOTE_TYPE_REGISTRY[type as NoteType];
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
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

  return (
    <>
      {viewing && <NoteModal note={note} type={type} onClose={() => setViewing(false)} />}
      <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-200 shrink-0 w-64 flex flex-col cursor-pointer" onClick={() => setViewing(true)}>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-1">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-b border-indigo-400 outline-none leading-snug pb-0.5"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-semibold text-gray-900 text-sm leading-snug truncate">
                {note.title}
              </span>
              <button onClick={(e) => { e.stopPropagation(); startEditing(); }} className="shrink-0 text-gray-300 hover:text-indigo-400 transition-colors" aria-label="Rename note">
                <Pencil size={11} />
              </button>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); setConfirming(true); }} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors mt-0.5" aria-label="Delete note">
            <Trash2 size={13} />
          </button>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 mb-2">
          <Clock size={10} />
          {new Date(note.updatedAt).toLocaleDateString()}
        </p>
        {note.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{note.summary}</p>
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
          {Object.entries(typeConfig.modes).map(([modeKey, modeConfig]) => {
            const ModeIcon = modeConfig.icon;
            return (
              <Button key={modeKey} variant="ghost" size="sm" asChild className="text-xs h-7 px-2 flex-1">
                <Link href={`/learn?noteType=${type}&title=${encodeURIComponent(note.title)}&mode=${modeKey}&subMode=${subMode}`}>
                  <ModeIcon size={11} className="mr-1" />
                  {modeConfig.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

type DeleteFn = (noteType: string, title: string) => void;
type RenameFn = (noteType: string, oldTitle: string, newTitle: string) => void;

function GroupRow({ group, type, onDelete, onRename }: { group: Group; type: string; onDelete: DeleteFn; onRename: RenameFn }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 pl-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {group.label}
        </span>
        <span className="text-xs text-gray-300">{group.notes.length}</span>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {group.notes.map((note) => (
            <NoteCard key={note.id} note={note} type={type} subMode={group.subMode} onDelete={onDelete} onRename={onRename} />
          ))}
        </div>

        {group.notes.length > 3 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors z-10"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function TypeSection({ section, onDelete, onRename }: { section: TypeSection; onDelete: DeleteFn; onRename: RenameFn }) {
  const typeConfig = NOTE_TYPE_REGISTRY[section.type as NoteType];
  const TypeIcon = typeConfig.icon;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TypeIcon size={13} className="text-indigo-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
          {typeConfig.label}
        </span>
      </div>

      <div className="pl-4 border-l border-gray-100">
        {section.groups.map((group) => (
          <GroupRow key={group.label} group={group} type={section.type} onDelete={onDelete} onRename={onRename} />
        ))}
      </div>
    </section>
  );
}

export function DashboardTree({ sections: initialSections }: { sections: TypeSection[] }) {
  const [deleted, setDeleted] = useState<Record<string, true>>({});
  const [renamed, setRenamed] = useState<Record<string, string>>({});

  function handleDelete(noteType: string, title: string) {
    setDeleted((prev) => ({ ...prev, [noteKey(noteType, title)]: true }));
  }

  function handleRename(noteType: string, oldTitle: string, newTitle: string) {
    setRenamed((prev) => ({ ...prev, [noteKey(noteType, oldTitle)]: newTitle }));
  }

  const sections = initialSections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({
          ...group,
          notes: group.notes
            .filter((n) => !deleted[noteKey(section.type, n.title)])
            .map((n) => {
              const rename = renamed[noteKey(section.type, n.title)];
              return rename ? { ...n, title: rename } : n;
            }),
        }))
        .filter((group) => group.notes.length > 0),
    }))
    .filter((section) => section.groups.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <TypeSection key={section.type} section={section} onDelete={handleDelete} onRename={handleRename} />
      ))}
    </div>
  );
}
