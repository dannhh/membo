"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, Heading2, List, ListOrdered, Quote, Undo2, Redo2 } from "lucide-react";

// tiptap-markdown stores its serializer on editor.storage but doesn't augment
// the core Storage type, so reach for it through a narrow cast.
function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
}

const PROSE_CLASS =
  "prose prose-sm max-w-none min-h-[50vh] rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-violet-300 " +
  "prose-headings:font-semibold prose-headings:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection while clicking
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none ${
        active ? "bg-violet-100 text-violet-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * WYSIWYG note editor. Reads and writes Markdown so stored note content stays
 * compatible with the rest of the app (renderer, share page, flashcards), while
 * the user edits formatted text directly — bold/headings/lists show live.
 */
export default function MarkdownEditor({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onSave?: () => void;
}) {
  // handleKeyDown is captured once at editor creation, so route through a ref
  // to always invoke the latest onSave (which closes over the latest draft).
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ transformPastedText: true, transformCopiedText: true }),
    ],
    content: value,
    immediatelyRender: false,
    autofocus: "end",
    editorProps: {
      attributes: { class: PROSE_CLASS },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          onSaveRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(getMarkdown(editor)),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      heading: editor?.isActive("heading", { level: 2 }) ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
      quote: editor?.isActive("blockquote") ?? false,
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
    }),
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5 flex-wrap">
        <ToolbarButton label="Bold" active={state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton label="Heading" active={state?.heading} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="Bullet list" active={state?.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={state?.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={state?.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton label="Undo" disabled={!state?.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!state?.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
