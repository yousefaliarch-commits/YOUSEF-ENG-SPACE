import React, { useState } from "react";
import {
  Award, BadgeCheck
} from "lucide-react";
import { genderOf, roleOf, roleTitle } from "../domain/taxonomy";
import { useMode } from "../lib/runtime";
import { FilterChip } from "./primitives";

// Hash chip: avatar + hash + the role glyph everyone sees (verified engineer = badge check, expert = award)
export const AnonChip = ({ id, avatar, gender, level, expert, role = "engineer", verified = true, spec, look, className = "", onOpen }: any) => {
  const r = roleOf(role); const RI = r.icon; const isEng = role === "engineer";
  const act = onOpen ? { role: "button", tabIndex: 0, onClick: (e?: any) => { e.stopPropagation(); onOpen(); }, onKeyDown: (e?: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpen(); } } } : {};
  return (
    <span dir="ltr" {...act} className={`inline-flex items-center gap-1.5 h-7 ps-0.5 pe-2 rounded-full bg-elevated/80 border ${role === "owner" ? "border-owner/50" : role === "hr" ? "border-hr/50" : "border-line"} font-grotesk text-[10.5px] text-ink-2 ${onOpen ? "cursor-pointer hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : ""} ${className}`} title={`${roleTitle(role, gender)}${isEng ? (verified ? (genderOf(gender) === "female" ? " موثّقة" : " موثّق") : (genderOf(gender) === "female" ? " غير موثّقة" : " غير موثّق")) : ""}`}>
      <Avatar spec={spec} role={role} gender={gender} look={look} size={22} />#{id}
      {isEng ? (verified ? <BadgeCheck size={11} className="text-accent" /> : <span className="w-1.5 h-1.5 rounded-full bg-ink-4" />) : <RI size={11} className={role === "owner" ? "text-owner" : role === "hr" ? "text-hr" : "text-accent"} />}
      {expert && <Award size={11} className="text-good" />}
    </span>
  );
};



// =====================================================================
//  Characters — one per specialty, fixed for life. A member's character is decided only by what they do (engineering discipline,
//  or the verified Syndicate division for chemical / petroleum & mining / textile engineers; site supervisor; HR; employer) and
//  their gender. Never assigned at random, never re-rolled; it changes only if the specialty itself changes.
//  Look: a neon specialty hue on a deep field, a smart-suit bust with a glowing seam and chest emblem, the specialty's headgear
//  with an AR visor, and a floating hologram of the specialty's tool. Idle life (breathing, blinking, visor scan, hologram float,
//  orbiting light) runs on avatars of 40 px and up and stops under prefers-reduced-motion.
//  Privacy: the character shows the specialty and gender — exactly what the anonymous title line already says, nothing more.
// =====================================================================
export const CHAR_SPECS = ["civil", "architecture", "mechanical", "electrical", "survey", "chemical", "mining", "textile", "supervisor", "hr", "owner"];

export const DIV_SPECS = ["chemical", "mining", "textile"];

// hue on the colour wheel (11 distinct), skin tone, gear, hologram, names; employers carry kind for their frame and badge
export const SPEC_META = {
  civil:        { hue: 205, skin: "#e3b48c", beard: "stubble", gear: "hardhat", prop: "frame", m: "المهندس المدني", f: "المهندسة المدنية" },
  architecture: { hue: 295, skin: "#f0c9a5", gear: "monocle", prop: "plan", m: "المهندس المعماري", f: "المهندسة المعمارية", hair: "#2a1a12" },
  mechanical:   { hue: 135, skin: "#c68c5f", beard: "full", gear: "goggles", prop: "gear", m: "مهندس الميكانيكا", f: "مهندسة الميكانيكا" },
  electrical:   { hue: 56,  skin: "#d9a27a", gear: "shield", prop: "bolt", m: "مهندس الكهرباء", f: "مهندسة الكهرباء" },
  survey:       { hue: 172, skin: "#b87b52", beard: "full", gear: "gnss", prop: "orbit", m: "مهندس المساحة", f: "مهندسة المساحة" },
  chemical:     { hue: 262, skin: "#e8bf9a", gear: "respirator", prop: "molecule", m: "المهندس الكيميائي", f: "المهندسة الكيميائية" },
  mining:       { hue: 2,   skin: "#a8714a", beard: "full", gear: "minerlamp", prop: "derrick", m: "مهندس البترول والتعدين", f: "مهندسة البترول والتعدين" },
  textile:      { hue: 330, skin: "#f1c7a3", gear: "visorband", prop: "spool", m: "مهندس الغزل والنسيج", f: "مهندسة الغزل والنسيج", hair: "#3b2416" },
  supervisor:   { hue: 78,  skin: "#b07a50", beard: "mustache", gear: "hivis", prop: "checklist", m: "مشرف الموقع", f: "مشرفة الموقع" },
  hr:           { hue: 24,  skin: "#e0b48f", gear: "headset", prop: "network", m: "مسؤول الموارد البشرية", f: "مسؤولة الموارد البشرية", kind: "hr", hair: "#2b1d16" },
  owner:        { hue: 44,  skin: "#d9a27a", gear: "exec", prop: "skyline", m: "صاحب العمل", f: "صاحبة العمل", kind: "owner", hair: "#262626", temples: true, beard: "trim" },
};

