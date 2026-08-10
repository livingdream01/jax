"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { id: "chat", label: "Chat", icon: "\ud83d\udcac", href: "/" },
  { id: "news", label: "News", icon: "\ud83d\udcf0", href: "/news" },
  { id: "automations", label: "Automations", icon: "\u26a1", href: "/automations" },
  { id: "settings", label: "Settings", icon: "\u2699", href: "/settings" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [connected] = useState(true);

  return (
    <div className="flex h-screen bg-apex-dark">
      <nav className="w-16 md:w-56 bg-apex-surface border-r border-apex-border flex flex-col shrink-0">
        <div className="p-4 border-b border-apex-border">
          <h1 className="text-apex-cyan font-bold text-xl hidden md:block">APEX</h1>
          <span className="text-apex-cyan font-bold text-xl md:hidden">A</span>
        </div>
        <div className="flex-1 py-2">
          {pages.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                pathname === p.href
                  ? "bg-apex-blue/10 text-apex-cyan border-r-2 border-apex-cyan"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <span className="hidden md:inline text-sm font-medium">{p.label}</span>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-apex-border">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs hidden md:inline">Connected</span>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}