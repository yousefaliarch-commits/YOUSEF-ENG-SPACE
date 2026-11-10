// =====================================================================
//  What the web address opens: the public page or the app.
//  · engspace.org with nothing after it shows the public page to a visitor who is not signed in. Everything else is the
//    app: a signed-in member, any app or admin route, and — never to be intercepted — a return from sign-in (Supabase
//    sends ?code=…, ?error=…; password reset adds ?reset=1; older links carry tokens in the fragment).
//  · «#landing» shows the public page to anyone, signed in or not. The phone apps have no public page.
// =====================================================================
export type EntryView = "landing" | "app";

// query parameters that mean «this load is the way back from an auth step»
export const AUTH_PARAMS = ["code", "error", "error_code", "error_description", "reset", "token_hash", "type", "access_token", "refresh_token"];

export function entryView(o: { native: boolean; hash: string; search: string; signedIn: boolean }): EntryView {
  if (o.native) return "app";
  const route = String(o.hash || "").replace(/^#\/?/, "");
  if (route === "landing") return "landing";
  if (route) return "app";
  let query: URLSearchParams;
  try {
    query = new URLSearchParams(o.search || "");
  } catch {
    return "app";
  }
  if (AUTH_PARAMS.some((k) => query.has(k))) return "app";
  return o.signedIn ? "app" : "landing";
}

// a member is signed in on this browser: the app's own marker, or a stored Supabase session
export function signedInHere(): boolean {
  try {
    return localStorage.getItem("engspace.session.v1") === "1" || !!localStorage.getItem("engspace.auth");
  } catch {
    return false;
  }
}
