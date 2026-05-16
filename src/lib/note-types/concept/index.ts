import { BookOpen, Brain, FileText } from "lucide-react";
import { buildConceptPrompt } from "./prompts";
import type { NoteTypeConfig } from "../types";

export const CONCEPT_TYPE: NoteTypeConfig = {
  label: "Concept",
  icon: BookOpen,
  placeholder: "e.g. Transformer architecture, TCP/IP, RLHF...",
  titleLabel: "What do you want to learn?",
  defaultMode: "study",
  buildSystemPrompt: buildConceptPrompt,
  modes: {
    study: {
      label: "Study",
      icon: BookOpen,
      description: "Guided deep-dive into a concept",
      hasDocumentSource: false,
      useTools: true,
      hasQuizUI: false,
      startMessage: (t) => `Let's study the concept: ${t}`,
    },
    quiz: {
      label: "Quiz",
      icon: Brain,
      description: "Spaced-repetition quiz on what you've studied",
      hasDocumentSource: true,
      useTools: true,
      hasQuizUI: true,
      startMessage: (t) => `Let's quiz on the concept: ${t}`,
    },
    materials: {
      label: "Materials",
      icon: FileText,
      description: "Generate notes, flashcards, or a cheat sheet",
      hasDocumentSource: false,
      useTools: false,
      hasQuizUI: false,
      startMessage: (t) => `Generate study materials for: ${t}`,
    },
  },
};
