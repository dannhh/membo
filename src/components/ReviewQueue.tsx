"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { ReviewGrade } from "@/lib/srs";

interface DueCard {
  id: string;
  front: string;
  back: string;
  noteTitle: string;
  source: string;
}

const GRADES: { grade: ReviewGrade; label: string; key: string; className: string }[] = [
  { grade: "again", label: "Again", key: "1", className: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  { grade: "hard",  label: "Hard",  key: "2", className: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { grade: "good",  label: "Good",  key: "3", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  { grade: "easy",  label: "Easy",  key: "4", className: "bg-sky-100 text-sky-700 hover:bg-sky-200" },
];

// Strip Markdown markers so the front reads as clean plain text (no literal **).
function plain(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

export function ReviewQueue({
  noteType,
  title,
  embedded = false,
  onProgress,
  onClose,
}: {
  noteType?: string;
  title?: string;
  // Embedded mode hides the component's own header + progress bar; the parent
  // (e.g. the dashboard banner) renders those and receives live progress.
  embedded?: boolean;
  onProgress?: (done: number, total: number) => void;
  onClose?: () => void;
}) {
  const [queue, setQueue] = useState<DueCard[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const scoped = !!(noteType && title);

  // Report progress to the parent without re-subscribing on every render.
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; });
  useEffect(() => {
    if (queue) onProgressRef.current?.(reviewedCount, reviewedCount + queue.length);
  }, [reviewedCount, queue]);

  useEffect(() => {
    const url = scoped
      ? `/api/flashcards?noteType=${encodeURIComponent(noteType!)}&title=${encodeURIComponent(title!)}`
      : "/api/flashcards";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setQueue(data.cards ?? []))
      .catch(() => setQueue([]));
  }, [scoped, noteType, title]);

  const current = queue?.[0] ?? null;

  const grade = useCallback(
    async (g: ReviewGrade) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        await fetch(`/api/flashcards/${current.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade: g }),
        });
      } catch {
        // non-fatal — still advance the local queue
      }
      setQueue((q) => {
        if (!q) return q;
        const [, ...rest] = q;
        // "Again" → re-queue this card at the end of the session
        return g === "again" ? [...rest, q[0]] : rest;
      });
      setReviewedCount((n) => n + 1);
      setFlipped(false);
      setSubmitting(false);
    },
    [current, submitting]
  );

  // Keyboard: Space/Enter to reveal, 1–4 to grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (!flipped) {
        if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); setFlipped(true); }
        return;
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g) { e.preventDefault(); grade(g.grade); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, grade]);

  // Loading
  if (queue === null) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Loading your review deck…
      </div>
    );
  }

  // All done / nothing due
  if (!current) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-300/40">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mt-1">
          {reviewedCount > 0 ? "Review complete" : "Nothing due right now"}
        </h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {reviewedCount > 0
            ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? "" : "s"}. Come back when more are due for the best retention.`
            : "Generate flashcards from any note's Materials tab and they'll appear here when it's time to review."}
        </p>
        {embedded ? (
          <button
            onClick={onClose}
            className="mt-2 px-5 py-2.5 rounded-full text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-sm"
          >
            Back to notes
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="mt-2 px-5 py-2.5 rounded-full text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-sm"
          >
            Back to notes
          </Link>
        )}
      </div>
    );
  }

  const remaining = queue.length;
  const total = reviewedCount + remaining;
  const progress = total > 0 ? (reviewedCount / total) * 100 : 0;

  return (
    <div className={`h-full flex flex-col ${embedded ? "" : "px-5 sm:px-8 py-5"}`}>
      {!embedded && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-700 truncate">
              {scoped ? title : "Review"}
            </span>
            <Link
              href="/dashboard"
              className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Exit review"
            >
              <X size={17} />
            </Link>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-400 tabular-nums shrink-0">
              {reviewedCount}/{total}
            </span>
          </div>
        </>
      )}

      {/* Card */}
      <div className="flex-1 min-h-0 flex items-center">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full"
          style={{ perspective: "1200px" }}
          aria-label="Flip card"
        >
          <div
            className="relative w-full"
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              height: "clamp(240px, 42vh, 340px)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-xl shadow-violet-300/40 flex items-center justify-center px-8 select-none"
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="absolute top-5 left-1/2 -translate-x-1/2 max-w-[80%] truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55 text-center">
                {current.noteTitle}
              </span>
              <p className="text-2xl sm:text-[26px] font-semibold leading-snug text-white text-center text-balance">
                {plain(current.front)}
              </p>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/55">
                tap to reveal
              </span>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/60 flex flex-col px-7 py-6 select-none overflow-auto"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="shrink-0 mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-400">
                Answer
              </span>
              <div className="m-auto w-full prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 text-gray-800">
                <MarkdownRenderer>{current.back}</MarkdownRenderer>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="mt-5">
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            Show answer
            <span className="ml-2 text-white/40 text-xs font-normal">Space</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ grade: g, label, key, className }) => (
              <button
                key={g}
                onClick={() => grade(g)}
                disabled={submitting}
                className={`flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${className}`}
              >
                {label}
                <span className="text-[10px] font-medium opacity-40">{key}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
