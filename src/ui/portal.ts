// =====================================================================
//  Where dialogs are mounted: the app's root element, not <body>.
//  · A pushed screen is a transformed layer (it would trap position: fixed under the header), so dialogs leave it — but
//    they must stay inside the root: it carries the accent colours (--accent · --solid · --wash, set per theme in App.tsx)
//    and the language's direction. On <body> a primary button has no fill and an English dialog reads right-to-left.
//  · No document (tests, a server render) → null: the caller returns its node in place.
// =====================================================================
export function portalHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-app-root]") || document.body;
}
