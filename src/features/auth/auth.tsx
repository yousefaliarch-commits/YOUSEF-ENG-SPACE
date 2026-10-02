import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck, Camera, Check, CircleAlert, CircleCheck, Clock, Eye, EyeOff, HardHat, Languages, LoaderCircle, 
  Lock, LogIn, MapPin, ShieldCheck, Smartphone, Trash2, UserPlus
} from "lucide-react";
import { COMPANIES } from "../../data/companies";
import { placeName } from "../../data/geo";
import { divOf } from "../../domain/division";
import { IDENTITY, PASSWORD_LEVELS, THIS_YEAR, ageError, checkPassword, cleanName, confirmError, createAccountRecord, credentialOf, emailError, gradError, gx, loadAccount, nameError, passwordChecks, passwordError, passwordScore, randHex, yearsText } from "../../domain/identity";
import { DISC, POSITIONS, ROLES, can, canVerifyRole, genderOf, isCompanyRole, posForYears, posLabelG, roleOf, roleTitle, trackLabel, tracksFor } from "../../domain/taxonomy";
import { LANGS } from "../../i18n/i18n";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { DEFAULT_PERSONA, loadPersona, storedRetiredRole } from "../../lib/helpers";
import { imageError, processImage, useImagePicker } from "../../lib/media";
import { reduced } from "../../lib/runtime";
import { Avatar, specOfPersona } from "../../ui/characters";
import { GovPicker, RoleBadge, TextInput } from "../../ui/chrome";
import { IdentityCard, Monogram, TrustPolicy } from "../../ui/identity";
import { ArchMark, BTN, Back, Chip, FilterChip, Forward, Num, Primary, Quiet, Secondary, Wordmark } from "../../ui/primitives";

// =====================================================================
//  Registration & sign-in — a standard account form:
//  الحساب (e-mail + password) → بياناتك (name, gender, age, graduation year) → التخصص (account type, specialty, sub-track, level)
//  → الموقع (governorate + city) → الهوية والخصوصية (default identity, optional verification, the written policy, consent).
//  The same step components edit the profile later (no account step, no consent box).
// =====================================================================
export const FieldError = ({ children }: any) => (children ? <p role="alert" className="mt-1 text-[11.5px] leading-snug text-bad flex items-start gap-1"><CircleAlert size={12} className="shrink-0 mt-0.5" /><span>{children}</span></p> : null);

export function FormField({ label, htmlFor, error, hint, children }: any) {
  return <div><label htmlFor={htmlFor} className="block text-[12.5px] text-ink mb-1.5">{label}</label>{children}{error ? <FieldError>{error}</FieldError> : hint ? <p className="mt-1 text-[11px] leading-snug text-ink-3">{hint}</p> : null}</div>;
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete, invalid }: any) {
  const [show, setShow] = useState(false);
  return (
    <div dir="ltr" className="relative">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={invalid || undefined} spellCheck={false} className={`w-full h-12 ps-4 pe-12 rounded-xl bg-canvas border ${invalid ? "border-bad/60" : "border-line-2"} font-grotesk text-[14px] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={show} className="absolute top-1/2 -translate-y-1/2 end-1 grid place-items-center w-10 h-10 rounded-lg text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
  );
}

export const StrengthMeter = ({ pw }: any) => { const s = passwordScore(pw); const [l, bar] = PASSWORD_LEVELS[s]; return (
  <div className="mt-2" aria-live="polite"><div className="flex gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= s ? bar : "bg-track"}`} />)}</div>
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">{passwordChecks(pw).map(([k, t, ok]: any) => <span key={k} className={`inline-flex items-center gap-1 ${ok ? "text-good" : "text-ink-3"}`}>{ok ? <Check size={11} /> : <span className="w-2.5 h-2.5 rounded-full border border-ink-4" />}{t}</span>)}{l && <span className="ms-auto text-ink-2">القوة: {l}</span>}</div></div>); };

export const AuthHeader = ({ children }: any) => <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 min-w-0"><ArchMark size={22} /><Wordmark size="text-[17px]" /></span><span className="shrink-0">{children}</span></div>;

export const REG_STEPS = { account: ["إنشاء حساب", "بريدك وكلمة المرور للدخول فقط — لا يظهران لأي عضو أو شركة"], personal: ["بياناتك", "الاسم والنوع والعمر وسنة التخرج"], career: ["التخصص والمسار", "نوع الحساب، تخصصك الهندسي، ومسارك الحالي"], place: ["الموقع", "المحافظة ثم المدينة أو المركز"], identity: ["الهوية والخصوصية", "كيف تظهر افتراضيًا — والتوثيق اختياري", "كيف تظهرين افتراضيًا — والتوثيق اختياري"] };


