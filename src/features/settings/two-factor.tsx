// =====================================================================
//  التحقق بخطوتين — the platform team's second factor (Phase 3a; logic in backend/mfa.ts, rules in migration 29).
//  · TwoFactorPanel (Settings, staff only, cloud only): set up an authenticator app, or remove it from a confirmed session.
//  · AdminGate (around the console): open / ask for the code / set up first — `gateState` decides; the server enforces.
//  · StaffMfaSwitch (Admin → الإعدادات, administrators): require the second factor for every staff power — only from a
//    confirmed session, with a warning that staff without an authenticator lose their powers until they set one up.
// =====================================================================
import { useEffect, useState } from "react";
import { KeyRound, Lock, ShieldCheck, Smartphone } from "lucide-react";
import * as mfa from "../../backend/mfa";
import { Note } from "../../ui/kit";
import { Panel, Primary, Secondary } from "../../ui/primitives";

function CodeField({ value, onChange, autoFocus = true }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d٠-٩]/g, "").slice(0, 6))}
      inputMode="numeric" autoComplete="one-time-code" dir="ltr" autoFocus={autoFocus} aria-label="رمز التحقق" placeholder="000000" data-mfa-code
      className="w-full h-14 px-4 rounded-xl bg-canvas border border-line-2 font-grotesk text-[24px] tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

// set up an authenticator: QR (and the secret, for typing it in), then the first code verifies it and confirms this session
export function TwoFactorEnroll({ onDone }: { onDone: () => void }) {
  const [e, setE] = useState<mfa.Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    mfa.enroll().then(setE, (x) => setErr(x.message));
  }, []);
  const go = async () => {
    if (!e || busy) return;
    setBusy(true);
    setErr("");
    try {
      await mfa.verify(e.factorId, code);
      onDone();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3" data-mfa-enroll>
      <ol className="text-[12.5px] text-ink-2 space-y-1 list-decimal ps-5">
        <li>افتح تطبيق تحقق على هاتفك (Google Authenticator أو Microsoft Authenticator أو 1Password…).</li>
        <li>امسح الرمز أو اكتب المفتاح يدويًا.</li>
        <li>اكتب الرمز المكوّن من 6 أرقام الظاهر في التطبيق.</li>
      </ol>
      {e ? (
        <>
          {e.qr && <img src={e.qr} alt="رمز QR لتطبيق التحقق" className="mx-auto w-44 h-44 rounded-xl bg-white p-2 border border-line" data-mfa-qr />}
          <p className="text-[11.5px] text-ink-3 text-center">المفتاح: <bdi dir="ltr" className="font-grotesk select-all break-all" data-mfa-secret>{e.secret}</bdi></p>
          <CodeField value={code} onChange={setCode} />
          <Primary onClick={go} disabled={busy || code.length < 6} className="w-full h-12 text-[14px]" data-mfa-verify>{busy ? "جارٍ التحقق…" : "تأكيد وتفعيل"}</Primary>
        </>
      ) : !err ? <div className="skeleton h-44 rounded-xl" /> : null}
      {err && <p role="alert" className="text-[12.5px] text-bad">{err}</p>}
    </div>
  );
}

// the code on a later sign-in (aal1 → aal2)
export function CodePrompt({ onDone, title = "أدخل رمز التحقق" }: { onDone: () => void; title?: string }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await mfa.stepUp(code);
      onDone();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3" data-mfa-prompt>
      <p className="text-[13px] font-medium inline-flex items-center gap-1.5"><KeyRound size={15} className="text-accent" /> {title}</p>
      <p className="text-[12px] text-ink-2">افتح تطبيق التحقق واكتب الرمز الحالي لحساب EngSpace.</p>
      <CodeField value={code} onChange={(v) => { setCode(v); if (err) setErr(""); }} />
      <Primary onClick={go} disabled={busy || code.length < 6} className="w-full h-12 text-[14px]" data-mfa-go>{busy ? "جارٍ التحقق…" : "تأكيد"}</Primary>
      {err && <p role="alert" className="text-[12.5px] text-bad">{err}</p>}
    </div>
  );
}

