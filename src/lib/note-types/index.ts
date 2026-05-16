import { CONCEPT_TYPE } from "./concept";
import { TRIP_TYPE } from "./trip";
import type { NoteTypeConfig } from "./types";

// To add a new note type: create a new folder, implement NoteTypeConfig, register it here.
export const NOTE_TYPE_REGISTRY: Record<string, NoteTypeConfig> = {
  concept: CONCEPT_TYPE,
  trip: TRIP_TYPE,
};

export type NoteType = keyof typeof NOTE_TYPE_REGISTRY;
export type { NoteTypeConfig, ModeConfig, PromptArgs } from "./types";
