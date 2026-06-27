"use client";

import { useEffect, useRef, useState } from "react";

const PAYMENT_LOGOS = [
  { src: "/paymentMethods/stripe.png", alt: "Stripe" },
  { src: "/paymentMethods/mastercard.png", alt: "Mastercard" },
  { src: "/paymentMethods/paypal.png", alt: "PayPal" },
  { src: "/paymentMethods/usdt.png", alt: "USDT" },
  { src: "/paymentMethods/visa.png", alt: "Visa" },
  { src: "/paymentMethods/usdc.png", alt: "USDC" },
  { src: "/paymentMethods/mx.png", alt: "MX" },
] as const;

const MIN_COPIES = 3;
const GAP_PX = 48;
const SCROLL_SPEED_PX_PER_SEC = 36;

function LogoSet({
  setRef,
  hidden,
  id,
}: {
  setRef?: React.Ref<HTMLUListElement>;
  hidden?: boolean;
  id: number;
}) {
  return (
    <ul ref={setRef} className="payment-ticker-group" aria-hidden={hidden || undefined}>
      {PAYMENT_LOGOS.map((logo) => (
        <li key={`${id}-${logo.alt}`} className="payment-ticker-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={hidden ? "" : logo.alt}
            className="payment-ticker-logo"
            width={96}
            height={32}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </li>
      ))}
    </ul>
  );
}

export function PaymentMethodsTicker() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [copyCount, setCopyCount] = useState(MIN_COPIES);
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const set = setRef.current;
    if (!viewport || !set) return;

    const measure = () => {
      const width = set.getBoundingClientRect().width;
      const viewportWidth = viewport.getBoundingClientRect().width;
      if (!width) return;

      // Enough copies so the right edge never outruns the track while shifting one set.
      const needed = Math.max(MIN_COPIES, Math.ceil(viewportWidth / width) + 2);
      setSetWidth(width);
      setCopyCount(needed);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(set);

    return () => ro.disconnect();
  }, []);

  const durationSec = setWidth ? setWidth / SCROLL_SPEED_PX_PER_SEC : 32;
  const ready = setWidth > 0;

  return (
    <div className="payment-ticker" aria-label="Accepted payment methods">
      <div className="payment-ticker-viewport" ref={viewportRef}>
        <div
          className={`payment-ticker-track${ready ? " payment-ticker-track--ready" : ""}`}
          style={
            ready
              ? ({
                  "--marquee-shift": `${setWidth + GAP_PX}px`,
                  "--marquee-duration": `${durationSec}s`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {Array.from({ length: copyCount }, (_, i) => (
            <LogoSet key={i} id={i} setRef={i === 0 ? setRef : undefined} hidden={i > 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
