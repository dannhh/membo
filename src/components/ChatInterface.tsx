"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, Loader2, FileText, Paperclip, Plus, X, Check, Layers, Pencil, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import type { NoteType } from "@/lib/note-types";
import { TripPlannerPanel } from "@/components/TripPlannerPanel";
import type { TripPlanData } from "@/components/TripPlannerPanel";
import { buildFolderPaths, type FolderRow } from "@/components/FolderTree";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface NotePickerProps {
  noteType: NoteType;
  onNoteTypeChange: (t: NoteType) => void;
  title: string;
  onTitleChange: (v: string) => void;
  mode: string;
  onModeChange: (m: string) => void;
  subMode: string;
  onSubModeChange: (s: string) => void;
  documentUrl: string;
  onDocumentUrlChange: (url: string) => void;
  pdfFileName: string;
  onPdfUpload: (file: File) => void;
  onPdfClear: () => void;
  pdfLoading: boolean;
  folders: FolderRow[];
  folderId: string | null;
  onFolderIdChange: (id: string | null) => void;
  onStart: () => void;
}

function NotePicker({
  noteType, onNoteTypeChange,
  title, onTitleChange,
  mode, onModeChange,
  subMode, onSubModeChange,
  documentUrl, onDocumentUrlChange,
  pdfFileName, onPdfUpload, onPdfClear, pdfLoading,
  folders, folderId, onFolderIdChange,
  onStart,
}: NotePickerProps) {
  const folderPaths = buildFolderPaths(folders);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typeConfig = NOTE_TYPE_REGISTRY[noteType];
  const modeConfig = typeConfig.modes[mode];
  const modeCount = Object.keys(typeConfig.modes).length;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-8 text-center overflow-y-auto">
      {/* Note type selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {Object.entries(NOTE_TYPE_REGISTRY).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => {
                onNoteTypeChange(type as NoteType);
                onModeChange(cfg.defaultMode);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                noteType === type
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              <Icon size={14} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{typeConfig.titleLabel}</h1>
        <p className="text-gray-500 mt-2 text-sm">Choose a mode to get started.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2">
        <Input
          placeholder={typeConfig.placeholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onStart(); }}
          className="text-center h-12 text-base"
          autoFocus
        />
        {folders.length > 0 && (
          <select
            value={folderId ?? ""}
            onChange={(e) => onFolderIdChange(e.target.value || null)}
            className="text-sm text-center h-9 rounded-lg border border-gray-200 bg-white text-gray-600"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{folderPaths[f.id] ?? f.name}</option>
            ))}
          </select>
        )}
        {modeConfig?.hasDocumentSource && (
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Document URL (optional)"
              value={documentUrl}
              onChange={(e) => onDocumentUrlChange(e.target.value)}
              className="text-center text-sm"
              disabled={!!pdfFileName}
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {pdfFileName ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-sm text-violet-700">
                <FileText size={14} className="shrink-0" />
                <span className="flex-1 truncate text-left">{pdfFileName}</span>
                <button onClick={onPdfClear} className="shrink-0 text-violet-400 hover:text-violet-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfLoading || !!documentUrl}
                  className="flex-1"
                >
                  {pdfLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Paperclip size={14} className="mr-2" />}
                  Import PDF or photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={pdfLoading || !!documentUrl}
                  className="shrink-0"
                  aria-label="Take photo"
                >
                  <Camera size={14} />
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPdfUpload(file);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPdfUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div
        className="grid gap-3 w-full max-w-md"
        style={{ gridTemplateColumns: `repeat(${modeCount}, minmax(0, 1fr))` }}
      >
        {Object.entries(typeConfig.modes).map(([modeKey, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={modeKey}
              onClick={() => {
                onModeChange(modeKey);
                onSubModeChange(cfg.defaultSubMode ?? "");
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
                mode === modeKey
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              <Icon size={16} />
              <span className="font-medium">{cfg.label}</span>
              <span className="text-xs text-gray-400 leading-tight">{cfg.description}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-mode selector */}
      {modeConfig?.subModes && (
        <div className="flex gap-2">
          {Object.entries(modeConfig.subModes).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onSubModeChange(key)}
              className={cn(
                "px-4 py-1.5 rounded-full border text-sm font-medium transition-all",
                subMode === key
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              )}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      <Button onClick={onStart} disabled={!title.trim()} size="lg" className="px-8">
        Start {modeConfig?.subModes?.[subMode]?.label ?? modeConfig?.label}
      </Button>
    </div>
  );
}

const OPTION_RE = /^([A-D])\)\s*(.+)$/gm;

function parseQuizOptions(content: string): { preamble: string; options: { letter: string; text: string }[] } | null {
  const matches = [...content.matchAll(OPTION_RE)];
  if (matches.length < 2) return null;
  return {
    preamble: content.slice(0, matches[0].index).trim(),
    options: matches.map((m) => ({ letter: m[1], text: m[2].trim() })),
  };
}

interface FlipCardData { front: string; back: string; index: number; total: number }

function parseFlipCards(content: string): FlipCardData[] | null {
  const blocks = content.split(/\n---\n/).map((b) => b.trim()).filter(Boolean);
  const cards: FlipCardData[] = [];
  for (const block of blocks) {
    const headerMatch = block.match(/\*\*Flashcard\s+(\d+)\/(\d+)\*\*/i);
    const frontMatch = block.match(/\*\*Front:\*\*\s*(.+)/i);
    const backStart = block.search(/\*\*Back:\*\*/i);
    if (!headerMatch || !frontMatch || backStart === -1) continue;
    const back = block.slice(backStart + "**Back:**".length).trim();
    cards.push({
      front: frontMatch[1].trim(),
      back,
      index: parseInt(headerMatch[1]),
      total: parseInt(headerMatch[2]),
    });
  }
  return cards.length > 0 ? cards : null;
}

