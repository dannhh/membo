"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, FileText, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import type { NoteType } from "@/lib/note-types";

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
  documentUrl: string;
  onDocumentUrlChange: (url: string) => void;
  pdfFileName: string;
  onPdfUpload: (file: File) => void;
  onPdfClear: () => void;
  pdfLoading: boolean;
  onStart: () => void;
}

function NotePicker({
  noteType, onNoteTypeChange,
  title, onTitleChange,
  mode, onModeChange,
  documentUrl, onDocumentUrlChange,
  pdfFileName, onPdfUpload, onPdfClear, pdfLoading,
  onStart,
}: NotePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typeConfig = NOTE_TYPE_REGISTRY[noteType];
  const modeConfig = typeConfig.modes[mode];
  const modeCount = Object.keys(typeConfig.modes).length;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-center">
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
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm text-indigo-700">
                <FileText size={14} className="shrink-0" />
                <span className="flex-1 truncate text-left">{pdfFileName}</span>
                <button onClick={onPdfClear} className="shrink-0 text-indigo-400 hover:text-indigo-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfLoading || !!documentUrl}
                className="w-full"
              >
                {pdfLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Paperclip size={14} className="mr-2" />}
                Import PDF
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
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
              onClick={() => onModeChange(modeKey)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
                mode === modeKey
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
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

      <Button onClick={onStart} disabled={!title.trim()} size="lg" className="px-8">
        Start {typeConfig.modes[mode]?.label}
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

function MessageBubble({ message, isLast, onAnswer }: { message: Message; isLast?: boolean; onAnswer?: (letter: string) => void }) {
  const isUser = message.role === "user";

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
                className="flex items-start gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-left hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <span className="font-semibold text-indigo-600 shrink-0">{opt.letter})</span>
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
            ? "bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap"
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
}: {
  initialNoteType?: string;
  initialTitle?: string;
  initialMode?: string;
}) {
  const defaultNoteType = (initialNoteType as NoteType) ?? "concept";
  const defaultTypeConfig = NOTE_TYPE_REGISTRY[defaultNoteType];

  const [noteType, setNoteType] = useState<NoteType>(defaultNoteType);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [mode, setMode] = useState(initialMode ?? defaultTypeConfig.defaultMode);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(!!(initialNoteType && initialTitle));
  const [showQuizActions, setShowQuizActions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handlePdfUpload(file: File) {
    setPdfLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setDocumentContent(data.text);
        setPdfFileName(file.name);
      }
    } finally {
      setPdfLoading(false);
    }
  }

  async function sendMessage(userText: string) {
    if (!userText.trim() || loading) return;
    setShowQuizActions(false);

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
          title,
          messages: nextMessages,
          documentUrl: documentUrl || undefined,
          documentContent: documentContent || undefined,
        }),
      });

      const data = await res.json();
      if (data.text) {
        const modeConfig = NOTE_TYPE_REGISTRY[noteType]?.modes[mode];
        const isQuizFeedback =
          modeConfig?.hasQuizUI &&
          (data.text.includes("✅") || data.text.includes("❌") || userText === "Explain more");
        setShowQuizActions(isQuizFeedback ?? false);
        setMessages([...nextMessages, { role: "assistant", content: data.text }]);

        const summary = data.text.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 160);
        fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteType, title, summary }),
        });
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
    const startMsg = NOTE_TYPE_REGISTRY[noteType].modes[mode].startMessage(title);
    sendMessage(startMsg);
  }

  const currentTypeConfig = NOTE_TYPE_REGISTRY[noteType];
  const currentModeConfig = currentTypeConfig?.modes[mode];
  const TypeIcon = currentTypeConfig?.icon;
  const ModeIcon = currentModeConfig?.icon;

  if (!started) {
    return (
      <NotePicker
        noteType={noteType}
        onNoteTypeChange={(t) => {
          setNoteType(t);
          setMode(NOTE_TYPE_REGISTRY[t].defaultMode);
        }}
        title={title}
        onTitleChange={setTitle}
        mode={mode}
        onModeChange={setMode}
        documentUrl={documentUrl}
        onDocumentUrlChange={setDocumentUrl}
        pdfFileName={pdfFileName}
        onPdfUpload={handlePdfUpload}
        onPdfClear={() => { setPdfFileName(""); setDocumentContent(""); }}
        pdfLoading={pdfLoading}
        onStart={handleStart}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 bg-white">
        <div className="flex items-center gap-2 text-sm">
          {ModeIcon && <ModeIcon size={16} />}
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{currentModeConfig?.label}</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400 text-xs flex items-center gap-1">
            {TypeIcon && <TypeIcon size={12} />}
            {currentTypeConfig?.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs"
          onClick={() => {
            setStarted(false);
            setMessages([]);
            setTitle(initialTitle ?? "");
          }}
        >
          New session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            isLast={i === messages.length - 1}
            onAnswer={currentModeConfig?.hasQuizUI ? (letter) => sendMessage(letter) : undefined}
          />
        ))}
        {showQuizActions && !loading && (
          <div className="flex gap-2 mr-auto max-w-3xl">
            <Button variant="outline" size="sm" onClick={() => sendMessage("Explain more")}>
              Explain more
            </Button>
            <Button size="sm" onClick={() => sendMessage("Next question")}>
              Next question
            </Button>
          </div>
        )}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-3xl">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