export function Registration({ app, mode = "signup", initial = null }: any) {
  // complete: an account made with Google, Apple or a phone number fills the same steps once (with the policy consent)
  const complete = mode === "complete"; const edit = mode === "edit" || complete; const keys = edit ? ["personal", "career", "place", "identity"] : ["account", "personal", "career", "place", "identity"];
  const [step, setStep] = useState(0); const [tried, setTried] = useState<any>({}); const [attempt, setAttempt] = useState(0); const [busy, setBusy] = useState(false); const [submitErr, setSubmitErr] = useState<any>("");
  const [f, setF] = useState<any>(() => initial
    ? { ...DEFAULT_PERSONA, ...initial, age: initial.age != null ? String(initial.age) : "", gradYear: initial.gradYear != null ? String(initial.gradYear) : "", companyName: initial.companyName || "", password: "", confirm: "", accept: !complete }
    : { ...DEFAULT_PERSONA, gender: null, age: "", gradYear: "", pos: null, city: null, companyName: "", email: "", password: "", confirm: "", accept: false, identity: "anon", anon: randHex(4), pid: "u-" + randHex(10) });
  const set = (k?: any, v?: any) => setF((s) => ({ ...s, [k]: v })); const body = useRef<any>(null);
  const [photoErr, setPhotoErr] = useState<any>(""); const [photoInput, pickPhoto] = useImagePicker(async (file) => { try { const im = await processImage(file, { square: true, size: 256 }); set("photo", im.src); setPhotoErr(""); } catch (e) { setPhotoErr(imageError(e)); } });
  const key = keys[step]; const isCo = isCompanyRole(f.role); const disc = f.disc; const existing = edit || isCloud() ? null : loadAccount();
  const nameChanged = edit && !!initial && cleanName(f.name) !== cleanName(initial.name); const hadBadge = edit && !!initial && canVerifyRole(initial.role) && (initial.verified || initial.pending);
  const yrs = !ageError(f.age) && !gradError(f.gradYear, f.age) ? Math.max(0, THIS_YEAR - Number(f.gradYear)) : null; const suggested = yrs != null ? posForYears(yrs) : "mid"; const pos = f.pos || suggested;
  const errs: any = {
    account: { email: emailError(f.email) || (existing && existing.email === f.email.trim().toLowerCase() ? "هذا البريد مسجّل بالفعل على هذا الجهاز — سجّل الدخول بدلًا من ذلك" : ""), password: passwordError(f.password), confirm: confirmError(f.password, f.confirm) },
    personal: { name: nameError(f.name), gender: f.gender ? "" : "اختر النوع", age: ageError(f.age), gradYear: gradError(f.gradYear, f.age) },
    career: f.role === "supervisor" ? {} : isCo ? { companyName: cleanName(f.companyName).length >= 2 ? "" : gx(f.gender, "اكتب اسم الشركة التي تمثّلها", "اكتبي اسم الشركة التي تمثّلينها") } : { track: tracksFor(disc).some((t) => t[0] === f.track) ? "" : gx(f.gender, "اختر المسار", "اختاري المسار") },
    place: { gov: f.gov ? "" : gx(f.gender, "اختر المحافظة", "اختاري المحافظة"), city: f.city ? "" : gx(f.gender, "اختر المدينة أو المركز داخل المحافظة", "اختاري المدينة أو المركز داخل المحافظة") },
    identity: { accept: (edit && !complete) || f.accept ? "" : gx(f.gender, "للمتابعة وافق على سياسة الخصوصية وشروط الاستخدام", "للمتابعة وافقي على سياسة الخصوصية وشروط الاستخدام") },
  };
  const stepErrs = errs[key]; const valid = Object.values(stepErrs).every((x) => !x); const show = (k?: any) => (tried[key] ? stepErrs[k] : "");
  useEffect(() => { if (!attempt || !body.current) return; const el = body.current.querySelector('[aria-invalid="true"], [role="alert"]'); if (el) { try { el.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }); if (el.focus && el.matches("input,button,textarea,select")) el.focus({ preventScroll: true }); } catch (e) {} } }, [attempt]);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [step]);
  const setRole = (id?: any) => setF((s) => ({ ...s, role: id, disc: s.disc, track: s.track, verified: id === s.role ? s.verified : false, pending: id === s.role ? s.pending : false, verifyKind: id === s.role ? s.verifyKind : null, goal: isCompanyRole(id) ? "hire" : s.goal === "hire" || s.goal === "benchmark" ? "learn" : s.goal }));
  const persona = () => {
    // employer accounts are never verified; renaming a verified (or pending) account drops the badge — the documents carried the old name
    const coName = cleanName(f.companyName); const co = isCo ? COMPANIES.find((c) => c.name === coName) : null; const keepV = !isCo && !nameChanged;
    return { ...DEFAULT_PERSONA, ...(initial || {}), name: cleanName(f.name), email: edit ? initial.email : f.email.trim().toLowerCase(), gender: f.gender, age: Number(f.age), gradYear: Number(f.gradYear), role: f.role, ...(f.role === "supervisor" ? { disc: "civil", track: "site", pos: "mid" } : { disc, track: f.track, pos }),
      gov: f.gov, city: f.city, companyName: isCo ? coName : null, companyId: co ? co.id : null, identity: f.identity === "public" ? "public" : "anon",
      verified: keepV && !!f.verified, verifyKind: keepV && (f.verified || f.pending) ? f.verifyKind || null : null, pending: keepV && !!f.pending && !f.verified, verifyRef: keepV ? f.verifyRef || null : null, division: keepV && f.verified ? f.division || null : null, verifyReq: f.verifyReq || null, anon: f.anon, pid: f.pid,
      avatar: null, look: f.gender === "female" ? (f.look === "hair" ? "hair" : "hood") : null, photo: f.photo || null, showPhoto: f.showPhoto !== false, goal: f.goal || (isCo ? "hire" : "learn"), openToRecruiters: f.openToRecruiters !== false };
  };
  const next = async () => {
    setTried((t) => ({ ...t, [key]: true })); setSubmitErr("");
    if (!valid) { setAttempt((n) => n + 1); return; }
    if (step < keys.length - 1) { setStep(step + 1); return; }
    const p = persona(); if (edit) { app.saveProfile(complete ? { ...p, onboarded: true } : p); return; }
    setBusy(true);
    // cloud: the account lives on the server (Supabase Auth); the profile is created from this form by the database
    if (isCloud()) {
      try { const r = await cloud.signUp(f.email, f.password, p); if (r.confirm) { setBusy(false); pendingSignup = { email: f.email, password: f.password }; app.setAuthView("confirm"); return; } app.register({ ...p, ...r.persona }, null); }
      catch (e) { setSubmitErr(e.message); setBusy(false); }
      return;
    }
    try { const acc = await createAccountRecord(f.email, f.password); app.register(p, acc); } catch (e) { setSubmitErr("تعذّر إنشاء الحساب على هذا الجهاز — أعد المحاولة"); setBusy(false); }
  };
  const preview = persona();
  const chipRow = "flex flex-wrap gap-1.5";
  const views: any = {
    account: <div className="space-y-4">
      <TrustPolicy variant="compact" />
      <FormField label="البريد الإلكتروني" htmlFor="reg-email" error={show("email")} hint="للدخول واسترجاع الحساب فقط — لا يظهر لأي عضو أو صاحب عمل"><TextInput id="reg-email" dir="ltr" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(v) => set("email", v)} placeholder="name@example.com" aria-invalid={!!show("email") || undefined} /></FormField>
      {existing && !edit && <p className="text-[11.5px] text-ink-2 leading-snug">يوجد حساب محفوظ على هذا الجهاز ({<Num>{existing.email}</Num>}). <button type="button" onClick={() => app.setAuthView("signin")} className="text-accent hover:underline underline-offset-4">سجّل الدخول به</button></p>}
      <FormField label="كلمة المرور" htmlFor="reg-pw" error={show("password")}><PasswordInput id="reg-pw" value={f.password} onChange={(v) => set("password", v)} autoComplete="new-password" placeholder="8 أحرف على الأقل" invalid={!!show("password")} /><StrengthMeter pw={f.password} /></FormField>
      <FormField label="تأكيد كلمة المرور" htmlFor="reg-pw2" error={show("confirm")}><PasswordInput id="reg-pw2" value={f.confirm} onChange={(v) => set("confirm", v)} autoComplete="new-password" placeholder="أعد كتابتها" invalid={!!show("confirm")} /></FormField>
      <p className="text-[11px] leading-snug text-ink-3 flex items-center gap-1.5"><Lock size={12} className="shrink-0" /> تُحفظ كلمة المرور مشفّرة على جهازك</p>
    </div>,
    personal: <div className="space-y-4">
      <FormField label="الاسم الكامل" htmlFor="reg-name" error={show("name")} hint={nameChanged && hadBadge ? "تغيير الاسم يلغي شارة «موثّق» أو طلب التوثيق القائم — المستندات كانت باسمك السابق، فتحتاج توثيقًا جديدًا." : "يظهر فقط فيما تختار نشره علنًا — ولا يظهر أبدًا في الوضع المجهول"}><TextInput id="reg-name" autoComplete="name" value={f.name} onChange={(v) => set("name", v)} placeholder="مثال: منى أحمد الشريف" aria-invalid={!!show("name") || undefined} /></FormField>
      <div><p className="text-[12.5px] text-ink mb-1.5">صورتك — اختياري</p>{photoInput}
        <div className="flex items-center gap-3"><Monogram name={f.name || "؟"} role={f.role} photo={f.photo} size={48} /><Secondary onClick={pickPhoto} className="h-10 px-3 text-[12.5px]"><Camera size={15} /> {f.photo ? "تغيير الصورة" : "إضافة صورة"}</Secondary>{f.photo && <Quiet onClick={() => set("photo", null)} className="h-10 px-2 text-[12.5px]">إزالة</Quiet>}</div>
        {photoErr && <p role="alert" className="mt-1 text-[11.5px] text-bad">{photoErr}</p>}
        <p className="mt-1 text-[11px] text-ink-3 leading-snug">تظهر صغيرة بجانب اسمك في مشاركاتك العلنية فقط — لا تظهر أبدًا في الوضع المجهول، ولا تُكبَّر عند الضغط. تُقص مربعة وتُحذف منها بيانات الموقع على جهازك.</p></div>
      <div><p className="text-[12.5px] text-ink mb-1.5">النوع</p>
        <div role="radiogroup" aria-label="النوع" className="grid grid-cols-2 gap-2">{[["male", "ذكر", "مهندس"], ["female", "أنثى", "مهندسة"]].map(([id, l, t]: any) => <button key={id} type="button" role="radio" aria-checked={f.gender === id} aria-invalid={(!!show("gender") && !f.gender) || undefined} onClick={() => setF((s) => ({ ...s, gender: id }))} className={`press flex items-center gap-2.5 p-3 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${f.gender === id ? "bg-wash border-accent/40" : show("gender") ? "bg-surface border-bad/50" : "bg-surface border-line-2 hover:border-line-3"}`}>
          <span className="flex -space-x-2 rtl:space-x-reverse shrink-0"><Avatar spec={specOfPersona({ ...f, verified: false })} gender={id} look={f.look} size={32} animate={false} className="ring-2 ring-surface" /></span>
          <span className="min-w-0"><span className="block text-[15px] font-medium leading-tight">{l}</span><span className="block text-[11px] text-ink-2 leading-snug">اللقب: {t}</span></span>{f.gender === id && <Check size={15} className="ms-auto shrink-0 text-accent" />}</button>)}</div>
        <FieldError>{show("gender")}</FieldError>
        {f.gender === "female" && <div className="mt-3 pop-in"><p className="text-[12px] text-ink-2 mb-1.5">مظهر شخصيتك</p><div role="radiogroup" aria-label="مظهر الشخصية" className="grid grid-cols-2 gap-2">{[["hood", "غطاء رأس تقني"], ["hair", "شعر"]].map(([id, l]: any) => <button key={id} type="button" role="radio" aria-checked={(f.look === "hair" ? "hair" : "hood") === id} onClick={() => set("look", id)} className={`press flex items-center gap-2.5 p-2.5 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${(f.look === "hair" ? "hair" : "hood") === id ? "bg-wash border-accent/40" : "bg-surface border-line-2 hover:border-line-3"}`}><Avatar spec={specOfPersona({ ...f, verified: false })} gender="female" look={id} size={36} animate={false} /><span className="text-[13px]">{l}</span></button>)}</div></div>}
        <p className="mt-1 text-[11px] text-ink-3">يضبط الألقاب (مهندس / مهندسة) وصيغ المخاطبة. أما شخصيتك فيحددها تخصصك — لا تُختار عشوائيًا ولا تتبدّل.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="العمر" htmlFor="reg-age" error={show("age")}><TextInput id="reg-age" dir="ltr" inputMode="numeric" autoComplete="off" value={f.age} onChange={(v) => set("age", v.replace(/\D/g, "").slice(0, 2))} placeholder="29" aria-invalid={!!show("age") || undefined} /></FormField>
        <FormField label="سنة التخرج" htmlFor="reg-grad" error={show("gradYear")}><TextInput id="reg-grad" dir="ltr" inputMode="numeric" autoComplete="off" value={f.gradYear} onChange={(v) => set("gradYear", v.replace(/\D/g, "").slice(0, 4))} placeholder="2020" aria-invalid={!!show("gradYear") || undefined} /></FormField>
      </div>
      {yrs != null && <p className="text-[11.5px] text-ink-2 leading-snug">خبرتك منذ التخرج: <span className="text-ink font-medium">{yearsText(yrs, f.gender)}</span> — هذا ما يظهر في هويتك المجهولة بدل العمر.</p>}
    </div>,
    career: <div className="space-y-4">
      <div><p className="text-[12.5px] text-ink mb-1.5">نوع الحساب</p><div className={chipRow}>{ROLES.map((r) => <FilterChip key={r.id} on={f.role === r.id} onClick={() => setRole(r.id)}><r.icon size={12} />{roleTitle(r.id, f.gender)}</FilterChip>)}</div><p className="mt-1 text-[11px] text-ink-3 leading-snug">{roleOf(f.role).desc}</p></div>
      {isCo ? <>
        <FormField label="الشركة التي تمثّلها" htmlFor="reg-co" error={show("companyName")} hint={COMPANIES.some((c) => c.name === cleanName(f.companyName)) ? "شركة مسجّلة — ستُربط بصفحتها وشعارها" : "اكتب الاسم أو اختر من القائمة"}><TextInput id="reg-co" value={f.companyName} onChange={(v) => set("companyName", v)} list="reg-co-list" placeholder="اسم الشركة" aria-invalid={!!show("companyName") || undefined} /><datalist id="reg-co-list">{COMPANIES.map((c) => <option key={c.id} value={c.name} />)}</datalist></FormField>
        <p className="p-3 rounded-xl bg-canvas/60 border border-line text-[11.5px] leading-relaxed text-ink-2 flex items-start gap-2"><RoleBadge role={f.role} gender={f.gender} className="shrink-0" /><span>{gx(f.gender, "حسابات جهات العمل لا تحتاج توثيقًا ولا أي مستند — تظهر في كل مكان بشارة دورك.", "حسابات جهات العمل لا تحتاج توثيقًا ولا أي مستند — تظهرين في كل مكان بشارة دورك.")}</span></p>
      </> : f.role === "supervisor" ? <div className="p-3.5 rounded-xl bg-canvas/60 border border-line text-[12.5px] leading-relaxed"><p className="text-ink font-medium inline-flex items-center gap-1.5"><HardHat size={14} className="text-accent" /> المسمّى ثابت: {roleTitle("supervisor", f.gender)}</p><p className="mt-1 text-ink-2">مسمّى واحد لكل مشرفي المواقع — بلا تخصص أو مسار أو مستوى. حسابك للمشاركة في المجتمع: الغرف والمنشورات والردود والرسائل مع الزملاء، ومعه أدوات الموقع (حصر الخرسانة والحديد والمباني وتحويل الوحدات) وقوائم الفحص والاستلام. الرواتب والوظائف والشركات غير متاحة لهذا النوع من الحسابات.</p></div> : <>
        {<div><p className="text-[12.5px] text-ink mb-1.5">التخصص الهندسي</p><div className={chipRow}>{DISC.map(([id, l]: any) => <FilterChip key={id} on={f.disc === id} onClick={() => setF((s) => ({ ...s, disc: id, track: tracksFor(id).some((t) => t[0] === s.track) ? s.track : "site" }))}>{l}</FilterChip>)}</div><p className="mt-1 text-[11px] text-ink-3">{(DISC.find((d) => d[0] === f.disc) || DISC[0])[2]}</p></div>}
        <div><p className="text-[12.5px] text-ink mb-1.5">المسار (التخصص الفرعي)</p><div className={chipRow}>{tracksFor(disc).map(([id]: any) => <FilterChip key={id} on={f.track === id} onClick={() => set("track", id)}>{trackLabel(id, disc)}</FilterChip>)}</div><FieldError>{show("track")}</FieldError></div>
        <div><p className="text-[12.5px] text-ink mb-1.5">المستوى الوظيفي</p><div className={chipRow}>{POSITIONS.map(([id]: any) => <FilterChip key={id} on={pos === id} onClick={() => set("pos", id)}>{posLabelG(id, f.gender)}{id === suggested && yrs != null && <span className="text-[10px] text-accent">· مقترح</span>}</FilterChip>)}</div><p className="mt-1 text-[11px] text-ink-3">{yrs != null ? "اقترحناه من سنة تخرجك — غيّره إن لزم." : "يدخل في مطابقة الوظائف وتقدير السوق."}</p></div>
      </>}
    </div>,
    place: <div className="space-y-2"><GovPicker gov={f.gov} city={f.city} onChange={(g, c) => setF((s) => ({ ...s, gov: g, city: c }))} /><FieldError>{show("gov") || show("city")}</FieldError>{f.city && <p className="text-[11.5px] text-good inline-flex items-center gap-1.5"><MapPin size={12} /> {placeName(f.gov, f.city)}</p>}<p className="text-[11px] text-ink-3 leading-snug">المدينة تظهر في ملفك العلني فقط، وتدخل في تقدير السوق ومطابقة الوظائف — ولا تظهر أبدًا في الوضع المجهول.</p></div>,
    identity: <div className="space-y-4">
      <div><p className="text-[12.5px] text-ink mb-1.5">هويتك الافتراضية عند المشاركة</p>
        <div role="radiogroup" aria-label="الهوية الافتراضية" className="space-y-2">{["anon", "public"].map((id) => <IdentityCard key={id} p={preview} as={id} on={f.identity === id} onClick={() => set("identity", id)} />)}</div>
        <p className="mt-1.5 text-[11px] text-ink-3 leading-snug">مجرد افتراض — في كل منشور ورد وتقييم وتصويت ومشاركة راتب {gx(f.gender, "تختار", "تختارين")} من جديد: علني أو مجهول.</p></div>
      {!isCo && <section className="rounded-2xl border border-line bg-surface p-3.5">
        <div className="flex items-start gap-3"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><ShieldCheck size={18} /></span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium">شارة «موثّق» <span className="text-[11px] text-ink-3 font-normal">— اختيارية</span></p><p className="text-[11.5px] text-ink-2 leading-snug">{f.role === "engineer" ? "كارنيه نقابة المهندسين وشهادة التخرج، يراجعهما فريق الإدارة يدويًا." : "شهادتك أو إفادة الخبرة، يراجعها فريق الإدارة يدويًا."}</p><p className="mt-1 text-[11.5px] text-ink-2 leading-snug">{edit ? gx(f.gender, "تدير التوثيق من «حسابك».", "تديرين التوثيق من «حسابك».") : gx(f.gender, "ترفع المستندات بعد إنشاء الحساب.", "ترفعين المستندات بعد إنشاء الحساب.")}</p><p className="mt-1 text-[11.5px] text-good leading-snug">المستندات تُحذف نهائيًا فور المراجعة ولا تُشارك مع أي أحد.</p></div></div>
        {edit && (f.verified || f.pending) && !nameChanged && <div className="mt-3"><Chip tone={f.verified ? "verified" : "warn"}>{f.verified ? <><BadgeCheck size={12} /> {credentialOf(f) || "موثّق"}{f.division && divOf(f.division) ? ` · ${divOf(f.division).label}` : ""}</> : <><Clock size={12} /> قيد المراجعة</>}</Chip></div>}
      </section>}
      <TrustPolicy />
      {(!edit || complete) && <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${show("accept") ? "border-bad/50 bg-bad/5" : "border-line-2 bg-surface"}`}><input type="checkbox" checked={f.accept} onChange={(e) => set("accept", e.target.checked)} aria-invalid={!!show("accept") || undefined} className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" /><span className="text-[12.5px] leading-relaxed">قرأت سياسة الخصوصية والأمان أعلاه وأوافق على شروط الاستخدام.</span></label>}
      <FieldError>{show("accept")}</FieldError>
    </div>,
  };
  const [title, hintM, hintF] = REG_STEPS[key]; const hint = genderOf(f.gender) === "female" && hintF ? hintF : hintM; const last = step === keys.length - 1;
  return (
    <div className="h-full flex flex-col px-5 pt-[calc(var(--sat)+1rem)] pb-[max(1.25rem,var(--sab))]">
      <AuthHeader>{complete ? <Quiet onClick={() => app.signOut()} className="h-9 text-[12px]">خروج</Quiet> : edit ? <Quiet onClick={app.cancelEdit} className="h-9 text-[12px]">إلغاء</Quiet> : <Quiet onClick={() => app.setAuthView("signin")} className="h-9 text-[12px] whitespace-nowrap"><LogIn size={14} /> لديك حساب؟ دخول</Quiet>}</AuthHeader>
      <div className="mt-5 flex gap-1.5" aria-hidden="true">{keys.map((k, i) => <span key={k} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-elevated"}`} />)}</div>
      <div ref={body} key={key} className="screen-push flex-1 mt-5 min-h-0 overflow-y-auto scroll-area -mx-5 px-5 pb-2">
        <p className="text-[12px] text-accent">{complete ? "أكمل ملفك" : edit ? "تعديل البيانات" : "التسجيل"} · <Num>{step + 1}</Num> من <Num>{keys.length}</Num></p>
        <h1 className="mt-1 text-[24px] font-medium leading-tight">{title}</h1><p className="mt-1 mb-5 text-[13px] text-ink-2 leading-snug">{hint}</p>
        {!edit && key === "account" && <OtherMethods app={app} />}
        {views[key]}
        {submitErr && <FieldError>{submitErr}</FieldError>}
      </div>
      <div className="flex items-center gap-3 pt-3">
        {step > 0 ? <Secondary onClick={() => setStep(step - 1)} aria-label="الخطوة السابقة" className="h-12 px-4 shrink-0"><Back size={16} /></Secondary>
          : !edit && <Secondary onClick={() => app.setAuthView("lang")} aria-label="رجوع إلى اختيار اللغة" title="اللغة" className="h-12 px-4 shrink-0"><Back size={16} /></Secondary>}
        <Primary onClick={next} disabled={busy} aria-busy={busy} className="h-12 px-6 flex-1">{busy ? <><LoaderCircle size={16} className="spin" /> جارٍ الإنشاء…</> : last ? (complete ? <>ابدأ <Check size={16} /></> : edit ? <>حفظ التعديلات <Check size={16} /></> : <>إنشاء الحساب <UserPlus size={16} /></>) : <>التالي <Forward /></>}</Primary>
      </div>
    </div>
  );
}