function FlipCard({ front, back, index, total }: FlipCardData) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="w-full" style={{ perspective: "1000px" }}>
      <div
        className="relative w-full cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.45s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          height: "200px",
        }}
        onClick={() => setFlipped((f) => !f)}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-violet-600 flex flex-col items-center justify-center px-6 select-none"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3">
            {index} / {total}
          </span>
          <p className="text-2xl font-bold text-white text-center">{front}</p>
          <span className="mt-4 text-xs text-white/50">tap to reveal</span>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl bg-white border border-violet-100 shadow-md flex flex-col justify-center px-6 select-none overflow-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-gray-800">
            <MarkdownRenderer>{back}</MarkdownRenderer>
          </div>
          <span className="mt-3 text-xs text-gray-400 text-center">tap to flip back</span>
        </div>
      </div>
    </div>
  );
}

function FlipCardDeck({ cards, preamble }: { cards: FlipCardData[]; preamble: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="mr-auto w-full max-w-sm flex flex-col gap-3">
      {preamble && (
        <p className="text-sm text-gray-500">{preamble}</p>
      )}
      <FlipCard key={current} {...cards[current]} />
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:border-gray-300 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-xs text-gray-400">{current + 1} / {cards.length}</span>
        <button
          onClick={() => setCurrent((c) => Math.min(cards.length - 1, c + 1))}
          disabled={current === cards.length - 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:border-gray-300 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Candidate-review panel: the learner curates AI-generated cards (edit / untick)
// before any of them are saved to the spaced-repetition deck.
interface CandidateCard { front: string; back: string; keep: boolean; editing: boolean }

function FlashcardReview({
  cards,
  preamble,
  ctx,
}: {
  cards: FlipCardData[];
  preamble: string;
  ctx: { noteType: string; noteTitle: string; source: string };
}) {
  const [items, setItems] = useState<CandidateCard[]>(() =>
    cards.map((c) => ({ front: c.front, back: c.back, keep: true, editing: false }))
  );
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const keptCount = items.filter((i) => i.keep).length;

  function update(idx: number, patch: Partial<CandidateCard>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType: ctx.noteType,
          noteTitle: ctx.noteTitle,
          source: ctx.source,
          cards: items.filter((i) => i.keep).map(({ front, back }) => ({ front, back })),
        }),
      });
      const data = await res.json();
      setSavedCount(data.saved ?? 0);
    } catch {
      setSavedCount(0);
    } finally {
      setSaving(false);
    }
  }

  if (savedCount !== null) {
    return (
      <div className="mr-auto w-full max-w-lg flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
        <Check size={16} className="shrink-0" />
        Saved {savedCount} flashcard{savedCount === 1 ? "" : "s"} to your review deck.
      </div>
    );
  }

  return (
    <div className="mr-auto w-full max-w-lg flex flex-col gap-3">
      {preamble && <p className="text-sm text-gray-500">{preamble}</p>}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Layers size={13} className="text-violet-500 shrink-0" />
        Keep only what&apos;s worth memorizing — edit or untick any card, then save.
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((it, idx) => (
          <div
            key={idx}
            className={`group rounded-2xl border transition-all ${
              it.keep ? "border-gray-200 bg-white shadow-sm" : "border-gray-200 bg-gray-50/70 opacity-55"
            }`}
          >
            <div className="flex items-start gap-3 p-3.5">
              <button
                onClick={() => update(idx, { keep: !it.keep })}
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  it.keep ? "bg-violet-500 border-violet-500 text-white" : "border-gray-300 text-transparent hover:border-gray-400"
                }`}
                aria-label={it.keep ? "Exclude this card" : "Include this card"}
              >
                <Check size={13} />
              </button>

              <div className="flex-1 min-w-0">
                {it.editing ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={it.front}
                      onChange={(e) => update(idx, { front: e.target.value })}
                      placeholder="Front"
                      rows={2}
                      className="w-full text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-2.5 py-1.5 outline-none resize-y focus:ring-1 focus:ring-violet-300"
                    />
                    <textarea
                      value={it.back}
                      onChange={(e) => update(idx, { back: e.target.value })}
                      placeholder="Back"
                      rows={3}
                      className="w-full text-sm text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5 outline-none resize-y focus:ring-1 focus:ring-violet-300"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold text-gray-900 leading-snug [&_p]:m-0">
                      <MarkdownRenderer>{it.front}</MarkdownRenderer>
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed max-h-44 overflow-y-auto prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-gray-800">
                      <MarkdownRenderer>{it.back}</MarkdownRenderer>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => update(idx, { editing: !it.editing })}
                className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  it.editing ? "bg-violet-100 text-violet-600" : "text-gray-300 hover:text-violet-500 hover:bg-violet-50"
                }`}
                aria-label={it.editing ? "Done editing" : "Edit card"}
              >
                {it.editing ? <Check size={14} /> : <Pencil size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={keptCount === 0 || saving}
        className="self-start flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
        Save {keptCount} to deck
      </button>
    </div>
  );
}

