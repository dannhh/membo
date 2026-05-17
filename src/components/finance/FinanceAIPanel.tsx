"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
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
                ? "bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap"
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

      {/* Input — matches Trip planner style */}
      <div className="border-t border-gray-200 p-4 bg-white shrink-0">
        <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask or say 'add account VCB…'"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
