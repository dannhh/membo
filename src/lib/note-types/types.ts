import type { LucideIcon } from "lucide-react";

export interface SubModeConfig {
  label: string;
  description: string;
  hasVocabUI?: boolean;
  hasFlipCardsUI?: boolean;
  model?: string;
  startMessage: (title: string) => string;
}

export interface ModeConfig {
  label: string;
  icon: LucideIcon;
  description: string;
  hasDocumentSource: boolean;
  useTools: boolean;
  hasQuizUI: boolean;
  startMessage?: (title: string) => string;
  subModes?: Record<string, SubModeConfig>;
  defaultSubMode?: string;
}

export interface PromptArgs {
  title: string;
  noteContent: string | null;
  metadataContent: string | null;
  documentContent?: string;
  subMode?: string;
}

export interface NoteTypeConfig {
  label: string;
  icon: LucideIcon;
  placeholder: string;
  titleLabel: string;
  modes: Record<string, ModeConfig>;
  defaultMode: string;
  buildSystemPrompt: (mode: string, args: PromptArgs) => string;
}

export const TOOL_RULES = `## Tool Use Rules
- Use the structured function-calling mechanism — NEVER write tool calls as code or text in your response.
- Do not output tool_code blocks, print() calls, or any programmatic representation of a tool call.
- Call tools silently and invisibly. Never mention that you are calling a tool, that you are about to call one, or what arguments you are passing.
- Never output phrases like "I need to call...", "I will now save...", "Saving...", or any description of your internal actions.
- After a tool call completes, continue directly with your next user-facing message — no commentary.`;

export function buildMemorySection(
  noteType: string,
  title: string,
  noteContent: string | null,
  metadataContent: string | null
): string {
  return `## Memory State

### Notes (${noteType}/${title})
${noteContent ?? "(no notes yet — first session)"}

### Metadata
${metadataContent ?? "(none)"}

## Memory Tools
- **save_note**: Save/update the main note content for this session.
- **save_note_metadata**: Save/update metadata (scores, progress, activity logs).

${TOOL_RULES}`;
}
