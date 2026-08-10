"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { filterCommands, getCategories, type Command } from "@/lib/commands";

interface SlashMenuProps {
  isOpen: boolean;
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function SlashMenu({ isOpen, query, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = filterCommands(query);
  const categories = getCategories();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].command + " ");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  const grouped = categories
    .map((cat) => ({
      category: cat,
      items: filtered.filter((c) => c.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  let globalIdx = 0;

  return (
    <div ref={menuRef} className="absolute bottom-full left-0 right-0 mb-2 bg-bg-elevated border border-border-default rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-72 overflow-y-auto z-50 animate-fade-in">
      {grouped.map((group) => (
        <div key={group.category}>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider bg-bg-surface/50 border-b border-border-subtle">
            {group.category}
          </div>
          {group.items.map((cmd) => {
            const idx = globalIdx++;
            return (
              <button
                key={cmd.command}
                onClick={() => onSelect(cmd.command + " ")}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  idx === selectedIndex
                    ? "bg-accent-muted text-accent-glow"
                    : "text-text-secondary hover:bg-bg-glass"
                }`}
              >
                <span className="text-sm shrink-0 w-5 text-center">{cmd.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{cmd.command}</span>
                  {cmd.args && <span className="text-text-tertiary text-xs ml-1">{cmd.args}</span>}
                </div>
                <span className="text-xs text-text-tertiary ml-auto shrink-0 hidden sm:block">{cmd.description}</span>
              </button>
            );
          })}
        </div>
      ))}
      <div className="px-3 py-1.5 border-t border-border-subtle flex items-center gap-3 text-[10px] text-text-tertiary">
        <span><kbd className="bg-bg-glass px-1 rounded">\u2191\u2193</kbd> Navigate</span>
        <span><kbd className="bg-bg-glass px-1 rounded">\u21a9</kbd> Select</span>
        <span><kbd className="bg-bg-glass px-1 rounded">Esc</kbd> Close</span>
      </div>
    </div>
  );
}