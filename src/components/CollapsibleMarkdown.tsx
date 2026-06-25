"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { splitMarkdownSections, type MdSection } from "@/lib/markdown-sections";
import { cn } from "@/lib/utils";

const PROSE_CLASS =
  "prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h4:text-[11px] prose-h4:font-semibold prose-h4:text-gray-400 prose-h4:uppercase prose-h4:tracking-widest prose-h4:mt-4 prose-h4:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs";
const SHORT_SECTION_CHARS = 400;

function sectionLength(section: MdSection): number {
  return section.body.length + section.children.reduce((sum, c) => sum + sectionLength(c), 0);
}

// Strip inline markdown markers (bold, italic, code) so heading text from the
// model doesn't show literal **asterisks** or `backticks` in the section title.
function stripInlineMarkdown(s: string): string {
  return s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

// Sentence case: capitalise first letter, lowercase the rest — but preserve
// all-caps words (acronyms like IELTS, HTML) and single uppercase letters.
function toSentenceCase(s: string): string {
  if (!s) return s;
  return s
    .split(" ")
    .map((word, i) => {
      if (!word) return word;
      // Preserve all-caps words (acronyms) and single-letter tokens
      if (word.length <= 1 || word === word.toUpperCase()) return word;
      return i === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase();
    })
    .join(" ");
}

// Clean a heading for display: drop inline markdown, and only de-shout titles
// the model wrote in ALL CAPS. Titles already in nice mixed/Title case (or that
// carry their own numbering) are kept verbatim.
function normalizeTitle(raw: string): string {
  const s = stripInlineMarkdown(raw);
  const letters = s.replace(/[^a-zA-Z]/g, "");
  const shouty = letters.length > 1 && letters === letters.toUpperCase();
  return shouty ? toSentenceCase(s) : s;
}

const ALREADY_NUMBERED = /^\d+([.)]\d+)*[.)]?\s/;

// Compose the displayed heading: prefix our hierarchical number (1, 1.1, 1.1.1)
// unless the model already numbered the heading itself.
function buildLabel(number: string, title: string, top: boolean): string {
  if (ALREADY_NUMBERED.test(title)) return title;
  return top ? `${number}. ${title}` : `${number} ${title}`;
}

function Body({ section }: { section: MdSection }) {
  if (!section.body.trim()) return null;
  return (
    <div className={PROSE_CLASS}>
      <MarkdownRenderer>{section.body}</MarkdownRenderer>
    </div>
  );
}

function Children({ section, depth, number }: { section: MdSection; depth: number; number: string }) {
  return (
    <>
      {section.children.map((child, i) => (
        <Section key={i} section={child} depth={depth + 1} number={`${number}.${i + 1}`} />
      ))}
    </>
  );
}

// Heading size scale — bigger at the top, gradually smaller with depth.
function headingClass(depth: number): string {
  switch (depth) {
    case 0: return "text-lg font-bold text-gray-900 leading-snug";
    case 1: return "text-base font-bold text-gray-800 leading-snug";
    case 2: return "text-sm font-semibold text-gray-700 leading-snug";
    default: return "text-xs font-semibold text-gray-600 leading-snug";
  }
}

function Section({ section, depth, number }: { section: MdSection; depth: number; number: string }) {
  const title = normalizeTitle(section.title);

  // ## — bordered card, plain always-open heading (no toggle). Largest, with
  // the most surrounding space.
  if (depth === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white mb-6 overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-2.5">
          <h3 className={headingClass(0)}>{buildLabel(number, title, true)}</h3>
        </div>
        <div className="px-5 pb-4">
          <Body section={section} />
          <Children section={section} depth={depth} number={number} />
        </div>
      </div>
    );
  }

  // ### — plain always-open sub-heading (1.1, 1.2), no toggle.
  if (depth === 1) {
    return (
      <div className="mt-5 first:mt-2">
        <h4 className={cn(headingClass(1), "mb-1.5")}>{buildLabel(number, title, false)}</h4>
        <Body section={section} />
        <Children section={section} depth={depth} number={number} />
      </div>
    );
  }

  // #### and deeper — collapsible toggle, smallest.
  return <CollapsibleSubSection section={section} depth={depth} number={number} title={title} />;
}

function CollapsibleSubSection({ section, depth, number, title }: { section: MdSection; depth: number; number: string; title: string }) {
  const [open, setOpen] = useState(() => sectionLength(section) < SHORT_SECTION_CHARS);

  return (
    <div className={depth === 2 ? "mt-3" : "mt-2"}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-1.5 text-left select-none group"
      >
        <ChevronRight
          size={depth === 2 ? 13 : 12}
          className={cn(
            "shrink-0 text-gray-400 transition-transform group-hover:text-gray-600 mt-0.5",
            open && "rotate-90"
          )}
        />
        <span className={headingClass(depth)}>{buildLabel(number, title, false)}</span>
      </button>
      {open && (
        <div className="mt-1 pl-[20px]">
          <Body section={section} />
          <Children section={section} depth={depth} number={number} />
        </div>
      )}
    </div>
  );
}

export function CollapsibleMarkdown({ content }: { content: string }) {
  const { intro, sections } = splitMarkdownSections(content);

  if (sections.length === 0) {
    return (
      <div className={PROSE_CLASS}>
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </div>
    );
  }

  return (
    <div>
      {intro && (
        <div className={cn(PROSE_CLASS, "mb-5")}>
          <MarkdownRenderer>{intro}</MarkdownRenderer>
        </div>
      )}
      {sections.map((s, i) => (
        <Section key={i} section={s} depth={0} number={String(i + 1)} />
      ))}
    </div>
  );
}
