"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, BookOpen, Brain, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Skill = "study" | "quiz" | "materials";
type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface ConceptPickerProps {
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  skill: Skill;
  onSkillChange: (s: Skill) => void;
}

const SKILL_OPTIONS: { value: Skill; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "study", label: "Study", icon: <BookOpen size={16} />, description: "Guided deep-dive into a concept" },
  { value: "quiz", label: "Quiz", icon: <Brain size={16} />, description: "Spaced-repetition quiz on what you've studied" },
  { value: "materials", label: "Materials", icon: <FileText size={16} />, description: "Generate notes, flashcards, or a cheat sheet" },
];

function ConceptPicker({ value, onChange, onStart, skill, onSkillChange }: ConceptPickerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What do you want to learn?</h1>
        <p className="text-gray-500 mt-2 text-sm">Enter a concept and choose how you want to engage with it.</p>
      </div>

      <div className="w-full max-w-sm">
        <Input
          placeholder="e.g. Transformer architecture, TCP/IP, RLHF..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onStart(); }}
          className="text-center h-12 text-base"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        {SKILL_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSkillChange(s.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
              skill === s.value
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            {s.icon}
            <span className="font-medium">{s.label}</span>
            <span className="text-xs text-gray-400 leading-tight">{s.description}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={onStart}
        disabled={!value.trim()}
        size="lg"
        className="px-8"
      >
        Start {SKILL_OPTIONS.find((s) => s.value === skill)?.label}
      </Button>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div
        className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap"
            : "bg-gray-100 text-gray-900 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
        )}
      >
        {isUser ? message.content : <ReactMarkdown>{message.content}</ReactMarkdown>}
      </div>
    </div>
  );
}

export function ChatInterface({ initialConcept }: { initialConcept?: string }) {
  const [concept, setConcept] = useState(initialConcept ?? "");
  const [skill, setSkill] = useState<Skill>("study");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(!!initialConcept);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(userText: string) {
    if (!userText.trim() || loading) return;

    const userMessage: Message = { role: "user", content: userText };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, concept, messages: nextMessages }),
      });

      const data = await res.json();
      if (data.text) {
        setMessages([...nextMessages, { role: "assistant", content: data.text }]);
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
    if (!concept.trim()) return;
    setStarted(true);
    // Kick off the session with an initial message
    sendMessage(`Let's ${skill} the concept: ${concept}`);
  }

  if (!started) {
    return (
      <ConceptPicker
        value={concept}
        onChange={setConcept}
        onStart={handleStart}
        skill={skill}
        onSkillChange={setSkill}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 bg-white">
        <div className="flex items-center gap-2 text-sm">
          {SKILL_OPTIONS.find((s) => s.value === skill)?.icon}
          <span className="font-semibold text-gray-900">{concept}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 capitalize">{skill}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs"
          onClick={() => {
            setStarted(false);
            setMessages([]);
            setConcept(initialConcept ?? "");
          }}
        >
          New session
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-3xl">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || loading} size="icon">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
