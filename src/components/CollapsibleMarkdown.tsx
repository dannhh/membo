"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { splitMarkdownSections, type MdSection } from "@/lib/markdown-sections";
import { cn } from "@/lib/utils";

const PROSE_CLASS =
  "prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs";

const SHORT_SECTION_CHARS = 400;

function sectionLength(section: MdSection): number {
  return section.body.length + section.children.reduce((sum, c) => sum + sectionLength(c), 0);
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

function Section({ section, depth }: { section: MdSection; depth: number }) {
  const [open, setOpen] = useState(() => sectionLength(section) < SHORT_SECTION_CHARS);

  const isTop = depth === 0;

  return (
    <div
      className={
        isTop
          ? "rounded-xl border border-gray-200 bg-white mb-2.5 overflow-hidden shadow-sm"
          : "rounded-lg border border-gray-100 bg-gray-50/60 mb-1 mt-1.5 overflow-hidden"
      }
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 text-left select-none transition-colors",
          isTop
            ? "px-4 py-3 hover:bg-gray-50"
            : "px-3 py-2 hover:bg-gray-100/60"
        )}
      >
        <ChevronRight
          size={isTop ? 14 : 11}
          className={cn(
            "shrink-0 transition-transform",
            isTop ? "text-gray-400" : "text-gray-300",
            open && "rotate-90"
          )}
        />
        <span
          className={
            isTop
              ? "text-sm font-bold text-gray-900"
              : "text-xs font-semibold text-gray-500 uppercase tracking-wide"
          }
        >
          {toSentenceCase(section.title)}
        </span>
      </button>
      {open && (
        <div className={isTop ? "px-4 pb-3" : "px-3 pb-2"}>
          {section.body.trim() && (
            <div className={PROSE_CLASS}>
              <MarkdownRenderer>{section.body}</MarkdownRenderer>
            </div>
          )}
          {section.children.map((child, i) => (
            <Section key={i} section={child} depth={depth + 1} />
          ))}
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
        <div className={cn(PROSE_CLASS, "mb-4")}>
          <MarkdownRenderer>{intro}</MarkdownRenderer>
        </div>
      )}
      {sections.map((s, i) => (
        <Section key={i} section={s} depth={0} />
      ))}
    </div>
  );
}
