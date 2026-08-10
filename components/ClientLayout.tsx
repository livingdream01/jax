"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { id: "chat", label: "Chat", icon: ChatIcon, href: "/" },
  { id: "news", label: "News", icon: NewsIcon, href: "/news" },
  { id: "automations", label: "Automations", icon: AutoIcon, href: "/automations" },
  { id: "settings", label: "Settings", icon: GearIcon, href: "/settings" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <aside className="w-16 md:w-56 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md accent-gradient-bg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="hidden md:block font-semibold text-[15px] text-text-primary tracking-tight">APEX</span>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {pages.map((p) => {
            const active = pathname === p.href;
            return (
              <Link
                key={p.id}
                href={p.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  active
                    ? "bg-accent-muted text-accent-glow"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-glass"
                }`}
              >
                <span className={`shrink-0 ${active ? "text-accent-glow" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                  <p.icon />
                </span>
                <span className="hidden md:block font-medium">{p.label}</span>
                {active && <span className="ml-auto w-1 h-1 rounded-full bg-accent-glow hidden md:block" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs text-text-tertiary hidden md:block">Online</span>
            <span className="text-[11px] text-text-tertiary hidden md:block ml-auto">v0.2</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}