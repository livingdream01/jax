"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveUser, getUsers, createUser, switchUser, type User } from "@/lib/auth";

const pages = [
  { id: "chat", label: "Chat", icon: ChatIcon, href: "/" },
  { id: "news", label: "News", icon: NewsIcon, href: "/news" },
  { id: "automations", label: "Automations", icon: AutoIcon, href: "/automations" },
  { id: "settings", label: "Settings", icon: GearIcon, href: "/settings" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useState(() => {
    setActiveUser(getActiveUser());
    setUsers(getUsers());
  });

  const handleCreateUser = () => {
    const name = prompt("Enter your name:")?.trim();
    if (name) {
      const user = createUser(name);
      setActiveUser(user);
      setUsers(getUsers());
      setUserMenuOpen(false);
      window.location.reload();
    }
  };

  const handleSwitchUser = (id: string) => {
    const user = switchUser(id);
    if (user) {
      setActiveUser(user);
      setUserMenuOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-56 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md accent-gradient-bg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-semibold text-[15px] text-text-primary tracking-tight">APEX</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-text-tertiary hover:text-text-primary p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {pages.map((p) => {
            const active = pathname === p.href;
            return (
              <Link
                key={p.id}
                href={p.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  active
                    ? "bg-accent-muted text-accent-glow"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-glass"
                }`}
              >
                <span className={`shrink-0 ${active ? "text-accent-glow" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                  <p.icon />
                </span>
                <span className="font-medium">{p.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-glow" />}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-border-subtle">
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-glass transition-colors text-left">
              <div className="w-7 h-7 rounded-full accent-gradient-bg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-[10px]">{activeUser?.name?.charAt(0)?.toUpperCase() || "?"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-primary truncate">{activeUser?.name || "Guest"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  <span className="text-[10px] text-text-tertiary">Online</span>
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-text-tertiary transition-transform ${userMenuOpen ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-bg-elevated border border-border-default rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                {users.map((u) => (
                  <button key={u.id} onClick={() => handleSwitchUser(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      u.id === activeUser?.id ? "bg-accent-muted text-accent-glow" : "text-text-secondary hover:bg-bg-glass"
                    }`}>
                    <div className="w-6 h-6 rounded-full accent-gradient-bg flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-[9px]">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="truncate">{u.name}</span>
                    {u.id === activeUser?.id && <span className="ml-auto text-[10px] text-accent-glow">Active</span>}
                  </button>
                ))}
                <div className="border-t border-border-subtle">
                  <button onClick={handleCreateUser} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-glass transition-colors">
                    <span className="text-lg">+</span>
                    <span>Add profile</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border-subtle md:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-text-secondary hover:text-text-primary p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="w-7 h-7 rounded-md accent-gradient-bg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-sm text-text-primary">APEX</span>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
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
      <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
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