import Image from "next/image";

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
      <Image
        src="/assets/hanoinfrontend/logo.png"
        alt="Hano Insiders Logo"
        width={size}
        height={size}
        className="w-full h-full object-cover rounded-full"
      />
    </span>
  );
}
