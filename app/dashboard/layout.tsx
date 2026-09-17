"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { OpsProvider } from "@/context/OpsContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <OpsProvider>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMobileNav={() => setMobileNavOpen(true)} />

          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </OpsProvider>
  );
}
