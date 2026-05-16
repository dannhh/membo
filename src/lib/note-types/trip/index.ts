import { MapPin, Compass, PenLine, Map } from "lucide-react";
import { buildTripPrompt } from "./prompts";
import type { NoteTypeConfig } from "../types";

export const TRIP_TYPE: NoteTypeConfig = {
  label: "Trip",
  icon: MapPin,
  placeholder: "e.g. Tokyo 2024, Road trip to Yosemite...",
  titleLabel: "Where are you going?",
  defaultMode: "plan",
  buildSystemPrompt: buildTripPrompt,
  modes: {
    plan: {
      label: "Plan",
      icon: Compass,
      description: "Build a day-by-day itinerary",
      hasDocumentSource: false,
      useTools: true,
      hasQuizUI: false,
      startMessage: (t) => `Let's plan my trip to ${t}`,
    },
    journal: {
      label: "Journal",
      icon: PenLine,
      description: "Log your trip experiences",
      hasDocumentSource: false,
      useTools: true,
      hasQuizUI: false,
      startMessage: (t) => `Let's journal about my trip to ${t}`,
    },
    summarize: {
      label: "Summarize",
      icon: Map,
      description: "Create a trip summary or highlights",
      hasDocumentSource: false,
      useTools: false,
      hasQuizUI: false,
      startMessage: (t) => `Summarize my trip to ${t}`,
    },
  },
};
