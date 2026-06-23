"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Route transition complete
    setProgress(100);
    const timer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      // Check if it was a left click with no modifier keys
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor) {
        const href = anchor.getAttribute("href");
        const targetAttr = anchor.getAttribute("target");

        // Handle internal navigation
        if (
          href &&
          href.startsWith("/") &&
          !href.startsWith("/#") &&
          (!targetAttr || targetAttr === "_self")
        ) {
          // Resolve current path compared to destination
          const currentUrl = new URL(window.location.href);
          const targetUrl = new URL(href, window.location.href);

          if (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
            startTransition(() => {
              setVisible(true);
              setProgress(10);
            });
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  // Simulate progress steps
  useEffect(() => {
    if (!visible || progress >= 90) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + 15;
        if (prev < 80) return prev + 5;
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <>
      <div 
        className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none"
        style={{
          boxShadow: "0 1px 10px rgba(250, 204, 21, 0.2)"
        }}
      >
        <div 
          className="h-full bg-[oklch(0.78_0.14_85)] shadow-[0_0_8px_oklch(0.78_0.14_85)] transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        body::after {
          content: '';
          display: block;
        }
      `}} />
    </>
  );
}
