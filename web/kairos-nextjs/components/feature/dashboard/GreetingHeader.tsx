import { Sun } from "lucide-react";

interface GreetingHeaderProps {
  name: string;
  screenTime: string;
}

export function GreetingHeader({ name, screenTime }: GreetingHeaderProps) {
  return (
    <section className="animate-fade-up" style={{ animationDelay: "0ms" }}>
      <div className="flex items-center gap-2 text-text-secondary">
        <span className="text-sm font-medium">Buenos días, {name}</span>
        <Sun size={16} className="text-accent-warm-2" />
      </div>
      <h1 className="mt-1 text-xl font-bold text-text-primary md:text-2xl">
        Hoy llevo{" "}
        <span className="font-mono text-accent-primary">{screenTime}</span> en
        pantalla
      </h1>
    </section>
  );
}
