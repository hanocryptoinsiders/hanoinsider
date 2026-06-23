import { Lock } from "lucide-react";

export function LockOverlay({ label = "Upgrade to view", onUpgrade }: { label?: string; onUpgrade?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-background/70 backdrop-blur-sm">
      <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-[11px] tracking-wider text-muted-foreground">{label}</p>
      {onUpgrade && (
        <button onClick={onUpgrade} className="mt-1 rounded-md border border-border bg-secondary/60 px-3 py-1 text-[10px] hover:bg-secondary">
          Upgrade Now
        </button>
      )}
    </div>
  );
}
