import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="panel p-10 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8 animate-fade-in border border-border/80 bg-secondary/5">
      <div className="rounded-full bg-secondary p-4 flex items-center justify-center text-muted-foreground border border-border/40">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-xl sm:text-2xl leading-tight text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