export function SignIn({ app }: any) {
  const CLOUD = isCloud(); const acc = CLOUD ? null : loadAccount(); const [email, setEmail] = useState<any>(acc ? acc.email : ""); const [resetSent, setResetSent] = useState(false); const [pw, setPw] = useState<any>(""); const [err, setErr] = useState<any>(""); const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0); const [lockUntil, setLockUntil] = useState(0); const [forgot, setForgot] = useState(false); const [confirmWipe, setConfirmWipe] = useState(false); const [, tick] = useState(0);
  useEffect(() => { if (!lockUntil) return; const i = setInterval(() => { tick((t) => t + 1); if (Date.now() >= lockUntil) { setLockUntil(0); setFails(0); setErr(""); } }, 1000); return () => clearInterval(i); }, [lockUntil]);
  const locked = lockUntil > Date.now(); const secs = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
  const submit = async (e?: any) => {
    if (e) e.preventDefault(); if (locked) return; const ee = emailError(email); if (ee) { setErr(ee); return; } if (!pw) { setErr("اكتب كلمة المرور"); return; }
    if (CLOUD) {
      setBusy(true); setErr("");
      try { const p = await cloud.signIn(email, pw); setBusy(false); app.signIn(p); }
      catch (x) { setBusy(false); setPw(""); const n = fails + 1; setFails(n); if (n >= 5) { setLockUntil(Date.now() + 30000); setErr("5 محاولات خاطئة — انتظر 30 ثانية ثم أعد المحاولة"); } else setErr(x.message); }
      return;
    }
    const a = loadAccount(); if (!a || a.email !== email.trim().toLowerCase()) { setErr("لا يوجد حساب بهذا البريد على هذا الجهاز — أنشئ حسابًا جديدًا"); return; }
    setBusy(true); setErr(""); let ok = false; try { ok = await checkPassword(a, pw); } catch (x) { ok = false; } setBusy(false);
    if (!ok) { const n = fails + 1; setFails(n); setPw(""); if (n >= 5) { setLockUntil(Date.now() + 30000); setErr("5 محاولات خاطئة — انتظر 30 ثانية ثم أعد المحاولة"); } else setErr(`كلمة المرور غير صحيحة — تبقّت ${5 - n} ${5 - n === 1 ? "محاولة" : "محاولات"}`); return; }
    const p = loadPersona(); if (!p) { setErr(storedRetiredRole() ? "هذا الحساب مسجّل كمسّاح — وEngSpace لم يعد يضم فئة المسّاحين (خريجي معاهد المساحة). المنصة للمهندسين ومشرفي المواقع وجهات العمل." : "بيانات الملف غير موجودة على هذا الجهاز — أنشئ حسابًا جديدًا"); return; }
    app.signIn(p);
  };
  return (
    <div className="h-full flex flex-col px-5 pt-[calc(var(--sat)+1rem)] pb-[max(1.25rem,var(--sab))] overflow-y-auto scroll-area">
      <AuthHeader><span className="flex items-center gap-1"><Quiet onClick={() => app.setAuthView("lang")} aria-label="تغيير اللغة" className="h-9 text-[12px] whitespace-nowrap"><Languages size={14} /> <span translate="no" lang={app.lang}>{LANGS[app.lang].name}</span></Quiet><Quiet onClick={() => app.setAuthView("signup")} className="h-9 text-[12px] whitespace-nowrap"><UserPlus size={14} /> حساب جديد</Quiet></span></AuthHeader>
      <div className="mt-8"><h1 className="text-[26px] font-medium leading-tight">تسجيل الدخول</h1><p className="mt-1 text-[13px] text-ink-2">أهلًا بعودتك. هويتك المجهولة وملفك العلني في انتظارك — كلٌّ في مساحته.</p></div>
      {CLOUD && <div className="mt-6"><OtherMethods app={app} /></div>}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <FormField label="البريد الإلكتروني" htmlFor="si-email"><TextInput id="si-email" dir="ltr" type="email" inputMode="email" autoComplete="username" value={email} onChange={(v) => { setEmail(v); setErr(""); }} placeholder="name@example.com" /></FormField>
        <FormField label="كلمة المرور" htmlFor="si-pw"><PasswordInput id="si-pw" value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoComplete="current-password" placeholder="••••••••" invalid={!!err && !!pw} /></FormField>
        <FieldError>{locked ? `حاول بعد ${secs} ثانية` : err}</FieldError>
        <button type="submit" disabled={busy || locked} aria-busy={busy} className={`${BTN} btn-primary w-full h-12`}>{busy ? <><LoaderCircle size={16} className="spin" /> جارٍ التحقق…</> : <><LogIn size={16} /> دخول</>}</button>
        <button type="button" onClick={() => { setForgot((v) => !v); setConfirmWipe(false); }} aria-expanded={forgot} className="w-full h-10 text-[12.5px] text-accent hover:underline underline-offset-4">نسيت كلمة المرور؟</button>
      </form>
      {forgot && CLOUD && <div className="mt-2 p-4 rounded-2xl bg-surface border border-line space-y-3 pop-in">
        {resetSent ? <p className="text-[12.5px] leading-relaxed text-ink-2">أرسلنا رابط إعادة تعيين كلمة المرور إلى <Num>{email.trim()}</Num> إن كان مسجّلًا. افتحه من هذا الجهاز.</p>
          : <><p className="text-[12.5px] leading-relaxed text-ink-2">اكتب بريدك في الأعلى، وسنرسل لك رابطًا لاختيار كلمة مرور جديدة.</p>
            <Secondary disabled={busy} onClick={async () => { const ee = emailError(email); if (ee) { setErr(ee); return; } setBusy(true); try { await cloud.resetPassword(email); setResetSent(true); } catch (x) { setErr(x.message); } setBusy(false); }} className="w-full h-11">إرسال رابط إعادة التعيين</Secondary></>}
      </div>}
      {forgot && !CLOUD && <div className="mt-2 p-4 rounded-2xl bg-surface border border-line space-y-3 pop-in">
        <p className="text-[12.5px] leading-relaxed text-ink-2">لا نرسل رسائل استرجاع في هذه المعاينة، لأن الحساب محفوظ على جهازك فقط وكلمة المرور مشفّرة بحيث لا يمكن لأحد قراءتها. لإعادة البدء احذف الحساب المحلي وأنشئ حسابًا جديدًا.</p>
        {!confirmWipe ? <Secondary onClick={() => setConfirmWipe(true)} className="w-full h-11 text-bad"><Trash2 size={15} /> حذف الحساب المحلي</Secondary>
          : <div className="flex gap-2"><Primary onClick={app.deleteAccount} className="flex-1 h-11 !bg-bad !text-white"><Trash2 size={15} /> تأكيد الحذف النهائي</Primary><Secondary onClick={() => setConfirmWipe(false)} className="h-11 px-4">تراجع</Secondary></div>}
      </div>}
      {!acc && !CLOUD && <p className="mt-4 p-3 rounded-xl bg-wash border border-accent/20 text-[12px] text-ink-2 leading-relaxed">لا يوجد حساب محفوظ على هذا الجهاز بعد. <button type="button" onClick={() => app.setAuthView("signup")} className="text-accent hover:underline underline-offset-4">أنشئ حسابك</button> — دقيقتان.</p>}
      <TrustPolicy variant="compact" className="mt-6" />
    </div>
  );
}

