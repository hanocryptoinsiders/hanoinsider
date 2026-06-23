"use client";

export function HanoWordmark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="leading-none select-none">
        <div className="flex items-end gap-1.5">
          <span className="font-display text-[1.7rem] font-extrabold tracking-[-0.08em] text-foreground">
            HA
          </span>
          <div className="flex flex-col items-start">
            <span className="mb-1 block h-0.5 w-9 bg-primary" />
            <span className="font-display text-[1.7rem] font-extrabold tracking-[-0.08em] text-foreground">
              NO
            </span>
          </div>
        </div>
        <div className="mt-1 pl-[1px] text-[0.55rem] font-semibold tracking-[0.42em] text-muted-foreground">
          INSIDERS
        </div>
      </div>
    );
  }

  return (
    <div className="leading-none">
      <div className="flex items-end gap-2">
        <span className="font-display text-[2rem] font-extrabold tracking-[-0.08em] text-foreground">
          HA
        </span>
        <div className="flex flex-col items-start">
          <span className="mb-1 block h-0.5 w-11 bg-primary" />
          <span className="font-display text-[2rem] font-extrabold tracking-[-0.08em] text-foreground">
            NO
          </span>
        </div>
      </div>
      <div className="mt-1 text-[0.62rem] font-semibold tracking-[0.42em] text-muted-foreground">
        INSIDERS
      </div>
    </div>
  );
}