export const specFromText = (t?: any) => { const s = String(t || ""); return /كيميا|كيماو/.test(s) ? "chemical" : /تعدين|بترول/.test(s) ? "mining" : /غزل|نسيج/.test(s) ? "textile" : /معمار/.test(s) ? "architecture" : /ميكانيك/.test(s) ? "mechanical" : /كهرب/.test(s) ? "electrical" : /مساحة|مساحه|GIS|جيوماتكس/i.test(s) ? "survey" : "civil"; };

// the member's own specialty: role first, then a verified division that has no market discipline, then the registered discipline
export const specOfPersona = (p?: any) => { if (!p) return "civil"; if (p.role === "supervisor" || p.role === "hr" || p.role === "owner") return p.role; if (p.verified && DIV_SPECS.includes(p.division)) return p.division; return CHAR_SPECS.includes(p.disc) ? p.disc : "civil"; };

// an author snapshot, a thread partner or a seed: explicit spec, else role, else verified division, else read from the title line
export const specOf = (a?: any) => {
  if (!a) return "civil"; if (CHAR_SPECS.includes(a.spec)) return a.spec;
  const role = a.userRole || (["engineer", "supervisor", "hr", "owner"].includes(a.role) ? a.role : "engineer"); if (role !== "engineer") return role;
  if (a.verified !== false && DIV_SPECS.includes(a.division)) return a.division; return specFromText([a.title, a.role].filter((x) => x && x !== "engineer").join(" "));
};

export const characterName = (spec?: any, gender?: any) => { const m = SPEC_META[spec] || SPEC_META.civil; return genderOf(gender) === "female" ? m.f : m.m; };

export const charPalette = (h?: any, mode: any = "dark") => (mode === "light"
  ? { glow: `hsl(${h},78%,40%)`, glow2: `hsl(${h},88%,50%)`, bg1: `hsl(${h},90%,97%)`, bg0: `hsl(${h},62%,86%)`, suit1: `hsl(${h},24%,46%)`, suit0: `hsl(${h},32%,28%)`, trim: `hsl(${h},40%,66%)`, hood: `hsl(${h},34%,50%)`, hoodEdge: `hsl(${h},44%,68%)`, inner: `hsl(${h},55%,88%)`, edge: "rgba(15,23,42,.30)", badge: "#ffffff", field: 0.32, ring: 0.55 }
  : { glow: `hsl(${h},95%,64%)`, glow2: `hsl(${h},100%,82%)`, bg1: `hsl(${h},52%,19%)`, bg0: `hsl(${h},58%,6%)`, suit1: `hsl(${h},16%,28%)`, suit0: `hsl(${h},22%,11%)`, trim: `hsl(${h},28%,46%)`, hood: `hsl(${h},26%,40%)`, hoodEdge: `hsl(${h},30%,55%)`, inner: `hsl(${h},30%,62%)`, edge: "rgba(255,255,255,.16)", badge: "#0b0b0f", field: 0.45, ring: 0.4 });

export const useCharId = typeof React !== "undefined" && React.useId ? () => React.useId().replace(/[^A-Za-z0-9]/g, "") : () => "c";


// ---- parts ----
export const Visor = ({ u, x, y, w, h, c, dark = false }: any) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={dark ? "#05060c" : c.glow} fillOpacity={dark ? 0.6 : 0.17} stroke={c.glow} strokeWidth=".6" />
    <clipPath id={`${u}vc`}><rect x={x} y={y} width={w} height={h} rx={h / 2} /></clipPath>
    <g clipPath={`url(#${u}vc)`}><rect className="ch-scan" x={x - 3} y={y} width="3" height={h} fill={c.glow2} opacity=".75" style={{ "--w": `${w + 3}px` } as React.CSSProperties} /></g>
    <path d={`M${x + h / 2} ${y + 1.2}h${w * 0.34}`} stroke="#fff" strokeOpacity=".5" strokeWidth=".6" strokeLinecap="round" />
  </g>
);

export const FACE = { m: "M21.9 30.2c0-6.8 4.4-11.3 10.1-11.3s10.1 4.5 10.1 11.3c0 3.9-.8 6.9-2.6 9.1-1.9 2.3-4.5 3.1-7.5 3.1s-5.6-.8-7.5-3.1c-1.8-2.2-2.6-5.2-2.6-9.1z", f: "M22.5 30.2c0-6.7 4.2-11.2 9.5-11.2s9.5 4.5 9.5 11.2c0 3.8-1.1 6.8-3 9-1.8 2.1-4 3.2-6.5 3.2s-4.7-1.1-6.5-3.2c-1.9-2.2-3-5.2-3-9z" };

export const BEARD = "M22.4 33.2c.4 5.6 4.2 9.4 9.6 9.4s9.2-3.8 9.6-9.4c-1.2 2.4-3 3.6-4.6 3.9-1.3-1.2-3-1.8-5-1.8s-3.7.6-5 1.8c-1.6-.3-3.4-1.5-4.6-3.9z";

