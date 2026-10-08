import { useEffect, useRef, type RefObject } from "react";

/**
 * Reels bind keyboard shortcuts on `window`; inside the ArchLab page they must only
 * react while the pointer is over the player, it has focus, or it is fullscreen.
 */
export function useReelActive(wrap: RefObject<HTMLElement | null>): RefObject<boolean> {
  const active = useRef(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const on = () => (active.current = true);
    const off = () => (active.current = document.fullscreenElement === el);
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    el.addEventListener("focusin", on);
    el.addEventListener("focusout", off);
    return () => {
      el.removeEventListener("pointerenter", on);
      el.removeEventListener("pointerleave", off);
      el.removeEventListener("focusin", on);
      el.removeEventListener("focusout", off);
    };
  }, [wrap]);
  return active;
}
