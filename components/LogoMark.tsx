import Image from "next/image";

const LOGO_SRC = "/assets/hanoinfrontend/logo1.png";
const LOGO_INTRINSIC = 890;

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Circular Hano Insiders mask logo. Use before the Hano Insiders wordmark.
 */
export function LogoMark({ size = 32, className = "", priority = false }: Props) {
  const px = Math.round(size);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 bg-black ${className}`}
      style={{ width: px, height: px }}
    >
      <Image
        src={LOGO_SRC}
        alt="Hano Insiders Logo"
        width={LOGO_INTRINSIC}
        height={LOGO_INTRINSIC}
        quality={100}
        priority={priority}
        sizes={`${Math.ceil(px * 1.1)}px`}
        className="h-full w-full rounded-full object-cover"
      />
    </span>
  );
}