export function TwoFactorPanel() {
  const [st, setSt] = useState<{ factors: mfa.Factor[]; aal: "aal1" | "aal2"; required: boolean } | null>(null);
  const [mode, setMode] = useState<"view" | "enroll" | "confirm-remove">("view");
  const [err, setErr] = useState("");
  const load = () =>
    Promise.all([mfa.factors(), mfa.staffSecurity()]).then(([factors, s]) => setSt({ factors, aal: s.aal, required: s.required }), (x) => setErr(x.message));
  useEffect(() => {
    void load();
  }, []);
  const remove = async () => {
    try {
      for (const f of st!.factors) await mfa.unenroll(f.id);
      setMode("view");
      await load();
    } catch (x: any) {
      setErr(x.message);
    }
  };
  const on = !!st && st.factors.length > 0;
  return (
    <Panel className="p-4" data-mfa-panel={on ? "on" : "off"}>
      <h2 className="text-[13px] font-medium inline-flex items-center gap-1.5"><Lock size={15} className="text-accent" /> التحقق بخطوتين — فريق الإدارة</h2>
      <p className="mt-1 text-[12px] text-ink-2 leading-relaxed">رمز من تطبيق على هاتفك يُطلب قبل فتح لوحة الإدارة، فلا تكفي كلمة المرور وحدها للوصول إلى البلاغات والأعضاء.</p>
      {!st && !err && <div className="mt-3 skeleton h-12 rounded-xl" />}
      {st && mode === "view" && (
        <div className="mt-3 space-y-2">
          <p className={`text-[13px] font-medium inline-flex items-center gap-1.5 ${on ? "text-good" : "text-warn"}`}>{on ? <ShieldCheck size={16} /> : <Smartphone size={16} />} {on ? "مفعّل" : "غير مفعّل"}</p>
          {st.required && !on && <Note tone="warn">الإدارة جعلت التحقق بخطوتين إلزاميًا: بدونه لا تعمل صلاحيات الإشراف.</Note>}
          {on
            ? <Secondary onClick={() => setMode("confirm-remove")} className="h-11 text-[13px]" data-mfa-remove>إيقاف التحقق بخطوتين</Secondary>
            : <Primary onClick={() => setMode("enroll")} className="h-11 text-[13px]" data-mfa-start>تفعيل التحقق بخطوتين</Primary>}
        </div>
      )}
      {st && mode === "enroll" && <div className="mt-3"><TwoFactorEnroll onDone={() => { setMode("view"); void load(); }} /></div>}
      {st && mode === "confirm-remove" && (
        <div className="mt-3">
          {st.aal === "aal2"
            ? <div className="space-y-2"><Note tone="warn">{st.required ? "التحقق بخطوتين إلزامي: إيقافه يوقف صلاحيات الإشراف على هذا الحساب حتى تفعّله من جديد." : "بعد الإيقاف تكفي كلمة المرور لفتح لوحة الإدارة."}</Note>
                <div className="flex gap-2"><Secondary onClick={() => setMode("view")} className="flex-1 h-11 text-[13px]">رجوع</Secondary><Primary onClick={remove} className="flex-1 h-11 text-[13px]" data-mfa-remove-go>إيقاف</Primary></div></div>
            : <CodePrompt title="أكّد بالرمز قبل الإيقاف" onDone={() => { void load().then(() => setMode("confirm-remove")); }} />}
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-[12.5px] text-bad">{err}</p>}
    </Panel>
  );
}

// before the console: the server enforces; this asks for what it will need
export function AdminGate({ children, openApp }: { children: any; openApp: () => void }) {
  const [state, setState] = useState<mfa.GateState | "loading" | "error">("loading");
  const [hint, setHint] = useState(true);
  const check = async () => {
    try {
      const [s, f] = await Promise.all([mfa.staffSecurity(), mfa.factors()]);
      setState(mfa.gateState({ aal: s.aal, hasFactor: f.length > 0, required: s.required }));
    } catch {
      setState("error");
    }
  };
  useEffect(() => {
    void check();
  }, []);
  if (state === "open") return children;
  if (state === "open-recommend") {
    return (
      <>
        {hint && (
          <div role="status" className="mx-auto max-w-6xl mt-3 px-4" data-mfa-recommend>
            <div className="p-3 rounded-xl border border-warn/30 bg-warn/10 text-[12.5px] flex items-start gap-2">
              <Lock size={15} className="shrink-0 mt-0.5 text-warn" />
              <span className="flex-1">ننصح بتفعيل التحقق بخطوتين لحسابك: من التطبيق ← الإعدادات ← «التحقق بخطوتين — فريق الإدارة».</span>
              <button type="button" onClick={() => setHint(false)} className="shrink-0 text-ink-3">إخفاء</button>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }
  return (
    <div className="min-h-[70dvh] grid place-items-center px-4 py-10" data-admin-gate={state}>
      <Panel className="w-full max-w-sm p-5 space-y-4">
        <h1 className="text-[17px] font-medium inline-flex items-center gap-2"><ShieldCheck size={20} className="text-accent" /> لوحة الإدارة</h1>
        {state === "loading" && <div className="skeleton h-32 rounded-xl" />}
        {state === "code" && <CodePrompt onDone={() => setState("open")} />}
        {state === "enroll" && (
          <>
            <Note tone="warn">التحقق بخطوتين إلزامي لفريق الإدارة. فعّله الآن لتفتح اللوحة.</Note>
            <TwoFactorEnroll onDone={() => setState("open")} />
          </>
        )}
        {state === "error" && <p role="alert" className="text-[12.5px] text-bad">تعذّر التحقق من حالة الحساب — تحقق من الاتصال ثم حاول مرة أخرى.</p>}
        <Secondary onClick={openApp} className="w-full h-11 text-[13px]">العودة للتطبيق</Secondary>
      </Panel>
    </div>
  );
}

export function StaffMfaSwitch() {
  const [s, setS] = useState<mfa.StaffSecurity | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    mfa.staffSecurity().then(setS, (x) => setErr(x.message));
  }, []);
  const flip = async (on: boolean) => {
    setBusy(true);
    setErr("");
    try {
      const v = await mfa.setStaffMfa(on);
      setS((x) => (x ? { ...x, required: v } : x));
      setConfirm(false);
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  if (!s) return err ? <p className="text-[12px] text-bad">{err}</p> : <div className="skeleton h-16 rounded-xl" />;
  const confirmed = s.aal === "aal2";
  return (
    <div className="space-y-2" data-staff-mfa={s.required ? "on" : "off"}>
      <p className="text-[13px]">التحقق بخطوتين لفريق الإدارة: <b className={s.required ? "text-good" : "text-ink-2"}>{s.required ? "إلزامي" : "اختياري"}</b></p>
      <p className="text-[11.5px] text-ink-3 leading-relaxed">عند جعله إلزاميًا يرفض الخادم كل صلاحيات الإشراف والإدارة من جلسة لم تؤكَّد بالرمز — حتى لو سُرقت كلمة المرور.</p>
      {!confirmed && <Note tone="warn">التغيير متاح من جلسة مؤكدة بالرمز فقط: فعّل التحقق بخطوتين لحسابك ثم افتح اللوحة من جديد.</Note>}
      {confirmed && !confirm && (
        <Secondary onClick={() => (s.required ? void flip(false) : setConfirm(true))} disabled={busy} className="h-10 text-[13px]" data-staff-mfa-toggle>
          {s.required ? "اجعله اختياريًا" : "اجعله إلزاميًا"}
        </Secondary>
      )}
      {confirm && (
        <div className="p-3 rounded-xl bg-warn/10 border border-warn/25 space-y-2">
          <p className="text-[12px] leading-relaxed">كل مشرف ومسؤول لم يفعّل التحقق بخطوتين يفقد صلاحياته فورًا حتى يفعّله من الإعدادات. متابعة؟</p>
          <div className="flex gap-2"><Secondary onClick={() => setConfirm(false)} className="flex-1 h-10 text-[13px]">إلغاء</Secondary><Primary onClick={() => void flip(true)} disabled={busy} className="flex-1 h-10 text-[13px]" data-staff-mfa-on>اجعله إلزاميًا</Primary></div>
        </div>
      )}
      {err && <p role="alert" className="text-[12px] text-bad">{err}</p>}
    </div>
  );
}