// Opened by the password-reset link: the link signed the member in for this one purpose; they choose a new password here
export function NewPassword({ app }: any) {
  const [pw, setPw] = useState<any>(""); const [confirm, setConfirm] = useState<any>(""); const [err, setErr] = useState<any>(""); const [busy, setBusy] = useState(false);
  const submit = async (e?: any) => {
    if (e) e.preventDefault(); const pe = passwordError(pw) || confirmError(pw, confirm); if (pe) { setErr(pe); return; }
    setBusy(true); try { const p = await cloud.setPassword(pw); setBusy(false); app.signIn(p); } catch (x) { setBusy(false); setErr(x.message); }
  };
  return (
    <div className="h-full flex flex-col px-5 pt-[calc(var(--sat)+1rem)] pb-[max(1.25rem,var(--sab))] overflow-y-auto scroll-area">
      <AuthHeader />
      <div className="mt-8"><h1 className="text-[26px] font-medium leading-tight">كلمة مرور جديدة</h1><p className="mt-1 text-[13px] text-ink-2">اختر كلمة مرور قوية لم تستخدمها من قبل.</p></div>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <FormField label="كلمة المرور الجديدة" htmlFor="np-pw"><PasswordInput id="np-pw" value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoComplete="new-password" placeholder="••••••••" /></FormField>
        <StrengthMeter pw={pw} />
        <FormField label="تأكيد كلمة المرور" htmlFor="np-confirm"><PasswordInput id="np-confirm" value={confirm} onChange={(v) => { setConfirm(v); setErr(""); }} autoComplete="new-password" placeholder="••••••••" /></FormField>
        <FieldError>{err}</FieldError>
        <button type="submit" disabled={busy} aria-busy={busy} className={`${BTN} btn-primary w-full h-12`}>{busy ? <><LoaderCircle size={16} className="spin" /> جارٍ الحفظ…</> : <><Lock size={16} /> حفظ كلمة المرور</>}</button>
      </form>
    </div>
  );
}