function parseVocabCard(content: string): { word: string; meaning: string; example: string; exampleTranslation?: string } | null {
  const wordMatch = content.match(/\*\*(.+?)\*\*/);
  const meaningMatch = content.match(/Meaning:\s*(.+)/);
  const exampleViMatch = content.match(/Example \(VI\):\s*(.+)/);
  const exampleMatch = content.match(/Example:\s*(.+)/);
  if (!wordMatch || !meaningMatch || !exampleMatch) return null;
  return {
    word: wordMatch[1].trim(),
    meaning: meaningMatch[1].trim(),
    example: exampleMatch[1].trim(),
    exampleTranslation: exampleViMatch?.[1].trim(),
  };
}

function VocabCard({ word, meaning, example, exampleTranslation }: { word: string; meaning: string; example: string; exampleTranslation?: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="max-w-sm mr-auto w-full">
      <div className="rounded-2xl overflow-hidden shadow-md border border-violet-100">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-2xl font-bold text-white tracking-tight leading-tight">{word}</p>
            <span className="mt-1 shrink-0 text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full">
              +1 XP
            </span>
          </div>
          <p className="mt-2 text-violet-100 font-medium text-base">{meaning}</p>
        </div>

        {/* Example section */}
        <div className="bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Example</p>
          <p className="text-sm text-gray-700 italic leading-relaxed">&ldquo;{example}&rdquo;</p>

          {exampleTranslation && (
            <div className="mt-3">
              {revealed ? (
                <p className="text-sm text-purple-600 italic leading-relaxed">
                  &ldquo;{exampleTranslation}&rdquo;
                </p>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-1 text-xs font-semibold text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-1"
                >
                  <span className="text-base leading-none">👁</span> Reveal translation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ content }: { content: string }) {
  return (
    <div className="mr-auto w-full max-w-sm">
      <div className="rounded-2xl overflow-hidden shadow-md border border-violet-100">
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 px-5 py-4">
          <p className="text-lg font-bold text-white">🎊 Session Complete!</p>
        </div>
        <div className="bg-white px-5 py-4 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-gray-800">
          <MarkdownRenderer>{content.replace(/^.*?🎊.*?\n/, "").trim()}</MarkdownRenderer>
        </div>
      </div>
    </div>
  );
}

interface TripFormData {
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  adults: number;
  children: number;
  interests: string[];
}

const TRIP_INTERESTS = [
  { key: "food", label: "Food", emoji: "🍜" },
  { key: "history", label: "History", emoji: "🏛️" },
  { key: "nature", label: "Nature", emoji: "🌿" },
  { key: "nightlife", label: "Nightlife", emoji: "🎉" },
  { key: "adventure", label: "Adventure", emoji: "🧗" },
  { key: "relaxation", label: "Relaxation", emoji: "😌" },
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function nightsBetween(from: string, to: string) {
  if (!from || !to) return 0;
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

function GuestCounter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center text-lg leading-none"
        >−</button>
        <span className="w-5 text-center text-sm font-semibold text-gray-800">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center text-lg leading-none"
        >+</button>
      </div>
    </div>
  );
}

function TripPlanForm({ title, onSubmit, onBack }: { title: string; onSubmit: (data: TripFormData) => void; onBack: () => void }) {
  const today = toISODate(new Date());
  const tomorrow = toISODate(new Date(Date.now() + 86400000));
  const [destination, setDestination] = useState(title);
  const [departureDate, setDepartureDate] = useState(today);
  const [departureTime, setDepartureTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState(tomorrow);
  const [returnTime, setReturnTime] = useState("20:00");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guestOpen, setGuestOpen] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const departureDateRef = useRef<HTMLInputElement>(null);
  const departureTimeRef = useRef<HTMLInputElement>(null);
  const returnDateRef = useRef<HTMLInputElement>(null);
  const returnTimeRef = useRef<HTMLInputElement>(null);

  const nights = nightsBetween(departureDate, returnDate);

  function handleDepartureDate(val: string) {
    setDepartureDate(val);
    if (val >= returnDate) {
      setReturnDate(toISODate(new Date(new Date(val).getTime() + 86400000)));
    }
  }

  const toggleInterest = (key: string) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]));

  const guestSummary = [
    `${adults} adult${adults !== 1 ? "s" : ""}`,
    children > 0 ? `${children} child${children !== 1 ? "ren" : ""}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1">
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-900">Plan a trip{destination ? ` to ${destination}` : ""}</h2>
          <p className="text-sm text-gray-500 mt-1">Set your preferences to get a personalized itinerary.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Destination</span>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Tokyo, Japan"
            autoFocus={!destination}
          />
        </div>

        {/* Date & time range */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Departure */}
            <div className="flex flex-col px-4 py-3 gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Departure</span>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-violet-600 transition-colors"
                onClick={() => departureDateRef.current?.showPicker()}
              >
                <span className="text-sm font-semibold text-gray-800">{formatDisplayDate(departureDate)}</span>
                <input ref={departureDateRef} type="date" value={departureDate} min={today}
                  onChange={(e) => handleDepartureDate(e.target.value)} className="sr-only" />
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => departureTimeRef.current?.showPicker()}
              >
                <span className="text-xs text-gray-400">🕐</span>
                <input
                  ref={departureTimeRef}
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="text-xs font-medium text-gray-600 border-0 outline-none bg-transparent cursor-pointer"
                />
              </div>
            </div>
            {/* Return */}
            <div className="flex flex-col px-4 py-3 gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Return</span>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-violet-600 transition-colors"
                onClick={() => returnDateRef.current?.showPicker()}
              >
                <span className="text-sm font-semibold text-gray-800">{formatDisplayDate(returnDate)}</span>
                <input ref={returnDateRef} type="date" value={returnDate} min={departureDate || today}
                  onChange={(e) => setReturnDate(e.target.value)} className="sr-only" />
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => returnTimeRef.current?.showPicker()}
              >
                <span className="text-xs text-gray-400">🕐</span>
                <input
                  ref={returnTimeRef}
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="text-xs font-medium text-gray-600 border-0 outline-none bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Duration: <span className="font-medium text-gray-600">{nights} {nights === 1 ? "night" : "nights"}</span>
          </div>
        </div>

        {/* Guests */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setGuestOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Travelers</span>
              <span className="text-sm font-semibold text-gray-800">{guestSummary}</span>
            </div>
            <svg
              className={cn("w-4 h-4 text-gray-400 transition-transform", guestOpen && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {guestOpen && (
            <div className="border-t border-gray-100 px-4 divide-y divide-gray-100">
              <GuestCounter label="Adults" value={adults} onChange={setAdults} min={1} />
              <GuestCounter label="Children" value={children} onChange={setChildren} />
            </div>
          )}
        </div>

        {/* Interests */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_INTERESTS.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => toggleInterest(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                  interests.includes(key)
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                )}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onSubmit({ destination, departureDate, departureTime, returnDate, returnTime, adults, children, interests })}
          disabled={!destination.trim()}
          size="lg"
          className="w-full"
        >
          Start Planning
        </Button>
      </div>
    </div>
  );
}

interface WritingRubricOption { id: string; name: string }

function RubricOptionsBubble({
  title, builtin, custom, loading, creating, onPick, onCreateCustom,
}: {
  title: string;
  builtin: WritingRubricOption[];
  custom: WritingRubricOption[];
  loading: boolean;
  creating: boolean;
  onPick: (id: string, name: string) => void;
  onCreateCustom: (name: string, prompt: string) => void;
}) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  return (
    <div className="flex flex-col gap-3 mr-auto max-w-md w-full">
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 text-sm leading-relaxed">
        Choose a grading rubric{title ? ` for "${title}"` : ""}.
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-gray-300" />
        </div>
      ) : showCustomForm ? (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 bg-white">
          <Input
            placeholder="Rubric name (e.g. Cover Letter Review)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="text-sm"
            autoFocus
          />
          <textarea
            placeholder="Grading instructions / criteria..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            className="text-sm rounded-lg border border-gray-200 p-2.5 outline-none resize-none focus:border-violet-300"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!customName.trim() || !customPrompt.trim() || creating}
              onClick={() => onCreateCustom(customName.trim(), customPrompt.trim())}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Save & Start"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {builtin.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r.id, r.name)}
              className="text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              {r.name}
            </button>
          ))}
          {custom.length > 0 && (
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-2">Your Rubrics</div>
          )}
          {custom.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r.id, r.name)}
              className="text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              {r.name}
            </button>
          ))}
          <button
            onClick={() => setShowCustomForm(true)}
            className="text-left px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
          >
            Other — define a custom rubric
          </button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isLast, onAnswer, isVocabMode, isFlipCardsMode, flashcardCtx }: { message: Message; isLast?: boolean; onAnswer?: (letter: string) => void; isVocabMode?: boolean; isFlipCardsMode?: boolean; flashcardCtx?: { noteType: string; noteTitle: string; source: string } | null }) {
  const isUser = message.role === "user";

  if (!isUser && message.content.includes("🎊")) {
    return <SummaryCard content={message.content} />;
  }

  // Materials mode: generated cards become an editable candidate list the
  // learner curates before saving — nothing is persisted automatically.
  if (!isUser && flashcardCtx) {
    const cards = parseFlipCards(message.content);
    if (cards) {
      const preambleMatch = message.content.match(/^([\s\S]*?)(?=\*\*Flashcard\s+1\/)/i);
      const preamble = preambleMatch?.[1]?.trim() ?? "";
      return <FlashcardReview cards={cards} preamble={preamble} ctx={flashcardCtx} />;
    }
  }

  if (!isUser && isFlipCardsMode) {
    const cards = parseFlipCards(message.content);
    if (cards) {
      const preambleMatch = message.content.match(/^([\s\S]*?)(?=\*\*Flashcard\s+1\/)/i);
      const preamble = preambleMatch?.[1]?.trim() ?? "";
      return <FlipCardDeck cards={cards} preamble={preamble} />;
    }
  }

  if (!isUser && isVocabMode) {
    const card = parseVocabCard(message.content);
    if (card) return <VocabCard key={message.content} {...card} />;
  }

  if (!isUser && isLast && onAnswer) {
    const parsed = parseQuizOptions(message.content);
    if (parsed) {
      return (
        <div className="flex flex-col gap-3 mr-auto max-w-3xl w-full">
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1">
            <MarkdownRenderer>{parsed.preamble}</MarkdownRenderer>
          </div>
          <div className="flex flex-col gap-2">
            {parsed.options.map((opt) => (
              <button
                key={opt.letter}
                onClick={() => onAnswer(opt.letter)}
                className="flex items-start gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-left hover:border-violet-400 hover:bg-violet-50 transition-colors"
              >
                <span className="font-semibold text-violet-600 shrink-0">{opt.letter})</span>
                <span className="[&_p]:inline [&_p]:m-0">
                  <MarkdownRenderer>{opt.text}</MarkdownRenderer>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className={cn("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div
        className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-violet-600 text-white rounded-tr-sm whitespace-pre-wrap"
            : "bg-gray-100 text-gray-900 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
        )}
      >
        {isUser ? message.content : <MarkdownRenderer>{message.content}</MarkdownRenderer>}
      </div>
    </div>
  );
}

export function ChatInterface({
  initialNoteType,
  initialTitle,
  initialMode,
  initialSubMode,
  initialFolderId,
  onClose,
}: {
  initialNoteType?: string;
  initialTitle?: string;
  initialMode?: string;
  initialSubMode?: string;
  initialFolderId?: string | null;
  onClose?: () => void;
}) {
  const defaultNoteType = (initialNoteType as NoteType) ?? "concept";
  const defaultTypeConfig = NOTE_TYPE_REGISTRY[defaultNoteType];
  const resolvedMode = initialMode ?? defaultTypeConfig.defaultMode;

  const [noteType, setNoteType] = useState<NoteType>(defaultNoteType);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [mode, setMode] = useState(resolvedMode);
  const [subMode, setSubMode] = useState(
    initialSubMode ?? defaultTypeConfig.modes[resolvedMode]?.defaultSubMode ?? ""
  );
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
  const isResumption = !!(initialNoteType && initialTitle);
  const isFreshSession = !isResumption && !!initialNoteType && !!initialMode;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(isResumption || isFreshSession);
  const [historyLoaded, setHistoryLoaded] = useState(!isResumption);
  const isTripPlan = (nt: string, m: string) => nt === "trip" && m === "plan";
  const [tripFormDone, setTripFormDone] = useState(
    !!(initialNoteType === "trip" && initialMode === "plan" && initialTitle)
  );
  const [tripPlanData, setTripPlanData] = useState<TripPlanData | null>(null);
  const isWritingSubmission = (nt: string, m: string) => !!NOTE_TYPE_REGISTRY[nt]?.modes[m]?.hasSubmissionUI;
  const [rubricId, setRubricId] = useState<string | null>(null);
  const [rubricName, setRubricName] = useState("");
  const [builtinRubrics, setBuiltinRubrics] = useState<WritingRubricOption[]>([]);
  const [customRubrics, setCustomRubrics] = useState<WritingRubricOption[]>([]);
  const [rubricOptionsLoading, setRubricOptionsLoading] = useState(true);
  const [creatingRubric, setCreatingRubric] = useState(false);
  const [showQuizActions, setShowQuizActions] = useState(false);
  const [showExplainOnly, setShowExplainOnly] = useState(false);
  const [pendingSummary, setPendingSummary] = useState(false);
  const summaryFired = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatCameraInputRef = useRef<HTMLInputElement>(null);

  function parseTripMetadata(content: string) {
    try {
      const json = JSON.parse(content);
      if (!json || typeof json !== "object") return;
      if (!json.tripDetails && !json.activities && !json.expenses) return;
      setTripPlanData(prev => ({
        tripDetails: json.tripDetails ?? prev?.tripDetails ?? { destination: "", dates: "", duration: "", purpose: "", accommodation: "", bookingRef: "" },
        activities: json.activities ?? prev?.activities ?? [],
        ...json,
      } as TripPlanData));
    } catch {
      // non-fatal — metadata may not be JSON yet
    }
  }

  async function saveTripData(updated: TripPlanData) {
    setTripPlanData(updated);
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType, title, metadataContent: JSON.stringify(updated) }),
    });
  }

  async function handleChecklistChange(cats: import("@/components/TripPlannerPanel").PackingCategory[]) {
    if (!tripPlanData) return;
    await saveTripData({ ...tripPlanData, packingChecklist: cats });
  }

  async function handleCheckedChange(keys: string[]) {
    if (!tripPlanData) return;
    await saveTripData({ ...tripPlanData, checkedItems: keys });
  }

  async function handleExpensesChange(expenses: import("@/components/TripPlannerPanel").Expense[]) {
    if (!tripPlanData) return;
    await saveTripData({ ...tripPlanData, expenses });
  }

  // Fetch folders for the new-note picker
  useEffect(() => {
    if (isResumption) return;
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setFolders(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore existing knowledge so mid-session imports merge into it, not replace it.
  // We use the restructured note content (the single saved artifact) as the base —
  // raw imported documents are no longer persisted.
  useEffect(() => {
    if (!isResumption) return;
    fetch(`/api/notes?noteType=${encodeURIComponent(initialNoteType!)}&title=${encodeURIComponent(initialTitle!)}`)
      .then((r) => r.json())
      .then((d) => {
        const base = d.noteContent ?? d.documentContent;
        if (base) setDocumentContent(base);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved history when reopening a session from the dashboard
  useEffect(() => {
    if (!isResumption) return;
    const params = new URLSearchParams({
      noteType: initialNoteType!,
      title: initialTitle!,
      mode: resolvedMode,
      subMode: initialSubMode ?? "",
    });
    fetch(`/api/chat-history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length > 0) setMessages(d.messages);
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resuming a writing session: restore the rubric used last time, so we don't
  // re-prompt for one when there's already a full conversation in progress.
  useEffect(() => {
    if (!isResumption || !isWritingSubmission(noteType, mode) || !title) return;
    fetch(`/api/writing-submissions?noteType=${encodeURIComponent(noteType)}&title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((d) => {
        const latest = Array.isArray(d.submissions) ? d.submissions[0] : null;
        if (latest) {
          setRubricId(latest.rubricId);
          setRubricName(latest.rubricName);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire the start message once history status is known and no prior messages exist
  useEffect(() => {
    if (!historyLoaded || messages.length > 0 || !started || !title) return;
    if (isTripPlan(noteType, mode)) return;
    if (isWritingSubmission(noteType, mode) && !rubricId) return;
    const modeConfig = NOTE_TYPE_REGISTRY[noteType].modes[mode];
    const startMsg =
      modeConfig.subModes?.[subMode]?.startMessage(title) ??
      modeConfig.startMessage?.(title) ??
      title;
    sendMessage(startMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (pendingSummary && !loading && !summaryFired.current) {
      summaryFired.current = true;
      setPendingSummary(false);
      setShowQuizActions(false);
      setShowExplainOnly(false);
      sendMessage("wrap_up");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSummary, loading]);

  useEffect(() => {
    if (!isTripPlan(noteType, mode) || !tripFormDone || !title) return;
    fetch(`/api/notes?noteType=${encodeURIComponent(noteType)}&title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.metadataContent) parseTripMetadata(d.metadataContent);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripFormDone]);

  // Fetch grading rubrics for the in-chat picker (Writing mode only)
  useEffect(() => {
    if (!isWritingSubmission(noteType, mode) || rubricId) return;
    fetch("/api/writing-rubrics")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.builtin)) setBuiltinRubrics(d.builtin);
        if (Array.isArray(d.custom)) setCustomRubrics(d.custom);
      })
      .catch(() => {})
      .finally(() => setRubricOptionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateCustomRubric(name: string, prompt: string) {
    setCreatingRubric(true);
    try {
      const res = await fetch("/api/writing-rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prompt }),
      });
      const row = await res.json();
      if (row.id) {
        setCustomRubrics((prev) => [...prev, { id: row.id, name: row.name }]);
        handleRubricPicked(row.id, row.name);
      }
    } finally {
      setCreatingRubric(false);
    }
  }

  function handleRubricTextSubmit(text: string) {
    const q = text.trim().toLowerCase();
    if (!q) return;
    setInput("");
    const all = [...builtinRubrics, ...customRubrics];
    const match =
      all.find((r) => r.name.toLowerCase() === q) ??
      all.find((r) => r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase()));
    if (match) {
      handleRubricPicked(match.id, match.name);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "I couldn't match that to a rubric — click one of the options above, or type its name (e.g. \"Task 2\")." },
      ]);
    }
  }

  async function extractPdfText(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
    const data = await res.json();
    return data.text ?? null;
  }

  function appendDocLabel(existing: string, incoming: string): string {
    if (!existing) return incoming;
    return `${existing}, ${incoming}`;
  }

  // If there's already content, ask Gemini to intelligently merge rather than
  // blindly concatenating — preserves all details while eliminating redundancy.
  async function mergeDocContent(existing: string, incoming: string): Promise<string> {
    if (!existing) return incoming;
    try {
      const res = await fetch("/api/merge-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existing, incoming }),
      });
      const data = await res.json();
      if (data.merged) return data.merged;
    } catch {
      // fall back to simple append if merge fails
    }
    return `${existing}\n\n---\n\n${incoming}`;
  }

  async function handlePdfUpload(file: File) {
    setPdfLoading(true);
    try {
      const text = await extractPdfText(file);
      if (text) {
        const merged = await mergeDocContent(documentContent, text);
        setDocumentContent(merged);
        setPdfFileName((prev) => appendDocLabel(prev, file.name));
      }
    } finally {
      setPdfLoading(false);
    }
  }

  // Mid-conversation import: merge with existing knowledge, then nudge the model.
  async function handleInlineDocUpload(file: File) {
    setPdfLoading(true);
    try {
      const text = await extractPdfText(file);
      if (text) {
        const merged = await mergeDocContent(documentContent, text);
        setDocumentContent(merged);
        setPdfFileName((prev) => appendDocLabel(prev, file.name));
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
        const fallbackTitle = base ? base.charAt(0).toUpperCase() + base.slice(1) : base;
        // Pass merged text explicitly — state update hasn't flushed into this closure yet.
        sendMessage(
          `I've imported a document: ${file.name}. Use it as study material from now on.`,
          title || fallbackTitle,
          undefined,
          merged,
          true
        );
      }
    } finally {
      setPdfLoading(false);
    }
  }

  // `/knowledge <text>` ingests raw text, merging with any existing knowledge.
  async function handleTextImport(rawText: string) {
    const text = rawText.trim();
    if (!text) return;
    setPdfLoading(true);
    try {
      const merged = await mergeDocContent(documentContent, text);
      setDocumentContent(merged);
      setPdfFileName((prev) => appendDocLabel(prev, "Pasted text"));
      const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
      const fallbackTitle = firstLine.slice(0, 80);
      sendMessage(
        "I've added some knowledge to use as study material.",
        title || fallbackTitle,
        undefined,
        merged,
        true
      );
    } finally {
      setPdfLoading(false);
    }
  }

  async function sendMessage(userText: string, titleOverride?: string, rubricIdOverride?: string, docContentOverride?: string, documentChanged?: boolean) {
    if (!userText.trim() || loading) return;
    setShowQuizActions(false);

    const effectiveTitle = titleOverride || title || (messages.length === 0 ? userText.trim().slice(0, 80) : title);
    if (effectiveTitle && effectiveTitle !== title) setTitle(effectiveTitle);

    const userMessage: Message = { role: "user", content: userText };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType,
          mode,
          subMode: subMode || undefined,
          title: effectiveTitle,
          messages: nextMessages,
          documentUrl: documentUrl || undefined,
          documentContent: (docContentOverride ?? documentContent) || undefined,
          documentChanged: documentChanged || undefined,
          folderId,
          rubricId: rubricIdOverride ?? rubricId ?? undefined,
        }),
      });

      const data = await res.json();
      if (data.text) {
        const modeConfig = NOTE_TYPE_REGISTRY[noteType]?.modes[mode];
        const isFeedback =
          modeConfig?.hasQuizUI &&
          (data.text.includes("✅") || data.text.includes("❌") || data.text.includes("🔥") || data.text.includes("XP") || userText === "Explain more");
        const questionMsg = nextMessages[nextMessages.length - 2];
        const questionMatch = questionMsg?.content.match(/\*\*Question\s+(\d+)\/(\d+)/i);
        const isLastQuestion = questionMatch ? questionMatch[1] === questionMatch[2] : false;
        if (isFeedback && isLastQuestion) {
          setShowQuizActions(true);
          setShowExplainOnly(true);
          setPendingSummary(true);
        } else {
          setShowQuizActions(isFeedback ?? false);
          setShowExplainOnly(false);
        }
        setMessages([...nextMessages, { role: "assistant", content: data.text }]);

        if (data.metadataContent) parseTripMetadata(data.metadataContent);

        const incomingTitle: string | undefined = data.newTitle;
        const summary: string | undefined = data.summary
          ?? (nextMessages.length === 1 ? data.text.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 160) : undefined);
        if (incomingTitle || summary) {
          fetch("/api/notes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noteType, title: effectiveTitle, newTitle: incomingTitle, summary, folderId }),
          });
        }
        if (incomingTitle) setTitle(incomingTitle);
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    if (!title.trim()) return;
    setStarted(true);
    if (isTripPlan(noteType, mode)) return; // form collects details first
    const modeConfig = NOTE_TYPE_REGISTRY[noteType].modes[mode];
    const startMsg = modeConfig.subModes?.[subMode]?.startMessage(title)
      ?? modeConfig.startMessage?.(title)
      ?? title;
    sendMessage(startMsg);
  }

  function handleTripFormSubmit(data: TripFormData) {
    setTripFormDone(true);
    const interestsPart = data.interests.length > 0
      ? ` Interests: ${data.interests.join(", ")}.`
      : "";
    const nights = nightsBetween(data.departureDate, data.returnDate);
    const duration = nights === 0 ? "day trip" : `${nights + 1} days ${nights} nights`;
    const travelers = [
      `${data.adults} adult${data.adults !== 1 ? "s" : ""}`,
      data.children > 0 ? `${data.children} child${data.children !== 1 ? "ren" : ""}` : null,
    ].filter(Boolean).join(", ");
    const msg = `Let's plan my trip to ${data.destination}. ${duration}, ${travelers}. Departure: ${data.departureDate} at ${data.departureTime}, Return: ${data.returnDate} at ${data.returnTime}.${interestsPart}`;
    sendMessage(msg, data.destination);
  }

  function handleRubricPicked(id: string, name: string) {
    setRubricId(id);
    setRubricName(name);
    if (messages.length > 0) return; // resumed session already has history
    const modeConfig = NOTE_TYPE_REGISTRY[noteType].modes[mode];
    const startMsg = modeConfig.startMessage?.(title) ?? title;
    sendMessage(startMsg, undefined, id);
  }

  const currentTypeConfig = NOTE_TYPE_REGISTRY[noteType];
  const currentModeConfig = currentTypeConfig?.modes[mode];
  const currentSubModeConfig = currentModeConfig?.subModes?.[subMode];
  const hasVocabUI = currentSubModeConfig?.hasVocabUI ?? false;
  const hasFlipCardsUI = currentSubModeConfig?.hasFlipCardsUI ?? false;
  const TypeIcon = currentTypeConfig?.icon;
  const ModeIcon = currentModeConfig?.icon;

  if (started && isTripPlan(noteType, mode) && !tripFormDone) {
    return (
      <TripPlanForm
        title={title}
        onSubmit={handleTripFormSubmit}
        onBack={() => { setStarted(false); setTripFormDone(false); }}
      />
    );
  }

  if (!started) {
    return (
      <NotePicker
        noteType={noteType}
        onNoteTypeChange={(t) => {
          const cfg = NOTE_TYPE_REGISTRY[t];
          setNoteType(t);
          setMode(cfg.defaultMode);
          setSubMode(cfg.modes[cfg.defaultMode]?.defaultSubMode ?? "");
        }}
        title={title}
        onTitleChange={setTitle}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setSubMode(NOTE_TYPE_REGISTRY[noteType].modes[m]?.defaultSubMode ?? "");
        }}
        subMode={subMode}
        onSubModeChange={setSubMode}
        documentUrl={documentUrl}
        onDocumentUrlChange={setDocumentUrl}
        pdfFileName={pdfFileName}
        onPdfUpload={handlePdfUpload}
        onPdfClear={() => { setPdfFileName(""); setDocumentContent(""); }}
        pdfLoading={pdfLoading}
        folders={folders}
        folderId={folderId}
        onFolderIdChange={setFolderId}
        onStart={handleStart}
      />
    );
  }

  const header = (
    <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-white shrink-0">
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close session"
        >
          <X size={15} />
        </button>
      )}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {ModeIcon && <ModeIcon size={15} className="text-violet-500 shrink-0" />}
        {title && <span className="font-semibold text-gray-900 truncate">{title}</span>}
        {title && <span className="text-gray-300">·</span>}
        <span className="text-gray-500 whitespace-nowrap">
          {currentModeConfig?.label}
          {currentSubModeConfig ? ` · ${currentSubModeConfig.label}` : ""}
          {currentModeConfig?.hasSubmissionUI && rubricName ? ` · ${rubricName}` : ""}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-400 text-xs flex items-center gap-1 whitespace-nowrap">
          {TypeIcon && <TypeIcon size={12} />}
          {currentTypeConfig?.label}
        </span>
      </div>
    </div>
  );

  const needsRubric = isWritingSubmission(noteType, mode) && !rubricId;

  const chatPanel = (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {!historyLoaded && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        )}
        {historyLoaded && messages.length === 0 && !loading && needsRubric && (
          <RubricOptionsBubble
            title={title}
            builtin={builtinRubrics}
            custom={customRubrics}
            loading={rubricOptionsLoading}
            creating={creatingRubric}
            onPick={handleRubricPicked}
            onCreateCustom={handleCreateCustomRubric}
          />
        )}
        {historyLoaded && messages.length === 0 && !loading && !needsRubric && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            {ModeIcon && (
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400">
                <ModeIcon size={20} />
              </div>
            )}
            <p className="text-sm text-gray-400">Type your topic or question below to get started.</p>
          </div>
        )}
        {historyLoaded && messages.filter((m) => !(m.role === "user" && m.content === "wrap_up")).map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            isLast={i === messages.length - 1}
            onAnswer={currentModeConfig?.hasQuizUI ? (letter) => sendMessage(letter) : undefined}
            isVocabMode={hasVocabUI}
            isFlipCardsMode={hasFlipCardsUI}
            flashcardCtx={mode === "materials" ? { noteType, noteTitle: title, source: subMode === "vocab" ? "vocab" : "concept" } : null}
          />
        ))}
        {historyLoaded && showQuizActions && !loading && (
          <div className="flex gap-2 mr-auto max-w-3xl">
            <Button variant="outline" size="sm" onClick={() => sendMessage("Explain more")}>
              Explain more
            </Button>
            {!showExplainOnly && (
              <Button size="sm" onClick={() => sendMessage("Next question")}>
                Next question
              </Button>
            )}
          </div>
        )}
        {historyLoaded && loading && (
          <div className="flex gap-3 mr-auto max-w-3xl">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 sm:p-4 bg-white shrink-0">
        {pdfFileName && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-xs text-violet-700 w-fit max-w-full">
            <FileText size={12} className="shrink-0" />
            <span className="truncate">{pdfFileName}</span>
            <button
              onClick={() => { setPdfFileName(""); setDocumentContent(""); }}
              className="shrink-0 text-violet-400 hover:text-violet-600"
              aria-label="Remove imported document"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {currentModeConfig?.hasSubmissionUI && needsRubric ? (
          <form
            className="flex gap-2 items-center rounded-full border border-gray-200 bg-white pl-4 pr-1.5 py-1.5 shadow-sm focus-within:border-violet-300 transition-colors"
            onSubmit={(e) => {
              e.preventDefault();
              handleRubricTextSubmit(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Click an option above, or type a rubric name..."
              disabled={!historyLoaded}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="chat-message-input"
              className="flex-1 min-w-0 text-sm outline-none placeholder:text-gray-400 bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || !historyLoaded}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              aria-label="Send"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        ) : currentModeConfig?.hasSubmissionUI ? (
          <form
            className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm focus-within:border-violet-300 transition-colors"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your essay here..."
              disabled={loading || !historyLoaded}
              rows={6}
              spellCheck={false}
              name="chat-message-input"
              className="text-sm outline-none placeholder:text-gray-400 bg-transparent disabled:opacity-60 resize-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !historyLoaded}
              className="self-end h-8 px-4 rounded-full bg-gray-900 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Submit Essay
            </button>
          </form>
        ) : (
          <form
            className="flex gap-2 items-center rounded-full border border-gray-200 bg-white pl-1.5 pr-1.5 py-1.5 shadow-sm focus-within:border-violet-300 transition-colors"
            onSubmit={(e) => {
              e.preventDefault();
              const knowledgeMatch = currentModeConfig?.hasDocumentSource && !hasVocabUI
                ? /^\/knowledge\s+([\s\S]+)/i.exec(input)
                : null;
              if (knowledgeMatch) {
                setInput("");
                handleTextImport(knowledgeMatch[1]);
                return;
              }
              sendMessage(input);
            }}
          >
            {currentModeConfig?.hasDocumentSource && !hasVocabUI && (
              <>
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={pdfLoading}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40"
                  aria-label="Import document"
                >
                  {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                </button>
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleInlineDocUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => chatCameraInputRef.current?.click()}
                  disabled={pdfLoading}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40"
                  aria-label="Take photo"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={chatCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleInlineDocUpload(file);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasVocabUI
                  ? "Enter a word or phrase..."
                  : currentModeConfig?.hasDocumentSource
                  ? "Type your response... or /knowledge <text> to import"
                  : "Type your response..."
              }
              disabled={loading || !historyLoaded}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="chat-message-input"
              className="flex-1 min-w-0 text-sm outline-none placeholder:text-gray-400 bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !historyLoaded}
              className={cn(
                "shrink-0 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                hasVocabUI
                  ? "h-8 px-4 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                  : "w-8 h-8 rounded-full bg-gray-900 text-white hover:bg-gray-700"
              )}
              aria-label="Send"
            >
              {hasVocabUI ? "Learn" : <ArrowUp size={16} />}
            </button>
          </form>
        )}
      </div>
    </>
  );

  if (isTripPlan(noteType, mode)) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-96 shrink-0 flex flex-col border-r border-gray-200 overflow-hidden">
            {chatPanel}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <TripPlannerPanel data={tripPlanData} onChecklistChange={handleChecklistChange} onCheckedChange={handleCheckedChange} onExpensesChange={handleExpensesChange} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header}
      {chatPanel}
    </div>
  );
}
