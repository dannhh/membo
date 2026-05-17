"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

const MarkdownRenderer = dynamic(() => import("@/components/MarkdownRenderer"), { ssr: false });

interface Message { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
  "How is my spending this month?",
  "Am I on track with my budgets?",
  "Which category did I overspend?",
  "What is my net worth?",
];

export function FinanceAIPanel({ month, onClose }: { month: string; onClose: () => void }) {
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
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div>
          <p className="text-sm font-semibold text-gray-900">AI Finance Advisor</p>
          <p className="text-[10px] text-gray-400">Powered by Gemini</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center">Ask anything about your finances</p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-900 rounded-tl-sm prose prose-xs max-w-none prose-p:my-0.5"
            }`}>
              {m.role === "user" ? m.content : <MarkdownRenderer>{m.content}</MarkdownRenderer>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-gray-100">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 p-3 shrink-0">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            disabled={loading}
            className="flex-1 h-8 text-xs"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!input.trim() || loading}>
            <Send size={13} />
          </Button>
        </form>
      </div>
    </div>
  );
}