export const Beard = ({ kind, col }: any) => (!kind ? null : kind === "mustache" ? <path d="M28.2 36.2c1.2-1 2.5-1.3 3.8-.6 1.3-.7 2.6-.4 3.8.6-1.2.6-2.5.7-3.8.2-1.3.5-2.6.4-3.8-.2z" fill={col} /> : <path d={BEARD} fill={col} opacity={kind === "stubble" ? 0.3 : kind === "trim" ? 0.85 : 1} />);

export const FaceParts = ({ fem, mouth = true }: any) => (
  <g>
    {fem ? <path d="M25.9 29.1q2.1-1.5 4.1-.4M34 28.7q2.1-1.1 4.1.4" stroke="#2a1d16" strokeWidth=".6" fill="none" strokeLinecap="round" />
      : <path d="M25.6 28.9q2.2-.9 4.4-.2M34 28.7q2.2-.7 4.4.2" stroke="#241811" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
    <g className="ch-eyes"><ellipse cx="28" cy="31.8" rx={fem ? 1.45 : 1.3} ry={fem ? 1.75 : 1.55} fill="#0b0b12" /><ellipse cx="36" cy="31.8" rx={fem ? 1.45 : 1.3} ry={fem ? 1.75 : 1.55} fill="#0b0b12" /><circle cx="28.45" cy="31.2" r=".48" fill="#fff" /><circle cx="36.45" cy="31.2" r=".48" fill="#fff" /></g>
    {fem && <path d="M26.5 30.3l-1-.8M27.3 29.9l-.6-1M36.7 29.9l.6-1M37.5 30.3l1-.8" stroke="#0b0b12" strokeWidth=".55" strokeLinecap="round" />}
    {fem && <g fill="#ff7a8a" opacity=".22"><ellipse cx="25.6" cy="35.4" rx="1.9" ry="1.1" /><ellipse cx="38.4" cy="35.4" rx="1.9" ry="1.1" /></g>}
    {mouth && (fem ? <path d="M29.4 37.1q2.6 2 5.2 0q-2.6 1-5.2 0z" fill="#b8574d" /> : <path d="M29.3 37.3q2.7 1.5 5.4 0" stroke="#4a2a1c" strokeWidth="1.05" fill="none" strokeLinecap="round" />)}
  </g>
);

export const HairBack = ({ col }: any) => <path d="M20 30c0-10.5 5-17.5 12-17.5S44 19.5 44 30v15c0 2.2-1.6 3.4-3.4 3.4H23.4c-1.8 0-3.4-1.2-3.4-3.4z" fill={col} />;

export const HairFront = ({ col, fem }: any) => (fem
  ? <path d="M21.4 29.5c.7-8.3 5-13 10.6-13s9.9 4.7 10.6 13c-1.6-3.8-4.2-5.8-7.4-6.4-1.4 1.8-4.2 3-7.8 3.3 1.6-.9 2.6-2 3-3.2-4 .8-7 3.4-9 6.3z" fill={col} />
  : <path d="M21.6 28.8c.2-8.4 4.7-13.2 10.4-13.2 5.9 0 10.3 4.4 10.4 12.6-1.3-2.6-3.6-4.3-6.8-4.9-3.4 1.6-8.4 2.1-12 .6-.9 1.4-1.6 3-2 4.9z" fill={col} />);

// the female character's head covering: a smooth techwear hood that frames the face (the member may choose hair instead)
export const Hood = ({ c, part }: any) => (part === "back"
  ? <g><path d="M18.5 49c-3-10.5-3.2-24.5 1.8-31.8 3-4.4 7.2-6.6 11.7-6.6s8.7 2.2 11.7 6.6c5 7.3 4.8 21.3 1.8 31.8z" fill={c.hood} /><path d="M20.3 17.2c3-4.4 7.2-6.6 11.7-6.6s8.7 2.2 11.7 6.6" fill="none" stroke={c.hoodEdge} strokeWidth=".8" opacity=".8" /></g>
  : <g><path d="M21.6 28c.5-7.4 4.8-11.9 10.4-11.9s9.9 4.5 10.4 11.9c-2.3-3.8-5.9-5.6-10.4-5.6s-8.1 1.8-10.4 5.6z" fill={c.hood} /><path d="M22.2 33.5c.4 6.8 4.4 11.3 9.8 11.3s9.4-4.5 9.8-11.3c.5 8-3.6 14.1-9.8 14.1s-10.3-6.1-9.8-14.1z" fill={c.hood} /><path d="M22 28.6c2.4-3.9 5.9-5.8 10-5.8s7.6 1.9 10 5.8" stroke={c.glow} strokeWidth=".55" fill="none" opacity=".8" className="ch-seam" /></g>);


// ---- headgear per specialty (helmet = hair hidden) ----
export const GEARS = {
  hardhat: { helmet: true, draw: (c?: any, u?: any) => <g>
    <path d="M19.4 27.6c0-9.2 5.7-15.8 12.6-15.8s12.6 6.6 12.6 15.8z" fill="#e8eef6" stroke={c.edge} strokeWidth=".6" /><path d="M26.5 13.6c1.6-.9 3.5-1.4 5.5-1.4s3.9.5 5.5 1.4v13.9h-11z" fill="#d3deeb" />
    <path d="M26.5 20h11" stroke={c.glow} strokeWidth=".9" className="ch-seam" /><rect x="16.3" y="26" width="31.4" height="3.3" rx="1.65" fill="#b8c4d4" stroke={c.edge} strokeWidth=".5" />
    <rect x="29.7" y="16.2" width="4.6" height="3.6" rx="1.3" fill={c.glow2} className="ch-lamp" /><Visor u={u} x={21} y={29.4} w={22} h={5.6} c={c} /></g> },
  monocle: { helmet: false, draw: (c?: any) => <g>
    <path d="M20.4 24.2c3.2-5 7.2-7.4 11.6-7.4s8.4 2.4 11.6 7.4" stroke={c.glow} strokeWidth=".8" fill="none" opacity=".85" className="ch-seam" />
    <circle cx="36" cy="31.8" r="3.7" fill={c.glow} fillOpacity=".16" stroke={c.glow2} strokeWidth=".8" /><circle cx="36" cy="31.8" r="2.3" fill="none" stroke={c.glow2} strokeWidth=".35" strokeDasharray=".8 .8" className="ch-spin" />
    <path d="M39.7 31.8h4.4l1.8-2.4" stroke={c.glow} strokeWidth=".6" fill="none" /></g> },
  goggles: { helmet: true, draw: (c?: any) => <g>
    <path d="M20.2 26.4c0-8.4 5.3-13.8 11.8-13.8s11.8 5.4 11.8 13.8z" fill={c.suit1} /><path d="M20.2 26.4c0-8.4 5.3-13.8 11.8-13.8" fill="none" stroke={c.trim} strokeWidth=".7" />
    <rect x="19.6" y="20.4" width="24.8" height="3.2" rx="1.6" fill="#101418" />
    <circle cx="27" cy="21.6" r="3.5" fill="#101418" stroke={c.trim} strokeWidth=".8" /><circle cx="27" cy="21.6" r="2.3" fill={c.glow} fillOpacity=".6" className="ch-lamp" />
    <circle cx="37" cy="21.6" r="3.5" fill="#101418" stroke={c.trim} strokeWidth=".8" /><circle cx="37" cy="21.6" r="2.3" fill={c.glow} fillOpacity=".6" className="ch-lamp" />
    <rect x="17.4" y="27.6" width="4.6" height="8" rx="2.1" fill="#101418" stroke={c.glow} strokeWidth=".5" /><rect x="42" y="27.6" width="4.6" height="8" rx="2.1" fill="#101418" stroke={c.glow} strokeWidth=".5" /></g> },
  shield: { helmet: true, draw: (c?: any, u?: any) => <g>
    <path d="M19.6 27c0-9 5.6-15.2 12.4-15.2s12.4 6.2 12.4 15.2z" fill="#1c2230" /><path d="M19.6 27c0-9 5.6-15.2 12.4-15.2s12.4 6.2 12.4 15.2" fill="none" stroke={c.glow} strokeWidth=".6" opacity=".75" />
    <path d="M33.2 14.2l-3 4.9h2.5l-1.6 4.3 4.1-5.7h-2.6z" fill={c.glow2} className="ch-lamp" /><rect x="17.2" y="25.6" width="29.6" height="2.8" rx="1.4" fill="#2a3242" />
    <Visor u={u} x={20.8} y={28.6} w={22.4} h={6.4} c={c} /><path d="M21.6 35.4h20.8c0 2.6-2.2 4.4-4.8 4.4H26.4c-2.6 0-4.8-1.8-4.8-4.4z" fill={c.glow} fillOpacity=".1" stroke={c.glow} strokeWidth=".4" /></g> },
  gnss: { helmet: true, draw: (c?: any) => <g>
    <path d="M20.4 26.2c0-8.2 5.1-13.4 11.6-13.4s11.6 5.2 11.6 13.4z" fill={c.suit1} /><path d="M26 14.4c1.8-1 3.8-1.6 6-1.6" stroke={c.glow} strokeWidth=".7" fill="none" />
    <path d="M19.8 26h16.6c3.2 0 6.4.7 8.6 2.1H19.8z" fill={c.trim} /><path d="M32 12.8V8.4" stroke="#cbd5e1" strokeWidth="1" />
    <ellipse cx="32" cy="7.9" rx="4.2" ry="1.35" fill="#e2e8f0" /><circle cx="32" cy="7.3" r=".95" fill={c.glow2} className="ch-lamp" />
    <path d="M26.5 5.4a8 8 0 0 1 11 0" stroke={c.glow} strokeWidth=".5" fill="none" className="ch-flicker" />
    <rect x="33" y="28.9" width="7.6" height="5.8" rx="1.6" fill={c.glow} fillOpacity=".22" stroke={c.glow2} strokeWidth=".6" /><path d="M36.8 29.8v4M34.6 31.8h4.4" stroke={c.glow2} strokeWidth=".35" /></g> },
  respirator: { helmet: true, noMouth: true, draw: (c?: any, u?: any) => <g>
    <path d="M20.2 25.8c0-8 5.3-13.1 11.8-13.1s11.8 5.1 11.8 13.1z" fill="#ede9fe" stroke={c.edge} strokeWidth=".6" /><path d="M20.2 25.8h23.6" stroke={c.glow} strokeWidth=".8" className="ch-seam" />
    <Visor u={u} x={21} y={28.5} w={22} h={6.6} c={c} />
    <path d="M26.2 36.4c1.6-1.4 3.6-2.1 5.8-2.1s4.2.7 5.8 2.1l-1 4.6c-1.5 1.2-3.1 1.8-4.8 1.8s-3.3-.6-4.8-1.8z" fill="#2b3445" />
    <circle cx="25.6" cy="39.6" r="2.3" fill="#3b475c" stroke={c.glow} strokeWidth=".55" /><circle cx="38.4" cy="39.6" r="2.3" fill="#3b475c" stroke={c.glow} strokeWidth=".55" />
    <path d="M30 38.2h4" stroke={c.glow2} strokeWidth=".5" className="ch-lamp" /></g> },
  minerlamp: { helmet: true, draw: (c?: any) => <g>
    <path d="M19.4 27.6c0-9.2 5.7-15.8 12.6-15.8s12.6 6.6 12.6 15.8z" fill="#2a1618" /><path d="M32 11.8v15.8" stroke={c.glow} strokeWidth="1.3" opacity=".85" className="ch-seam" />
    <rect x="16.3" y="26" width="31.4" height="3.3" rx="1.65" fill="#3a2226" /><circle cx="32" cy="18.6" r="5.6" fill={c.glow2} opacity=".22" className="ch-lamp" />
    <circle cx="32" cy="18.6" r="3.3" fill="#fff4e6" stroke="#ffb4a2" strokeWidth=".6" />
    <path d="M24.2 22.8c.9-1.7 1.8-2.7 1.8-3.6a1.8 1.8 0 0 0-3.6 0c0 .9.9 1.9 1.8 3.6z" fill={c.glow} opacity=".85" /></g> },
  visorband: { helmet: false, draw: (c?: any, u?: any) => <g>
    <path d="M17.5 22.5c5-6.5 12.5-8.8 21-6.6" stroke={c.glow2} strokeWidth=".7" fill="none" strokeDasharray="1.6 1.4" className="ch-flow" />
    <Visor u={u} x={20.8} y={29.4} w={22.4} h={5} c={c} dark /></g> },
  hivis: { helmet: true, draw: (c?: any, u?: any) => <g>
    <path d="M19.4 27.6c0-9.2 5.7-15.8 12.6-15.8s12.6 6.6 12.6 15.8z" fill="hsl(72,92%,56%)" stroke={c.edge} strokeWidth=".6" /><path d="M19.4 27.6c0-9.2 5.7-15.8 12.6-15.8" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth=".7" />
    <path d="M20.6 21.8h22.8" stroke="#e5e7eb" strokeWidth="2.2" /><path d="M20.6 21.8h22.8" stroke="#fff" strokeWidth=".6" strokeDasharray="1.4 1.4" className="ch-flow" />
    <rect x="16.3" y="26" width="31.4" height="3.3" rx="1.65" fill="hsl(72,80%,44%)" /><Visor u={u} x={21.5} y={29.4} w={21} h={5.4} c={c} /></g> },
  headset: { helmet: false, draw: (c?: any) => <g>
    <path d="M20.2 31a11.8 11.8 0 0 1 23.6 0" stroke="#11141c" strokeWidth="2" fill="none" />
    <rect x="18" y="28.4" width="4.3" height="7.2" rx="2" fill="#11141c" stroke={c.glow} strokeWidth=".5" /><rect x="41.7" y="28.4" width="4.3" height="7.2" rx="2" fill="#11141c" stroke={c.glow} strokeWidth=".5" />
    <path d="M20.2 35.2c0 3.4 2.5 5.7 7 5.7" stroke="#11141c" strokeWidth="1.2" fill="none" strokeLinecap="round" /><circle cx="27.6" cy="40.9" r="1.3" fill={c.glow2} className="ch-lamp" />
    <rect x="24.4" y="29.8" width="6.6" height="4.2" rx="1.5" fill={c.glow} fillOpacity=".14" stroke={c.glow} strokeWidth=".55" /><rect x="33" y="29.8" width="6.6" height="4.2" rx="1.5" fill={c.glow} fillOpacity=".14" stroke={c.glow} strokeWidth=".55" /><path d="M31 31.4h2" stroke={c.glow} strokeWidth=".55" /></g> },
  exec: { helmet: false, draw: (c?: any) => <g>
    <rect x="23.8" y="29.5" width="7.2" height="4.6" rx="1.6" fill={c.glow} fillOpacity=".12" stroke={c.glow2} strokeWidth=".7" /><rect x="33" y="29.5" width="7.2" height="4.6" rx="1.6" fill={c.glow} fillOpacity=".12" stroke={c.glow2} strokeWidth=".7" />
    <path d="M31 31.2h2M23.8 30.6l-2.2-.8M40.2 30.6l2.2-.8" stroke={c.glow2} strokeWidth=".6" /><path d="M24.6 30.4h2.6" stroke="#fff" strokeOpacity=".55" strokeWidth=".4" /></g> },
};

// ---- what each role wears over the suit (engineers wear the chest emblem instead) ----
export const OUTFITS = {
  owner: (c?: any) => <g><path d="M26 46.3l6 12.2 6-12.2z" fill="#f8fafc" /><path d="M32 48.6l-2.1 3 2.1 8.6 2.1-8.6z" fill={c.glow} /><path d="M23.2 46.8l8.8 13.4-10.8-5.2zM40.8 46.8L32 60.2l10.8-5.2z" fill={c.suit0} /><path d="M43.8 53.2h3.4" stroke={c.glow2} strokeWidth="1" className="ch-lamp" /></g>,
  hr: (c?: any) => <g><path d="M26 47l6 7.4 6-7.4" stroke={c.glow} strokeWidth=".9" fill="none" /><rect x="28.9" y="53.6" width="6.2" height="7.8" rx="1.1" fill="#f8fafc" /><rect x="30" y="55" width="4" height="1.3" rx=".6" fill={c.glow} /><path d="M30 57.6h4M30 59.2h2.6" stroke="#94a3b8" strokeWidth=".5" /></g>,
  supervisor: (c?: any) => <g><path d="M13.5 66c1-8.6 6.2-13.6 12.5-15.6l6 5.4 6-5.4c6.3 2 11.5 7 12.5 15.6z" fill="hsl(72,88%,48%)" opacity=".92" /><path d="M17 63.5l10.5-7.5M47 63.5l-10.5-7.5" stroke="#eef2f7" strokeWidth="2.2" /><path d="M17 63.5l10.5-7.5M47 63.5l-10.5-7.5" stroke="#fff" strokeWidth=".6" strokeDasharray="1.2 1.2" className="ch-flow" /><rect x="45.2" y="48.6" width="3.2" height="6" rx="1" fill="#11141c" /><path d="M46.8 48.6v-4.2" stroke="#11141c" strokeWidth=".8" /><circle cx="46.8" cy="50.4" r=".6" fill={c.glow2} className="ch-lamp" /></g>,
};

export const EMBLEMS = { civil: "M-1.9-1.7h3.8M-1.9 1.7h3.8M0-1.7v3.4", architecture: "M0-2.2L-1.7 2M0-2.2L1.7 2M-1 .4h2", mechanical: "M0-2.1a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 1 1 0-4.2M0-.8a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6", electrical: "M.5-2.3L-1.2.3h1.3L-.5 2.3 1.3-.4H0z", survey: "M-2 0h4M0-2v4M-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0", chemical: "M-.8-2.2h1.6M-.5-2.2v1.4L-1.9 2h3.8L.5-.8v-1.4", mining: "M0-2.3C.8-1 1.6-.2 1.6.8a1.6 1.6 0 0 1-3.2 0C-1.6-.2-.8-1 0-2.3z", textile: "M-2.2 0c.7-1.4 1.5-1.4 2.2 0s1.5 1.4 2.2 0M-2.2 1.6c.7-1.4 1.5-1.4 2.2 0s1.5 1.4 2.2 0", supervisor: "M-1.8 0l1.2 1.3L1.9-1.3" };

export const EMBLEM_FILLED = ["electrical", "mining"];

// ---- the floating hologram of each specialty's tool ----
export const PROPS = {
  frame: () => <path d="M-5 3l5 2.6 5-2.6M-5 3v-7l5-2.6 5 2.6v7M0 5.6v-7M-5-4l5 2.6 5-2.6M-5-.5l5 2.6 5-2.6" />,
  plan: () => <g><rect x="-5.5" y="-4.5" width="11" height="9" rx=".6" /><path d="M-5.5 0h4.5v4.5M.8-4.5v3h4.7M-1 2.4h1.6" /></g>,
  gear: () => <g className="ch-spin"><circle r="4.1" strokeDasharray="1.9 1.3" strokeWidth="2.2" /><circle r="1.5" /></g>,
  bolt: (c?: any) => <path className="ch-flicker" d="M1.2-6.2L-3.4 1h3.2L-2 6.2 3.8-1.6H.4z" fill={c.glow2} fillOpacity=".85" stroke="none" />,
  orbit: (c?: any) => <g><ellipse rx="6.2" ry="2.3" transform="rotate(-18)" /><circle r="1.5" fill={c.glow} /><g className="ch-spin"><circle r="6.2" stroke="none" fill="none" /><circle cx="6.2" r="1.1" fill={c.glow2} stroke="none" /></g></g>,
  molecule: (c?: any) => <g><path d="M-4 3.2L0-2.4 4 3.2M-4 3.2h8" /><circle cy="-2.4" r="1.6" fill={c.glow} /><circle cx="-4" cy="3.2" r="1.3" fill={c.glow2} className="ch-lamp" /><circle cx="4" cy="3.2" r="1.3" fill={c.glow2} /></g>,
  derrick: (c?: any) => <g><path d="M-3.4 5.4L0-5.4 3.4 5.4M-2.3 2h4.6M-1.2-1.6h2.4M-4.6 5.4h9.2" /><path className="ch-flicker" d="M5.8 1.2c.8 1.3 1.5 2.1 1.5 3a1.5 1.5 0 0 1-3 0c0-.9.7-1.7 1.5-3z" fill={c.glow2} stroke="none" /></g>,
  spool: () => <g><rect x="-3.2" y="-4.4" width="6.4" height="8.8" rx="1.2" /><path d="M-3.2-2h6.4M-3.2 0h6.4M-3.2 2h6.4" /><path className="ch-flow" d="M3.2 0c2.6 0 2.4 4.6 5.4 4.6" strokeDasharray="1.4 1.2" /></g>,
  checklist: (c?: any) => <g><rect x="-4" y="-5" width="8" height="10" rx="1.1" /><path d="M-2.3-1.9l1 1 2.1-2.1M-2.3 1.9l1 1 2.1-2.1" stroke={c.glow2} /></g>,
  network: (c?: any) => <g><path d="M0-4L-4.4 2.6M0-4l4.4 6.6M-4.4 2.6h8.8M0-4v3.2" /><circle cy="-4" r="1.5" fill={c.glow} /><circle cx="-4.4" cy="2.6" r="1.3" fill={c.glow2} /><circle cx="4.4" cy="2.6" r="1.3" fill={c.glow2} /><circle cy="-.6" r="1" fill={c.glow2} className="ch-lamp" /></g>,
  skyline: (c?: any) => <g><path d="M-5.2 5.2V1.6h2.6v3.6M-1.3 5.2v-6h2.6v6M2.6 5.2v-9.4h2.6v9.4M-5.8 5.2h11.6" /><path d="M-5-2.6l3-2.4 2.4 1.4 4.4-4" stroke={c.glow2} className="ch-flow" strokeDasharray="1.4 1" /></g>,
};

// Employers keep a role-coloured frame and a badge (briefcase = owner, ID card = HR), visible even at 22px
export const RoleMark = ({ kind, badge = "#0b0b0f" }: any) => { const c: any = { fill: `rgb(var(--${kind === "owner" ? "owner" : "hr"}))` }; return (<g>
  <circle cx="32" cy="32" r="30.4" fill="none" style={{ stroke: c.fill }} strokeWidth="3.2" />
  <circle cx="48.5" cy="48.5" r="8.8" fill={badge} style={{ stroke: c.fill }} strokeWidth="1.6" />
  {kind === "owner" ? <g><rect x="44.1" y="47" width="8.8" height="6.2" rx="1.2" style={c} /><path d="M46.7 47v-1.5h3.6V47" fill="none" style={{ stroke: c.fill }} strokeWidth="1.3" /></g>
    : <g><rect x="44" y="45" width="9" height="6.8" rx="1.2" style={c} /><circle cx="46.5" cy="48.4" r="1.25" fill={badge} /><path d="M48.7 47.4h2.8M48.7 49.4h2.1" stroke={badge} strokeWidth="0.9" /></g>}
</g>); };


// The character. `spec` decides it; `role` is a fallback for callers that only know the account type. `animate` forces idle life on/off.
export function Avatar({ spec, role, gender, look, size = 40, className = "", ring = false, animate }: any) {
  const s = CHAR_SPECS.includes(spec) ? spec : ["supervisor", "hr", "owner"].includes(role) ? role : "civil";
  const m = SPEC_META[s]; const fem = genderOf(gender) === "female"; const hood = fem && look !== "hair"; const g = GEARS[m.gear]; const mode = useMode(); const c = charPalette(m.hue, mode);
  const u = "ch" + useCharId(); const live = animate != null ? animate : size >= 40; const hair = m.hair || "#1f1a17"; const P = PROPS[m.prop];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`ch shrink-0 rounded-full ${live ? "ch-live" : ""} ${ring ? "ring-2 ring-accent/40" : ""} ${className}`} role="img" aria-label={`شخصية ${fem ? m.f : m.m}`}>
      <defs>
        <radialGradient id={`${u}b`} cx="50%" cy="36%" r="72%"><stop offset="0" stopColor={c.bg1} /><stop offset="1" stopColor={c.bg0} /></radialGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.suit1} /><stop offset="1" stopColor={c.suit0} /></linearGradient>
        <clipPath id={`${u}c`}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${u}b)`} />
      <g clipPath={`url(#${u}c)`}>
        <g fill="none" stroke={c.glow} opacity={c.field}><circle cx="32" cy="30" r="21.5" strokeWidth=".35" strokeDasharray="1 2.6" /><path d="M0 47.5h64M0 53.5h64" strokeWidth=".25" /><path d="M49.5 12.5h4l2.5-2.5M50 16.5h6" strokeWidth=".45" /></g>
        <g transform="translate(12.5 16)"><g className="ch-prop" stroke={c.glow} strokeWidth=".75" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle r="8.6" fill={c.glow} fillOpacity=".07" stroke="none" />{P(c)}</g></g>
        <g transform="translate(32 64) scale(1.07) translate(-32 -64)"><g className="ch-bust">
          {fem ? (hood ? <Hood c={c} part="back" /> : <HairBack col={hair} />) : null}
          <path d={fem ? "M8.5 66c1.3-11.8 10.6-18.8 23.5-18.8S54.2 54.2 55.5 66z" : "M4.8 66c1-12.8 11.2-19.8 27.2-19.8S58.2 53.2 59.2 66z"} fill={`url(#${u}s)`} />
          {fem && !m.kind && <path d="M27.6 47.6l4.4 6.4 4.4-6.4z" fill={c.inner} />}
          <path d="M10.5 60.5c3-6 8-9.2 13.6-10.2M53.5 60.5c-3-6-8-9.2-13.6-10.2" stroke={c.trim} strokeWidth="1.1" fill="none" />
          <path d="M21.6 50.8l10.4 5.8 10.4-5.8" stroke={c.glow} strokeWidth="1.05" fill="none" className="ch-seam" />
          {OUTFITS[s] && OUTFITS[s](c)}
          {!m.kind && <g transform="translate(32 58.8)"><g className="ch-core"><path d="M0-4.6L4-2.3v4.6L0 4.6-4 2.3v-4.6z" fill={c.bg0} stroke={c.glow} strokeWidth=".9" /><path d={EMBLEMS[s]} fill={EMBLEM_FILLED.includes(s) ? c.glow2 : "none"} stroke={c.glow2} strokeWidth=".7" strokeLinecap="round" strokeLinejoin="round" /></g></g>}
          {fem ? <path d="M29 40.6h6v6.9c-1 .9-2 1.3-3 1.3s-2-.4-3-1.3z" fill={m.skin} /> : <path d="M28 40.4h8v7.3c-1.3 1-2.6 1.5-4 1.5s-2.7-.5-4-1.5z" fill={m.skin} />}<path d="M28.3 40.6h7.4v2.6c-2.4 1.2-5 1.2-7.4 0z" fill="#000" opacity=".14" />
          {!hood && <g fill={m.skin}><ellipse cx={fem ? 22.8 : 22.1} cy="32.4" rx="1.3" ry="2.1" /><ellipse cx={fem ? 41.2 : 41.9} cy="32.4" rx="1.3" ry="2.1" /></g>}
          <path d={fem ? FACE.f : FACE.m} fill={m.skin} />
          {!fem && <Beard kind={m.beard} col={m.hair || "#1f1a17"} />}
          <path d="M40.4 24.2c1.5 2 2.3 4.3 2.3 6.8 0 3.3-1.3 6.2-3.4 8.3" stroke={c.glow} strokeOpacity=".55" strokeWidth=".9" fill="none" strokeLinecap="round" />
          <FaceParts fem={fem} mouth={!g.noMouth} />
          {hood ? <Hood c={c} part="front" /> : !g.helmet ? <HairFront col={hair} fem={fem} /> : null}
          {fem && !hood && <g fill={c.glow2}><circle cx="22.9" cy="35.3" r=".85" /><circle cx="41.1" cy="35.3" r=".85" /></g>}
          {fem && hood && <circle cx="38.8" cy="44.4" r="1.05" fill={c.glow2} className="ch-lamp" />}
          {m.temples && !fem && !hood && <path d="M21.9 29.6c0-1.7.3-3.1.8-4.3M42.1 29.6c0-1.7-.3-3.1-.8-4.3" stroke="#a3a3a3" strokeWidth="1.2" fill="none" />}
          {g.draw(c, u)}
        </g></g>
      </g>
      <circle cx="32" cy="32" r="31.3" fill="none" stroke={c.glow} strokeOpacity=".4" strokeWidth=".9" />
      <circle cx="32" cy="32" r="31.3" fill="none" stroke={c.glow2} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="9 188" className="ch-orbit" />
      {m.kind && <RoleMark kind={m.kind} badge={c.badge} />}
    </svg>
  );
}

// Every specialty's character side by side — the permissions screen shows it so members know what each face means
export function CharacterGallery({ gender = "male" }: any) {
  const [g, setG] = useState<any>(genderOf(gender));
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3"><p className="text-[11px] text-ink-2 leading-snug">كل شخصية مرتبطة بتخصص واحد — لا اختيار عشوائي.</p><div className="flex gap-1.5 shrink-0"><FilterChip on={g === "male"} onClick={() => setG("male")}>رجال</FilterChip><FilterChip on={g === "female"} onClick={() => setG("female")}>نساء</FilterChip></div></div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">{CHAR_SPECS.map((s) => <div key={s} className="flex flex-col items-center gap-1 text-center"><Avatar spec={s} gender={g} size={52} /><span className={`text-[10px] leading-tight ${s === "owner" ? "text-owner" : s === "hr" ? "text-hr" : "text-ink-2"}`}>{characterName(s, g)}</span></div>)}</div>
    </div>
  );
}
