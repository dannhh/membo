"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Clock, Folder as FolderIcon, FolderPlus, Pencil, Trash2, Plus, MoreHorizontal } from "lucide-react";
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
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const kids = childrenOf[folder.id] ?? [];

  const isSelected = selectedFolderId === folder.id;
  const count = counts[folder.id] ?? 0;

  useEffect(() => {
    if (!menuOpen && !confirming) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
      setConfirming(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, confirming]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors",
          isSelected ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-600 hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => { onSelect(folder.id); setMenuOpen(false); }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="shrink-0 text-gray-400"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <FolderIcon size={14} className={cn("shrink-0", isSelected ? "text-violet-500" : "text-gray-400")} />
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
            {count > 0 && (
              <span className={cn(
                "text-[11px] font-semibold rounded-full px-1.5 py-0.5 leading-none",
                isSelected ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-400"
              )}>
                {count}
              </span>
            )}
            <div className="relative shrink-0">
              <button
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="shrink-0 text-gray-300 hover:text-violet-500 transition-colors"
                aria-label="Folder actions"
              >
                <MoreHorizontal size={14} />
              </button>

              {(menuOpen || confirming) && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-100 bg-white shadow-lg p-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirming ? (
                    <div className="p-1.5 flex flex-col gap-2">
                      <p className="text-xs text-gray-500 leading-snug">Delete folder &amp; unfile its notes?</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setConfirming(false); setMenuOpen(false); }}
                          className="flex-1 px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { setConfirming(false); setMenuOpen(false); onDelete(folder.id); }}
                          className="flex-1 px-2 py-1 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <button
                        onClick={() => { setMenuOpen(false); setExpanded(true); setCreating(true); }}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Plus size={14} className="text-gray-400" /> Add subfolder
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setRenaming(true); }}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={13} className="text-gray-400" /> Rename
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        onClick={() => setConfirming(true)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-left text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

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

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 mb-4">
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-left transition-colors",
            selectedFolderId === undefined ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Clock size={15} className={selectedFolderId === undefined ? "text-violet-500" : "text-gray-400"} />
          Recent
        </button>
      </div>

      <div className="h-px bg-gray-100 mb-3" />

      <div className="flex items-center justify-between px-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Folders</span>
        <button onClick={() => setCreatingRoot(true)} className="text-gray-300 hover:text-violet-500 transition-colors" aria-label="New folder">
          <FolderPlus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
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
          <div className="flex items-center gap-1.5 px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <FolderIcon size={14} className="shrink-0 text-gray-300" />
            <InlineInput
              initialValue=""
              onSubmit={(v) => { setCreatingRoot(false); onCreate(v, null); }}
              onCancel={() => setCreatingRoot(false)}
            />
          </div>
        )}
        {roots.length === 0 && !creatingRoot && (
          <button
            onClick={() => setCreatingRoot(true)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:text-violet-600 hover:bg-gray-50 transition-colors"
          >
            <FolderPlus size={14} />
            New folder
          </button>
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