// ---- other ways in (cloud): Google, Apple, phone — each button shows only when the project has switched that method on ----
let methods: Promise<any> | null = null;
const GoogleMark = () => <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>;
const AppleMark = () => <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8s2 .8 3.4.8 2.2-1.2 3-2.4c1-1.4 1.4-2.7 1.4-2.8 0 0-2.7-1-2.4-4.2zM13.9 5.2a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1 3.7 3.7 0 0 0 2.9-1.4z"/></svg>;
export function OtherMethods({ app }: any) {
  const [m, setM] = useState<any>(null); const [busy, setBusy] = useState<any>(""); const [err, setErr] = useState<any>("");
  useEffect(() => { if (!isCloud()) return; (methods = methods || cloud.authMethods()).then(setM); }, []);
  if (!m || !(m.google || m.apple || m.phone)) return null;
  const go = async (prov?: any) => { setBusy(prov); setErr(""); try { await cloud.signInWithProvider(prov); } catch (e) { setErr(e.message); } setBusy(""); };
  const btn = "press w-full inline-flex items-center justify-center gap-2.5 h-12 rounded-xl border border-line-2 bg-surface text-[13.5px] font-medium hover:border-accent/40 transition-colors disabled:opacity-60";
  return (
    <div className="space-y-2.5">
      {m.google && <button type="button" disabled={!!busy} onClick={() => go("google")} className={btn}>{busy === "google" ? <LoaderCircle size={16} className="spin" /> : <GoogleMark />} المتابعة بحساب Google</button>}
      {m.apple && <button type="button" disabled={!!busy} onClick={() => go("apple")} className={btn}>{busy === "apple" ? <LoaderCircle size={16} className="spin" /> : <AppleMark />} المتابعة بحساب Apple</button>}
      {m.phone && <button type="button" disabled={!!busy} onClick={() => app.setAuthView("phone")} className={btn}><Smartphone size={17} className="text-accent" /> المتابعة برقم الهاتف</button>}
      <FieldError>{err}</FieldError>
      <div className="flex items-center gap-3 text-[11.5px] text-ink-3" aria-hidden="true"><span className="h-px flex-1 bg-line" />أو بالبريد الإلكتروني<span className="h-px flex-1 bg-line" /></div>
    </div>
  );
}

