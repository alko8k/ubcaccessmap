import { useEffect, useRef, type RefObject } from "react";

const NARROW = "(max-width: 900px)";

/**
 * Behaviour shared by the side panels.
 *
 * When `openKey` changes, focus moves to the panel so keyboard and screen
 * reader users land on what they just opened instead of staying on the map or
 * list. On narrow screens the panel renders below the map, so it is also
 * scrolled into view — otherwise tapping a marker looks like it did nothing.
 *
 * Escape closes the panel, unless the key press happened inside a dialog,
 * which handles Escape itself.
 */
export function usePanel(
  panelRef: RefObject<HTMLElement | null>,
  openKey: string,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const narrow = window.matchMedia?.(NARROW).matches ?? false;
    panel.focus({ preventScroll: !narrow });
    if (narrow) {
      panel.scrollIntoView({ block: "start" });
    }
  }, [panelRef, openKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      if (event.target instanceof Element && event.target.closest("dialog")) {
        return;
      }
      onCloseRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
