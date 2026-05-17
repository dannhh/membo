"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        table: ({ ...props }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse text-sm" {...props} />
          </div>
        ),
        thead: ({ ...props }) => <thead className="bg-gray-50" {...props} />,
        th: ({ ...props }) => (
          <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-700" {...props} />
        ),
        td: ({ ...props }) => (
          <td className="border border-gray-200 px-4 py-2 text-gray-800" {...props} />
        ),
        tr: ({ ...props }) => (
          <tr className="even:bg-gray-50" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