// ---- phone: number → 6-digit SMS code → in (a new number fills the profile steps next) ----
export function PhoneSignIn({ app }: any) {
  const [phone, setPhone] = useState<any>(""); const [code, setCode] = useState<any>(""); const [sent, setSent] = useState(false); const [err, setErr] = useState<any>(""); const [busy, setBusy] = useState(false); const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const valid = /^(\+?20|0)?1[0125]\d{8}$/.test(String(phone).replace(/[\s-]/g, ""));
  const send = async (e?: any) => { if (e) e.preventDefault(); if (!valid) { setErr("اكتب رقم موبايل مصري صحيح، مثل 01012345678"); return; } setBusy(true); setErr(""); try { await cloud.sendPhoneCode(phone); setSent(true); setWait(60); } catch (x) { setErr(x.message); } setBusy(false); };
  const verify = async (e?: any) => { if (e) e.preventDefault(); if (!/^\d{6}$/.test(code.trim())) { setErr("اكتب الرمز المكوّن من 6 أرقام"); return; } setBusy(true); setErr(""); try { const p = await cloud.verifyPhoneCode(phone, code); setBusy(false); app.signIn(p); } catch (x) { setBusy(false); setErr(x.message); } };
  return (
    <div className="h-full flex flex-col px-5 pt-[calc(var(--sat)+1rem)] pb-[max(1.25rem,var(--sab))] overflow-y-auto scroll-area">
      <AuthHeader><Quiet onClick={() => app.setAuthView("signin")} className="h-9 text-[12px]"><LogIn size={14} /> بالبريد الإلكتروني</Quiet></AuthHeader>
      <div className="mt-8"><h1 className="text-[26px] font-medium leading-tight">الدخول برقم الهاتف</h1><p className="mt-1 text-[13px] text-ink-2">نرسل رمزًا من 6 أرقام في رسالة نصية. رقمك لا يظهر لأي عضو.</p></div>
      {!sent ? <form onSubmit={send} className="mt-6 space-y-4" noValidate>
        <FormField label="رقم الموبايل" htmlFor="ph-num"><TextInput id="ph-num" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(v) => { setPhone(v); setErr(""); }} placeholder="01012345678" /></FormField>
        <FieldError>{err}</FieldError>
        <button type="submit" disabled={busy} className={`${BTN} btn-primary w-full h-12`}>{busy ? <LoaderCircle size={16} className="spin" /> : null} أرسل الرمز</button>
      </form> : <form onSubmit={verify} className="mt-6 space-y-4" noValidate>
        <p className="text-[12.5px] text-ink-2">أرسلنا الرمز إلى <Num>{cloud.e164(phone)}</Num></p>
        <FormField label="الرمز" htmlFor="ph-code"><TextInput id="ph-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(v) => { setCode(String(v).replace(/\D/g, "").slice(0, 6)); setErr(""); }} placeholder="••••••" /></FormField>
        <FieldError>{err}</FieldError>
        <button type="submit" disabled={busy} className={`${BTN} btn-primary w-full h-12`}>{busy ? <LoaderCircle size={16} className="spin" /> : null} دخول</button>
        <button type="button" disabled={wait > 0 || busy} onClick={() => send()} className="w-full h-10 text-[12.5px] text-accent disabled:text-ink-3">{wait > 0 ? <>إعادة الإرسال بعد <Num>{wait}</Num> ث</> : "أعد إرسال الرمز"}</button>
      </form>}
    </div>
  );
}

