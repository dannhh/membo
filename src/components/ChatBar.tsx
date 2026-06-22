"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUp, Slash } from "lucide-react";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import type { NoteType } from "@/lib/note-types";
import { useSession } from "@/components/SessionProvider";

interface SlashCommand {
  command: string;
  noteType: NoteType;
  mode: string;
}

const COMMANDS: SlashCommand[] = [
  { command: "study", noteType: "concept", mode: "study" },
  { command: "quiz", noteType: "concept", mode: "quiz" },
  { command: "materials", noteType: "concept", mode: "materials" },
  { command: "writing", noteType: "concept", mode: "writing" },
  { command: "trip", noteType: "trip", mode: "plan" },
  { command: "journal", noteType: "trip", mode: "journal" },
  { command: "summarize", noteType: "trip", mode: "summarize" },
];

function resolveCommand(cmd: SlashCommand) {
  const modeConfig = NOTE_TYPE_REGISTRY[cmd.noteType].modes[cmd.mode];
  return { ...cmd, label: modeConfig.label, icon: modeConfig.icon };
}

const SLASH_RE = /^\/(\S*)\s*([\s\S]*)$/;

export function ChatBar() {
  const { session, openSession } = useSession();
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterTerm = text.startsWith("/") ? text.slice(1).split(/\s/)[0] : "";
  const filtered = useMemo(
    () => COMMANDS.filter((c) => c.command.startsWith(filterTerm.toLowerCase())),
    [filterTerm]
  );

  function start(cmd: SlashCommand, title: string) {
    openSession(cmd.noteType, cmd.mode, title);
    setText("");
    setMenuOpen(false);
  }

  function pickCommand(cmd: SlashCommand) {
    const match = text.match(SLASH_RE);
    start(cmd, match ? match[2].trim() : "");
  }

  function handleChange(value: string) {
    setText(value);
    setMenuOpen(value.startsWith("/"));
  }

  function submit() {
    const raw = text.trim();
    const match = raw.match(SLASH_RE);
    const typed = match?.[1].toLowerCase();
    const cmd = (typed ? COMMANDS.find((c) => c.command === typed) : undefined) ?? COMMANDS[0];
    start(cmd, match ? match[2].trim() : raw);
  }

  if (session) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
      <div className="relative">
        {menuOpen && filtered.length > 0 && (
          <div className="absolute bottom-full mb-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {filtered.map((c) => {
              const resolved = resolveCommand(c);
              const Icon = resolved.icon;
              return (
                <button
                  key={c.command}
                  onClick={() => pickCommand(c)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700"
                >
                  <Icon size={14} className="text-violet-500 shrink-0" />
                  <span className="font-medium">/{c.command}</span>
                  <span className="text-gray-400">{resolved.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                if (e.key === "Escape") setMenuOpen(false);
              }}
              placeholder="Type / for a command, or just a topic..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="chat-bar-input"
              className="flex-1 min-w-0 text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-2.5">
            <button
              onClick={() => { setMenuOpen((v) => !v); inputRef.current?.focus(); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-colors"
              aria-label="Slash commands"
            >
              <Slash size={14} />
            </button>
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              aria-label="Start session"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
