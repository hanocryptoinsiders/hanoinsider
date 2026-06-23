import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="panel p-10 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8 animate-fade-in border border-destructive/20 bg-destructive/5">
      <div className="rounded-full bg-destructive/10 p-4 flex items-center justify-center text-destructive border border-destructive/20">
        <AlertCircle className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-xl sm:text-2xl leading-tight text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-2 inline-flex items-center gap-2 border-border/80 hover:bg-secondary">
          <RotateCcw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