// ---- after sign-up, until the e-mail is confirmed — on this device or any other ----
// The password stays in this screen's memory only (never stored). Every 10 s, and each time the app comes back to the
// front, it tries to sign in quietly: the moment the link is opened anywhere, this device is in. The 6-digit code from the
// same e-mail works here too.
let pendingSignup: { email: string; password: string } | null = null;
export function ConfirmEmail({ app }: any) {
  const cred = pendingSignup; const [code, setCode] = useState<any>(""); const [err, setErr] = useState<any>(""); const [busy, setBusy] = useState(false); const [sentAgain, setSentAgain] = useState(false);
  const done = (p?: any) => { if (!p) return false; pendingSignup = null; app.signIn(p); return true; };
  useEffect(() => {
    if (!cred) { app.setAuthView("signin"); return; }
    let stop = false; const tryNow = () => { if (!stop && !document.hidden) cloud.trySignIn(cred.email, cred.password).then((p) => { if (!stop) done(p); }); };
    const i = setInterval(tryNow, 10000); document.addEventListener("visibilitychange", tryNow);
    const quit = setTimeout(() => clearInterval(i), 15 * 60000); // a quarter of an hour of quiet tries; the button below stays
    return () => { stop = true; clearInterval(i); clearTimeout(quit); document.removeEventListener("visibilitychange", tryNow); };
  }, []);
  if (!cred) return null;
  const verify = async (e?: any) => { if (e) e.preventDefault(); if (!/^\d{6}$/.test(code.trim())) { setErr("اكتب الرمز المكوّن من 6 أرقام"); return; } setBusy(true); setErr(""); try { done(await cloud.verifyEmailCode(cred.email, code)); } catch (x) { setErr(x.message); } setBusy(false); };
  const check = async () => { setBusy(true); setErr(""); const p = await cloud.trySignIn(cred.email, cred.password); setBusy(false); if (!done(p)) setErr("لم يُؤكَّد البريد بعد — افتح الرابط في الرسالة (من أي جهاز)"); };
  return (
    <div className="h-full flex flex-col px-5 pt-[calc(var(--sat)+1rem)] pb-[max(1.25rem,var(--sab))] overflow-y-auto scroll-area">
      <AuthHeader><Quiet onClick={() => { pendingSignup = null; app.setAuthView("signin"); }} className="h-9 text-[12px]"><LogIn size={14} /> دخول</Quiet></AuthHeader>
      <div className="mt-8"><h1 className="text-[26px] font-medium leading-tight">أكّد بريدك</h1>
        <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">أرسلنا رسالة إلى <Num>{cred.email}</Num>. افتح الرابط فيها من أي جهاز — موبايلك أو اللابتوب — وستدخل هنا تلقائيًا خلال ثوانٍ.</p></div>
      <div className="mt-5 flex items-center gap-2 text-[12px] text-ink-2"><LoaderCircle size={14} className="spin text-accent" /> في انتظار التأكيد…</div>
      <form onSubmit={verify} className="mt-6 space-y-3" noValidate>
        <FormField label="أو اكتب الرمز من الرسالة" htmlFor="cf-code"><TextInput id="cf-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(v) => { setCode(String(v).replace(/\D/g, "").slice(0, 6)); setErr(""); }} placeholder="••••••" /></FormField>
        <FieldError>{err}</FieldError>
        <button type="submit" disabled={busy} className={`${BTN} btn-primary w-full h-12`}>{busy ? <LoaderCircle size={16} className="spin" /> : null} تأكيد</button>
        <Secondary onClick={check} disabled={busy} className="w-full h-11">أكّدت البريد — ادخل الآن</Secondary>
        <button type="button" disabled={sentAgain} onClick={async () => { try { await cloud.resendConfirmation(cred.email); setSentAgain(true); } catch (x) { setErr(x.message); } }} className="w-full h-10 text-[12.5px] text-accent disabled:text-ink-3">{sentAgain ? "أُعيد الإرسال" : "لم تصلك الرسالة؟ أعد الإرسال"}</button>
      </form>
    </div>
  );
}

