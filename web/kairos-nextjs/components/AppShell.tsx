"use client";

import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  showRight?: boolean;
}

export function AppShell({ children, showRight = true }: AppShellProps) {
  return (
    <>
      {/* Ambient background layers */}
      <div className="ambient" aria-hidden="true">
        <div className="blob3" />
        <div className="grid-pattern" />
        <div className="stars" />
        <div className="beam" />
        <div className="beam b2" />
      </div>

      <div className={`app-shell${showRight ? "" : " no-right"}`}>
        {/* Icon sidebar — hidden on mobile */}
        <Sidebar />

        {/* Main content */}
        <main className="main-content">
          {children}
        </main>

        {/* Right panel — hidden below 1100px */}
        {showRight && <RightPanel />}
      </div>

      {/* Bottom nav — visible on mobile only */}
      <BottomNav />
    </>
  );
}
