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
      defaultSubMode: "general",
      subModes: {
        general: {
          label: "General",
          description: "Structured study session with a tutor",
          model: "gemini-2.5-pro",
          startMessage: (t) => `Let's study the concept: ${t}`,
        },
        vocab: {
          label: "Vocab",
          description: "Build a vocabulary word bank",
          hasVocabUI: true,
          startMessage: (t) => `Start vocab session for: ${t}`,
        },
      },
    },
    quiz: {
      label: "Quiz",
      icon: Brain,
      description: "Spaced-repetition quiz on what you've studied",
      hasDocumentSource: true,
      useTools: true,
      hasQuizUI: true,
      defaultSubMode: "general",
      subModes: {
        general: {
          label: "General",
          description: "Quiz on the concept",
          startMessage: (t) => `Let's quiz on the concept: ${t}`,
        },
        vocab: {
          label: "Vocab",
          description: "Quiz on your vocabulary word bank",
          startMessage: (t) => `Let's quiz on my vocabulary for: ${t}`,
        },
      },
    },
    materials: {
      label: "Materials",
      icon: FileText,
      description: "Generate notes, flashcards, or a cheat sheet",
      hasDocumentSource: false,
      useTools: false,
      hasQuizUI: false,
      defaultSubMode: "general",
      subModes: {
        general: {
          label: "General",
          description: "Notes, flashcards, or cheat sheet",
          startMessage: (t) => `Generate study materials for: ${t}`,
        },
        vocab: {
          label: "Vocab",
          description: "Flashcards and reference for your word bank",
          hasFlipCardsUI: true,
          startMessage: (t) => `Generate vocabulary materials for: ${t}`,
        },
      },
    },
  },
};