export const AuthScreen = ({ app }: any) => (app.authView === "confirm" ? <ConfirmEmail app={app} /> : app.authView === "phone" ? <PhoneSignIn app={app} /> : app.authView === "newpw" ? <NewPassword app={app} /> : app.authView === "signin" ? <SignIn app={app} /> : <Registration app={app} mode="signup" />);


// Shown once, right after the account is created
export function Welcome({ app }: any) {
  const p = app.profile; const first = cleanName(p.name).split(" ")[0] || "";
  return (
    <div className="h-full overflow-y-auto scroll-area px-5 pt-[calc(var(--sat)+1.5rem)] pb-[max(1.25rem,var(--sab))]">
      <div className="text-center pop-in"><span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-good/15 text-good"><CircleCheck size={28} /></span><h1 className="mt-3 text-[22px] font-medium leading-snug">أهلًا {first} — حسابك جاهز</h1><p className="mt-1 text-[12.5px] text-ink-2 leading-relaxed">لك هويتان منفصلتان تمامًا. {gx(p.gender, "تختار", "تختارين")} بينهما في كل مشاركة.</p></div>
      <div className="mt-5 space-y-2"><IdentityCard p={p} as="anon" on={p.identity !== "public"} /><IdentityCard p={p} as="public" on={p.identity === "public"} /></div>
      <p className="mt-2 text-[11.5px] text-ink-2 text-center">الافتراضي الآن: <span className="text-ink font-medium">{IDENTITY[p.identity === "public" ? "public" : "anon"].label}</span> — {gx(p.gender, "تغيّره من «حسابك» متى شئت", "تغيّرينه من «حسابك» متى شئتِ")}.</p>
      <Primary onClick={app.dismissWelcome} className="mt-5 w-full h-12">{gx(p.gender, "ادخل", "ادخلي")} EngSpace <Forward /></Primary>
      {!p.verified && !p.pending && can(p, "verify") && <Secondary onClick={() => { app.dismissWelcome(); app.openSheet("verify"); }} className="mt-2 w-full h-11 text-[13px]"><ShieldCheck size={15} /> {gx(p.gender, "وثّق حسابك الآن", "وثّقي حسابك الآن")} — اختياري</Secondary>}
      {can(p, "verify") && <p className="mt-2 text-[11px] text-ink-3 text-center leading-snug">يراجع فريق الإدارة المستندات يدويًا، وتُحذف نهائيًا فور المراجعة.</p>}
    </div>
  );
}
