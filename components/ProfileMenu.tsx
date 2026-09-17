"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings, SlidersHorizontal, UserRound } from "lucide-react";

export const DEMO_USER = {
  name: "Sangeeta Siddayya Hiremath",
  role: "Operations Analyst",
  initials: "SS",
  status: "Online",
} as const;

export function ProfileMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative border-t border-white/5 p-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-white/10 bg-ink-900 shadow-lift"
            role="menu"
          >
            <div className="border-b border-white/5 px-3 py-2.5">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm font-medium text-white">{DEMO_USER.name}</p>
            </div>
            {[
              { label: "My profile", icon: UserRound },
              { label: "Preferences", icon: SlidersHorizontal },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </button>
            ))}
            <Link
              href="/"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2.5 border-t border-white/5 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </Link>
            <p className="bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-500">
              Demo account — no authentication is configured.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ai-500 to-ai-700 text-xs font-semibold text-white">
          {DEMO_USER.initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {DEMO_USER.name}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {DEMO_USER.role} · {DEMO_USER.status}
          </span>
        </span>
        <Settings
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 hover:rotate-45"
          aria-hidden
        />
      </button>
    </div>
  );
}

export default ProfileMenu;
