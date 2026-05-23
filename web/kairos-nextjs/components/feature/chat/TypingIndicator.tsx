export function TypingIndicator() {
  return (
    <div className="flex animate-fade-up justify-start">
      <div className="insight-border-left flex items-center gap-1.5 rounded-lg bg-bg-elevated px-4 py-3 pl-5">
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}
