import {
  ArrowLeftRight, BadgeCheck, Check, CircleCheck, KeyRound, ShieldCheck
} from "lucide-react";
import { IDENTITY, TRUST_FOOTNOTE, TRUST_POLICY, authorOf, cleanName, displayName, gx } from "../domain/identity";
import { ROLES, canVerifyRole, repLevel } from "../domain/taxonomy";
import { isEn, tr } from "../i18n/i18n";
import { seedOf } from "../lib/helpers";
import { PHOTO_MAX } from "../lib/media";
import { AnonChip, Avatar, specOf } from "./characters";
import { Num } from "./primitives";

// =====================================================================
//  Identity UI — a public author is a name with a square monogram; an anonymous author is a hash with a round cartoon.
//  The two never share a face, so a reader cannot match an anonymous item to a public one by its picture.
// =====================================================================
export const MONO_BG = ["#334155", "#3f3f46", "#44403c", "#1e3a5f", "#3b2f4a", "#1f3b33", "#4a3728"];

// initials skip the Arabic article: «منى الشريف» → «م ش», not «م ا»
export const initialsOf = (name?: any) => cleanName(name).split(" ").filter(Boolean).slice(0, 2).map((w) => (/^ال./.test(w) && w.length > 3 ? w[2] : w[0])).join(" ");

// employers' public monogram: role colour (gold owner, orange HR) with a framed edge — engineers keep the muted palette
export const MONO_ROLE = { owner: "#6f5310", hr: "#8a3a12" };

export function Monogram({ name, size = 40, className = "", role = null, photo = null }: any) {
  const co = role === "owner" || role === "hr"; const bg = co ? MONO_ROLE[role] : MONO_BG[seedOf(cleanName(name) || "x") % MONO_BG.length];
  // a chosen profile photo stands in for the initials — never bigger than PHOTO_MAX, never clickable or expandable
  if (photo) { const s = Math.min(size, PHOTO_MAX); return <span aria-hidden="true" className={`photo-mark relative shrink-0 inline-block overflow-hidden rounded-[30%] select-none ${className}`} style={{ width: s, height: s, margin: size > s ? (size - s) / 2 : undefined }}><img src={photo} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />{co && <span className="absolute inset-0 rounded-[30%] pointer-events-none" style={{ boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(s * 0.07))}px rgb(var(--${role}))` }} />}</span>; }
  return <span aria-hidden="true" className={`shrink-0 grid place-items-center rounded-[30%] text-white font-semibold select-none ${className}`} style={{ width: size, height: size, background: bg, boxShadow: co ? `inset 0 0 0 ${Math.max(2, Math.round(size * 0.07))}px rgb(var(--${role}))` : undefined, fontSize: Math.max(9, Math.round(size * 0.34)), lineHeight: 1 }}>{initialsOf(name) || "؟"}</span>;
}

// an author snapshot keeps the role in userRole; a thread's "with" keeps it in role (and the title in title)
export const faceRole = (a?: any) => (!a ? null : a.userRole || (ROLES.some((r) => r.id === a.role) ? a.role : null));

export const IdentityFace = ({ a, size = 40, className = "" }: any) => (a && a.as === "public" ? <Monogram name={a.name} role={faceRole(a)} photo={a.photo} size={size} className={className} /> : <Avatar spec={specOf(a)} role={faceRole(a)} gender={a ? a.gender : "male"} look={a ? a.look : undefined} size={size} className={className} />);

export const openProps = (onOpen?: any) => (onOpen ? { role: "button", tabIndex: 0, onClick: (e?: any) => { e.stopPropagation(); onOpen(); }, onKeyDown: (e?: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpen(); } } } : {});

export const PublicChip = ({ a, onOpen, className = "" }: any) => (
  <span {...openProps(onOpen)} title={`ملف علني · ${displayName(a)}`} className={`inline-flex items-center gap-1.5 h-7 ps-0.5 pe-2 rounded-full bg-info/10 border border-info/25 text-[11.5px] text-ink font-medium ${onOpen ? "cursor-pointer hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : ""} ${className}`}>
    <Monogram name={a.name} role={a.userRole} photo={a.photo} size={22} />{displayName(a)}{a.verified && canVerifyRole(a.userRole || "engineer") && <BadgeCheck size={12} className="text-accent" />}
  </span>
);

export const WhoChip = ({ a, onOpen, className = "" }: any) => (a && a.as === "public" ? <PublicChip a={a} onOpen={onOpen} className={className} /> : <AnonChip id={a.anon} avatar={a.avatar} gender={a.gender} spec={specOf(a)} look={a.look} level={a.level} expert={a.expert} role={a.userRole || "engineer"} verified={a.verified !== false && canVerifyRole(a.userRole || "engineer")} onOpen={onOpen} className={className} />);

export const IdentityTag = ({ as, className = "" }: any) => { const m = IDENTITY[as === "public" ? "public" : "anon"]; return <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] ${as === "public" ? "bg-info/15 text-info" : "bg-elevated text-ink-3"} ${className}`}><m.icon size={10} />{m.label}</span>; };


// ---- the per-action choice: full switch (compose, review, salary) and a one-tap toggle (replies, votes) ----
export function IdentitySwitch({ app, value, onChange, what = "هذه المشاركة", className = "" }: any) {
  const p = app.profile; const lv = repLevel(app.pts).i; const opts: any = [["anon", authorOf(p, "anon", lv)], ["public", authorOf(p, "public", lv)]]; const cur = value === "public" ? opts[1][1] : opts[0][1];
  return (
    <div className={`rounded-2xl border border-line bg-canvas/50 p-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5"><span className="text-[11.5px] text-ink-2">كيف {gx(p.gender, "تظهر", "تظهرين")} في {what}؟</span><span className="text-[10.5px] text-ink-3">{gx(p.gender, "تختار", "تختارين")} في كل مرة</span></div>
      <div role="radiogroup" aria-label={`هويتك في ${what}`} className="grid grid-cols-2 gap-1.5">
        {opts.map(([id, a]: any) => { const on = value === id; const M = IDENTITY[id]; return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)} className={`press min-h-12 flex items-center gap-2 px-2.5 py-2 rounded-xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? (id === "public" ? "bg-info/10 border-info/40" : "bg-wash border-accent/40") : "bg-surface border-line-2 hover:border-line-3"}`}>
            <IdentityFace a={a} size={28} />
            <span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-[12.5px] font-medium leading-tight"><M.icon size={12} className={on ? (id === "public" ? "text-info" : "text-accent") : "text-ink-3"} />{M.label}</span><span className="block text-[11px] text-ink-2 leading-tight break-words">{id === "public" ? displayName(a) : <Num>#{a.anon}</Num>}</span></span>
            {on && <Check size={14} className={`shrink-0 ${id === "public" ? "text-info" : "text-accent"}`} />}
          </button>); })}
      </div>
      <p aria-live="polite" className="mt-1.5 px-1 text-[11px] leading-snug text-ink-2"><span className="text-ink-3">يراه الجميع هكذا: </span>{value === "public" ? `${displayName(cur)} — ${cur.role}` : <><Num>#{cur.anon}</Num> — {cur.role}</>}</p>
    </div>
  );
}

