"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import type { CalendarEvent } from "@/lib/calendar";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

interface Message { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
  "What's on my schedule this week?",
  "Schedule a 2-hour study session tomorrow morning",
  "When am I free today?",
  "Show my focus time this week",
];

export function CalendarAIPanel({
  weekStart, weekEnd, focusGoalHrs, onEventsChange,
}: {
  weekStart: string;
  weekEnd: string;
  focusGoalHrs: number;
  onEventsChange: (updater: (prev: CalendarEvent[]) => CalendarEvent[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rescheduleNote, setRescheduleNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, weekStart, weekEnd, focusGoalHrs }),
      });
      const data = await res.json();
      if (data.text) setMessages([...next, { role: "assistant", content: data.text }]);
      if (data.focusRescheduled > 0 || data.focusDeleted > 0) {
        const note = data.focusDeleted > 0
          ? `${data.focusRescheduled} Focus block${data.focusRescheduled !== 1 ? "s" : ""} rescheduled · ${data.focusDeleted} removed (no room)`
          : `${data.focusRescheduled} Focus block${data.focusRescheduled !== 1 ? "s" : ""} auto-rescheduled`;
        setRescheduleNote(note);
        setTimeout(() => setRescheduleNote(null), 5000);
      }
      if (data.actionsExecuted > 0 && Array.isArray(data.mutatedEvents)) {
        // Optimistically apply mutated events back to calendar state
        onEventsChange((prev) => {
          let updated = [...prev];
          for (const ev of data.mutatedEvents as CalendarEvent[]) {
            const idx = updated.findIndex((e) => e.id === ev.id);
            if (idx >= 0) {
              updated[idx] = ev; // update or reschedule
            } else {
              updated = [...updated, ev]; // new event
            }
          }
          return updated;
        });
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700">Calendar AI</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Add, move, or ask about your schedule</p>
        {rescheduleNote && (
          <p className="mt-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 leading-tight">
            ↻ {rescheduleNote}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-400 text-center mb-3">Try asking…</p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full text-left px-3 py-2 rounded-xl border border-gray-100 text-xs text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex max-w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
              m.role === "user"
                ? "bg-indigo-500 text-white rounded-tr-sm whitespace-pre-wrap"
                : "bg-gray-100 text-gray-900 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
            }`}>
              {m.role === "user" ? m.content : <MarkdownRenderer>{m.content}</MarkdownRenderer>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm">
            <button
              type="button"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
            >
              <Plus size={14} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or command…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
            {loading && <Loader2 size={13} className="shrink-0 animate-spin text-gray-400" />}
          </div>
        </form>
      </div>
    </div>
  );
}
