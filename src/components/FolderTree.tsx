"use client";

import { useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, Pencil, Trash2, Plus, Inbox, LayoutGrid, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
}

interface FolderTreeProps {
  folders: FolderRow[];
  counts: Record<string, number>;
  selectedFolderId: string | null | undefined;
  onSelect: (id: string | null | undefined) => void;
  onCreate: (name: string, parentId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function InlineInput({ initialValue, onSubmit, onCancel }: { initialValue: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") onCancel();
      }}
      className="flex-1 text-sm bg-transparent border-b border-violet-400 outline-none leading-snug min-w-0"
      autoFocus
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function FolderNode({
  folder, depth, childrenOf, counts, selectedFolderId, onSelect, onCreate, onRename, onDelete,
}: {
  folder: FolderRow;
  depth: number;
  childrenOf: Record<string, FolderRow[]>;
  counts: Record<string, number>;
  selectedFolderId: string | null | undefined;
  onSelect: (id: string | null | undefined) => void;
  onCreate: (name: string, parentId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const kids = childrenOf[folder.id] ?? [];
  const hasKids = kids.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-sm",
          selectedFolderId === folder.id ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => { onSelect(folder.id); setMenuOpen(false); }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={cn("shrink-0 text-gray-400", !hasKids && !creating && "opacity-0")}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <FolderIcon size={14} className="shrink-0 text-gray-400" />
        {renaming ? (
          <InlineInput
            initialValue={folder.name}
            onSubmit={(v) => { setRenaming(false); onRename(folder.id, v); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}
        {!renaming && (
          <>
            <span className="text-xs text-gray-300">{counts[folder.id] ?? 0}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="shrink-0 text-gray-300 hover:text-violet-500"
              aria-label="Folder actions"
            >
              <MoreHorizontal size={14} />
            </button>
          </>
        )}
      </div>

      {menuOpen && (
        <div className="flex items-center gap-3 px-2 py-1" style={{ paddingLeft: `${depth * 14 + 30}px` }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setMenuOpen(false); setExpanded(true); setCreating(true); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600">
            <Plus size={11} /> Add
          </button>
          <button onClick={() => { setMenuOpen(false); setRenaming(true); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600">
            <Pencil size={10} /> Rename
          </button>
          <button onClick={() => { setMenuOpen(false); setConfirming(true); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}

      {confirming && (
        <div className="flex items-center gap-2 px-2 py-1" style={{ paddingLeft: `${depth * 14 + 30}px` }} onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-400">Delete &amp; unfile notes?</span>
          <button onClick={() => { setConfirming(false); onDelete(folder.id); }} className="text-xs text-red-500 font-medium">Delete</button>
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-400">Cancel</button>
        </div>
      )}

      {expanded && (
        <>
          {kids.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              counts={counts}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
          {creating && (
            <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }} onClick={(e) => e.stopPropagation()}>
              <FolderIcon size={14} className="shrink-0 text-gray-300" />
              <InlineInput
                initialValue=""
                onSubmit={(v) => { setCreating(false); onCreate(v, folder.id); }}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function FolderTree({ folders, counts, selectedFolderId, onSelect, onCreate, onRename, onDelete }: FolderTreeProps) {
  const [creatingRoot, setCreatingRoot] = useState(false);
  const childrenOf = folders.reduce<Record<string, FolderRow[]>>((acc, f) => {
    const key = f.parentId ?? "__root__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});
  const roots = childrenOf["__root__"] ?? [];
  const unfiledCount = counts.__unfiled__ ?? 0;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Folders</span>
        <button onClick={() => setCreatingRoot(true)} className="text-gray-300 hover:text-violet-500" aria-label="New folder">
          <FolderPlus size={14} />
        </button>
      </div>

      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left",
          selectedFolderId === undefined ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-50"
        )}
      >
        <LayoutGrid size={14} className="text-gray-400" />
        All
      </button>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left",
          selectedFolderId === null ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-50"
        )}
      >
        <Inbox size={14} className="text-gray-400" />
        <span className="flex-1">Unfiled</span>
        <span className="text-xs text-gray-300">{unfiledCount}</span>
      </button>

      <div className="mt-1">
        {roots.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            depth={0}
            childrenOf={childrenOf}
            counts={counts}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
        {creatingRoot && (
          <div className="flex items-center gap-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <FolderIcon size={14} className="shrink-0 text-gray-300" />
            <InlineInput
              initialValue=""
              onSubmit={(v) => { setCreatingRoot(false); onCreate(v, null); }}
              onCancel={() => setCreatingRoot(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function buildFolderPaths(folders: FolderRow[]): Record<string, string> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const paths: Record<string, string> = {};
  function pathOf(id: string): string {
    if (paths[id]) return paths[id];
    const f = byId.get(id);
    if (!f) return "";
    const path = f.parentId ? `${pathOf(f.parentId)} / ${f.name}` : f.name;
    paths[id] = path;
    return path;
  }
  folders.forEach((f) => pathOf(f.id));
  return paths;
}
