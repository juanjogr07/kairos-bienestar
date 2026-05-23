import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-deep">
      <BottomNav />
      <main className="page-enter mx-auto max-w-2xl px-5 pb-28 pt-6 md:ml-20 md:max-w-3xl md:px-8 md:pb-12">
        {children}
      </main>
    </div>
  );
}
