import { useEffect } from "react";

const SITE = "UBC Access Map";

/** Gives each route its own tab title (WCAG 2.4.2), e.g. "About · UBC Access Map". */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${SITE}` : SITE;
  }, [page]);
}
