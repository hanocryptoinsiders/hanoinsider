"use client";

import { useEffect } from "react";

const MOBILE_MQ = "(max-width: 767px)";

export function useLandingMobileReveal() {
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    if (!mq.matches) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sync = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-m-reveal]");
      if (!mq.matches) {
        els.forEach((el) => el.classList.remove("m-in-view"));
        return;
      }
      if (reducedMotion) {
        els.forEach((el) => el.classList.add("m-in-view"));
      }
    };

    sync();
    if (reducedMotion) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("m-in-view");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>("[data-m-reveal]").forEach((el) => {
        const delay = el.dataset.mRevealDelay;
        if (delay) el.style.setProperty("--m-reveal-delay", delay);
        if (!el.classList.contains("m-in-view")) io.observe(el);
      });
    };

    observeAll();

    const onMqChange = () => {
      if (!mq.matches) {
        io.disconnect();
        document.querySelectorAll<HTMLElement>("[data-m-reveal]").forEach((el) => {
          el.classList.remove("m-in-view");
        });
        return;
      }
      observeAll();
    };

    mq.addEventListener("change", onMqChange);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMqChange);
    };
  }, []);
}
