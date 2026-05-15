import { useEffect } from "react";

export function ClientBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    // Defer until after hydration so classes don't mismatch SSR
    const raf = requestAnimationFrame(() => {
      const SELECTOR =
        ".anim-fade-up, .anim-fade-down, .anim-fade-left, .anim-fade-right, .anim-scale";
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("in-view");
              io!.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => io!.observe(el));

      mo = new MutationObserver(() => {
        document
          .querySelectorAll<HTMLElement>(
            ".anim-fade-up:not(.in-view), .anim-fade-down:not(.in-view), .anim-fade-left:not(.in-view), .anim-fade-right:not(.in-view), .anim-scale:not(.in-view)"
          )
          .forEach((el) => io!.observe(el));
      });
      mo.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);
  return null;
}