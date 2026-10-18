import { useSyncExternalStore } from "react";

/** The breakpoint where the floating cards become a bottom sheet. Mirrors index.css. */
export const NARROW_QUERY = "(max-width: 900px)";

/**
 * Tracks a media query. Returns false where matchMedia is unavailable (jsdom,
 * very old browsers), which is the desktop layout.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** A one-off read for imperative code, such as camera moves. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
