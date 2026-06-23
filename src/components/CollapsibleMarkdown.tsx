"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { splitMarkdownSections, type MdSection } from "@/lib/markdown-sections";
import { cn } from "@/lib/utils";

const PROSE_CLASS =
  "prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:text-xs";

// Short sections open by default so a quick glance shows the content;
// long ones stay collapsed so the overview isn't a wall of text.
const SHORT_SECTION_CHARS = 400;

function sectionLength(section: MdSection): number {
  return section.body.length + section.children.reduce((sum, c) => sum + sectionLength(c), 0);
}

function Section({ section, depth }: { section: MdSection; depth: number }) {
  const [open, setOpen] = useState(() => sectionLength(section) < SHORT_SECTION_CHARS);

  return (
    <div className={depth === 0 ? "rounded-xl border border-gray-100 bg-gray-50/60 mb-2 overflow-hidden" : "border-l border-gray-100 pl-3 mt-2"}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 text-left px-3 py-2 select-none"
      >
        <ChevronRight size={13} className={cn("shrink-0 text-gray-400 transition-transform", open && "rotate-90")} />
        <span className={depth === 0 ? "text-sm font-semibold text-gray-800" : "text-sm font-medium text-gray-700"}>
          {section.title}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
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
