// A minimal service-role client over Supabase's REST endpoints (no npm dependency: nothing to download at cold start).
// Used by upload-media; the shape mirrors supabase-js ({ data, error }) so handlers read the same either way.
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type Result<T> = { data: T | null; error: { message: string; code?: string; status?: number } | null };

export function restClient(url: string, key: string, fetchFn: Fetch = fetch) {
  const base = url.replace(/\/$/, "");
  const svc = { apikey: key, authorization: `Bearer ${key}` };
  const read = async <T>(r: Response): Promise<Result<T>> => {
    const text = await r.text(); let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (r.ok) return { data: body as T, error: null };
    const message = (body && (body.message || body.msg || body.error_description || body.error)) || `HTTP ${r.status}`;
    return { data: null, error: { message: String(message), code: body && body.code ? String(body.code) : undefined, status: r.status } };
  };
  return {
    // the member behind a JWT (Auth checks the signature and expiry)
    async user(jwt: string): Promise<{ id: string } | null> {
      if (!jwt) return null;
      const r = await fetchFn(`${base}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${jwt}` } });
      if (!r.ok) return null; const u = await r.json().catch(() => null); return u && u.id ? { id: String(u.id) } : null;
    },
    rpc: async <T = unknown>(fn: string, args: Record<string, unknown>) =>
      read<T>(await fetchFn(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...svc, "content-type": "application/json" }, body: JSON.stringify(args) })),
    upload: async (bucket: string, path: string, bytes: Uint8Array, mime: string, cache: string) =>
      read(await fetchFn(`${base}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: { ...svc, "content-type": mime, "cache-control": `max-age=${cache}`, "x-upsert": "false" }, body: bytes as unknown as BodyInit })),
    remove: async (bucket: string, paths: string[]) =>
      read(await fetchFn(`${base}/storage/v1/object/${bucket}`, { method: "DELETE", headers: { ...svc, "content-type": "application/json" }, body: JSON.stringify({ prefixes: paths }) })),
    move: async (bucket: string, from: string, to: string) =>
      read(await fetchFn(`${base}/storage/v1/object/move`, { method: "POST", headers: { ...svc, "content-type": "application/json" }, body: JSON.stringify({ bucketId: bucket, sourceKey: from, destinationKey: to }) })),
  };
}
export type RestClient = ReturnType<typeof restClient>;
