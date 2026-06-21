"use client";

import { createContext, useContext, useState } from "react";
import type { NoteType } from "@/lib/note-types";

export interface ActiveSession {
  noteType: NoteType;
  mode: string;
  title?: string;
  subMode?: string;
}

interface SessionContextValue {
  session: ActiveSession | null;
  openSession: (noteType: NoteType, mode: string, title?: string, subMode?: string) => void;
  closeSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(null);

  function openSession(noteType: NoteType, mode: string, title?: string, subMode?: string) {
    setSession({ noteType, mode, title: title || undefined, subMode });
  }

  function closeSession() {
    setSession(null);
  }

  return (
    <SessionContext.Provider value={{ session, openSession, closeSession }}>
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
    </SessionContext.Provider>
  );
}
