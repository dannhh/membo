"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

interface Message { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
  "How is my spending this month?",
  "Add bank account VCB with $5,000",
  "Record $50 food expense today",
  "Set $500 budget for Food & Dining",
];

export function FinanceAIPanel({ month, onRefresh }: { month: string; onRefresh?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
      const res = await fetch("/api/finance/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, month }),
      });
      const data = await res.json();
      if (data.text) setMessages([...next, { role: "assistant", content: data.text }]);
      if (data.actionsExecuted > 0) onRefresh?.();
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center mb-4">Ask about your finances or give a command</p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full text-left px-3 py-2 rounded-xl border border-gray-100 text-xs text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 max-w-full ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-violet-600 text-white rounded-tr-sm whitespace-pre-wrap"
                : "bg-gray-100 text-gray-900 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
            }`}>
              {m.role === "user" ? m.content : <MarkdownRenderer>{m.content}</MarkdownRenderer>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — Gemini-style pill */}
      <div className="p-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm">
            <button
              type="button"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <Plus size={16} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask AI…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
            {loading && (
              <Loader2 size={14} className="shrink-0 animate-spin text-gray-400" />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
