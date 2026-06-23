type Props = {
  size?: number;
  className?: string;
};

/**
 * Circular Hano Insiders mask logo. Use before the Hano Insiders wordmark.
 */
export function LogoMark({ size = 32, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 bg-black ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="font-display text-[0.9em] font-extrabold tracking-[-0.08em] text-foreground">
        H<span className="text-primary">N</span>
      </span>
    </span>
  );
}
