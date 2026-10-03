// src/backend/cloud.ts handleAuthUrl — what the Android / iOS app does with app.engspace://auth-callback links
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: any[] = [];
const auth = {
  exchangeCodeForSession: vi.fn(async (code: string) => { calls.push(["code", code]); return { data: {}, error: null }; }),
  setSession: vi.fn(async (s: any) => { calls.push(["session", s.access_token]); return { data: {}, error: null }; }),
  verifyOtp: vi.fn(async (o: any) => { calls.push(["otp", o.token_hash, o.type]); return { data: {}, error: null }; }),
};
vi.mock("../src/backend/client", () => ({ supabase: async () => ({ auth }) }));
vi.mock("@capacitor/browser", () => ({ Browser: { close: async () => {} } }));

describe("native auth callback", () => {
  let cloud: any;
  beforeEach(async () => { calls.length = 0; cloud = await import("../src/backend/cloud"); });
  it("Google / Apple (PKCE): exchanges the code once, even if the link arrives twice", async () => {
    expect(await cloud.handleAuthUrl("app.engspace://auth-callback?code=abc123")).toEqual({ reset: false });
    expect(await cloud.handleAuthUrl("app.engspace://auth-callback?code=abc123")).toBeNull();
    expect(calls).toEqual([["code", "abc123"]]);
  });
  it("tokens in the fragment set the session", async () => {
    await cloud.handleAuthUrl("app.engspace://auth-callback#access_token=AT&refresh_token=RT&type=signup"); expect(calls).toEqual([["session", "AT"]]);
  });
  it("e-mail links verify the token hash; a recovery link opens «new password»", async () => {
    expect(await cloud.handleAuthUrl("app.engspace://auth-callback/?token_hash=th1&type=recovery")).toEqual({ reset: true }); expect(calls).toEqual([["otp", "th1", "recovery"]]);
  });
  it("a refused sign-in comes back as a readable error, not silence", async () => {
    const r = await cloud.handleAuthUrl("app.engspace://auth-callback?error=access_denied&error_description=Unable+to+exchange+external+code");
    expect(r.error).toMatch(/تعذّر إكمال تسجيل الدخول/); expect(calls).toEqual([]);
  });
});