export function IdentityToggle({ app, value, onChange, className = "" }: any) {
  const pub = value === "public"; const a = authorOf(app.profile, pub ? "public" : "anon"); const M = IDENTITY[pub ? "public" : "anon"]; const other = IDENTITY[pub ? "anon" : "public"];
  return (
    <button type="button" role="switch" aria-checked={pub} aria-label={`تظهر ${pub ? "علنًا باسمك" : "مجهولًا"} — اضغط للتبديل إلى ${other.label}`} title={`${gx(app.profile.gender, "اضغط لتظهر", "اضغطي لتظهري")} ${pub ? "مجهولًا" : "علنًا باسمك"}`} onClick={() => onChange(pub ? "anon" : "public")}
      className={`press inline-flex items-center gap-1.5 h-8 ps-1 pe-2.5 rounded-full border text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${pub ? "bg-info/10 border-info/30 text-ink" : "bg-elevated border-line-2 text-ink-2"} ${className}`}>
      <IdentityFace a={a} size={22} /><M.icon size={12} className={pub ? "text-info" : "text-ink-3"} />{pub ? displayName(a) : <Num>#{a.anon}</Num>}<ArrowLeftRight size={11} className="text-ink-3" />
    </button>
  );
}

// What each identity shows and hides — used in registration, the welcome screen and the account screen
export const SHOWS = { public: ["اسمك الكامل", "لقبك الكامل: التخصص والمسار والمستوى والمدينة", "سنة التخرج والعمر", "شارة التوثيق إن وُجدت"], anon: ["معرّف مجهول وشخصية كرتونية", "الدور العام وسنوات الخبرة", "شارة التوثيق إن وُجدت"] };

export const HIDES = { public: ["بريدك وكلمة المرور", "مشاركاتك المجهولة — لا تُربط بك"], anon: ["اسمك وعمرك", "مدينتك وجهة عملك", "بريدك وأي بيانات تواصل", "أي رابط بملفك العلني"] };

export function IdentityCard({ p, as, on = false, onClick, className = "" }: any) {
  const a = authorOf(p, as); const M = IDENTITY[as]; const pub = as === "public";
  const inner = (<>
    <span className="flex items-center gap-2.5"><IdentityFace a={a} size={40} /><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[13.5px] font-medium"><M.icon size={14} className={on ? (pub ? "text-info" : "text-accent") : "text-ink-3"} />{pub ? "علني — باسمك" : "مجهول — وضع الشبح"}</span><span className="block text-[12px] text-ink leading-snug">{pub ? (cleanName(a.name) ? displayName(a) : "اسمك الكامل") : <Num>#{a.anon || "····"}</Num>}</span></span>{on && <CircleCheck size={18} className={`shrink-0 ${pub ? "text-info" : "text-accent"}`} />}</span>
    <span className="block mt-2 px-2.5 py-1.5 rounded-lg bg-canvas/60 border border-line text-[11.5px] leading-snug text-ink-2">{a.role}</span>
    <span className="mt-2 grid grid-cols-2 gap-2 text-[10.5px] leading-snug"><span className="block"><span className="block text-good mb-0.5">يظهر</span>{SHOWS[as].map((t) => <span key={t} className="block text-ink-2">· {t}</span>)}</span><span className="block"><span className="block text-ink-3 mb-0.5">لا يظهر أبدًا</span>{HIDES[as].map((t) => <span key={t} className="block text-ink-3">· {t}</span>)}</span></span>
  </>);
  const cls = `block w-full text-start rounded-2xl border p-3 transition-colors ${on ? (pub ? "bg-info/[0.07] border-info/40" : "bg-wash border-accent/40") : "bg-surface border-line-2"} ${className}`;
  return onClick ? <button type="button" role="radio" aria-checked={on} onClick={onClick} className={`press ${cls} hover:border-line-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>{inner}</button> : <div className={cls}>{inner}</div>;
}


// ---- the three written commitments. `focus` puts one first (the document one on upload screens). ----
export function TrustPolicy({ variant = "full", focus = null, className = "" }: any) {
  const items = focus ? [...TRUST_POLICY].sort((a, b) => Number(b.id === focus) - Number(a.id === focus)) : TRUST_POLICY;
  if (variant === "compact") return (
    <section aria-label="سياسة الخصوصية والأمان" className={`rounded-2xl border border-good/25 bg-good/[0.06] p-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-good"><ShieldCheck size={14} /> التزاماتنا لك — مكتوبة ونافذة</p>
      <ul className="mt-2 space-y-1.5">{items.map((t) => <li key={t.id} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-2"><t.icon size={13} className="shrink-0 mt-1 text-good" /><span><span className="text-ink font-medium">{t.title}: </span>{t.body}</span></li>)}</ul>
    </section>
  );
  return (
    <section aria-label="سياسة الخصوصية والأمان" className={`rounded-2xl border border-good/25 bg-good/[0.06] p-4 ${className}`}>
      <div className="flex items-center gap-2.5"><span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-good/15 text-good"><ShieldCheck size={18} /></span><div><h3 className="text-[14px] font-medium">سياسة الخصوصية والأمان</h3><p className="text-[11px] text-ink-2">ثلاثة التزامات لا تتغير — مهما كانت الجهة التي تطلب</p></div></div>
      <ol className="mt-3 space-y-2.5">{items.map((t) => <li key={t.id} className="flex items-start gap-2.5"><span className="grid place-items-center w-7 h-7 shrink-0 rounded-lg bg-surface border border-line text-good"><t.icon size={14} /></span><span className="min-w-0"><span className="block text-[13px] font-medium leading-snug">{t.title}</span><span className="block mt-0.5 text-[12px] leading-relaxed text-ink-2">{t.body}</span></span></li>)}</ol>
      <p className="mt-3 pt-2.5 border-t border-line text-[11px] leading-relaxed text-ink-3 flex items-start gap-1.5"><KeyRound size={12} className="shrink-0 mt-0.5" />{TRUST_FOOTNOTE}</p>
    </section>
  );
}


// ---- clipboard that never leaves an unhandled rejection (unfocused documents reject writeText) ----
export const copyText = (v?: any) => { v = isEn() ? String(v).split("\n").map((l) => tr(l)).join("\n") : v; try { const r = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(String(v)) : null; if (r && r.catch) r.catch(() => { try { const t = document.createElement("textarea"); t.value = String(v); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); } catch (e) {} }); } catch (e) {} };
