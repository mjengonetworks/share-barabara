import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(motionQuery.matches);
    const onScroll = () => setVisible(window.scrollY > 420);
    update();
    onScroll();
    motionQuery.addEventListener("change", update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      motionQuery.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;
  return <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })} className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-colors hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"><ArrowUp aria-hidden="true" className="size-5" /></button>;
}
