import { useEffect, useRef, type RefObject } from "react";

/**
 * Behaviour shared by the building and washroom panels.
 *
 * When `openKey` changes, focus moves to the panel so keyboard and screen
 * reader users land on what they just opened instead of staying on the map or
 * list. The panel floats over the map at every size, so focusing it never
 * needs to scroll the page.
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
    panelRef.current?.focus({ preventScroll: true });
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
