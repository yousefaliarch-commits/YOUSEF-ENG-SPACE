// =====================================================================
//  Push notifications, the member's side:
//  · PushPrimerSheet — the explanation shown BEFORE the OS permission dialog (never a raw OS prompt out of the blue)
//  · NotificationPrefsScreen — «إعدادات الإشعارات»: this device's status, the master switch and one switch per alert type
//  What each switch means is decided on the server (supabase/…_push_notifications.sql); this screen only edits it.
// =====================================================================
import { useEffect, useState } from "react";
import { Bell, BellRing, Briefcase, Check, CircleAlert, Lock, MessageCircle, Send, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { isCompanyRole } from "../../domain/taxonomy";
import { Panel, Primary, Quiet, Secondary, Toggle } from "../../ui/primitives";
import { Chip } from "../../ui/primitives";

// what turning notifications on gets this member — by role (job alerts and salary figures are for engineers)
export const benefitsFor = (role?: string) => {
  const all = [
    { id: "jobs", Icon: Briefcase, title: "فرص عمل فورية", sub: "وظائف جديدة تناسب تخصصك الهندسي ومستوى خبرتك ومحافظتك — فور نشرها." },
    { id: "salary", Icon: Wallet, title: "تحديثات الرواتب والتضخم", sub: "معايير السوق الجديدة وتغيّرات متتبّع التضخم لتعرف قيمة راتبك." },
    { id: "community", Icon: MessageCircle, title: "ردود ورسائل فورية", sub: "ردود على أسئلتك وتعليقاتك، وإشارات إليك، ورسائل زملائك الخاصة." },
    { id: "support", Icon: ShieldCheck, title: "الدعم من فريق EngSpace", sub: "تحديثات وردود تذاكر الدعم مباشرةً من «فريق EngSpace»." },
  ];
  return role === "supervisor" || isCompanyRole(role as any) ? all.filter((b) => b.id === "community" || b.id === "support") : all;
};

export function PushPrimerSheet({ app }: any) {
  const [step, setStep] = useState<"ask" | "busy" | "ok" | "denied" | "unavailable" | "unsupported">("ask");
  const web = !app.native;
  const enable = async () => { setStep("busy"); const r = await app.enablePush(); setStep(r.ok ? "ok" : r.reason === "denied" ? "denied" : r.reason === "unsupported" ? "unsupported" : r.permission === "default" ? "ask" : "unavailable"); };
  const later = () => { app.pushPrimerLater(); app.closeSheet(); };
  if (step === "ok") return (
    <div className="text-center flex flex-col items-center gap-3 py-2 pop-in"><span className="grid place-items-center w-14 h-14 rounded-2xl bg-good/15 text-good"><Check size={28} /></span>
      <h4 className="text-[19px] font-medium">تم تفعيل الإشعارات</h4>
      <p className="text-[13px] text-ink-2 max-w-[34ch] leading-relaxed">{web ? "ستظهر لك الإشعارات عندما يكون التطبيق مفتوحًا في تبويب متصفحك." : "ستصلك الإشعارات على هذا الجهاز."} اختر ما يهمّك من إعدادات الإشعارات في أي وقت.</p>
      <Primary onClick={() => { app.closeSheet(); app.push({ type: "notifprefs" }); }} className="w-full mt-1 press">إعدادات الإشعارات</Primary><Quiet onClick={app.closeSheet}>تم</Quiet></div>
  );
  if (step === "denied" || step === "unavailable" || step === "unsupported") return (
    <div className="text-center flex flex-col items-center gap-3 py-2 pop-in"><span className="grid place-items-center w-14 h-14 rounded-2xl bg-warn/15 text-warn"><CircleAlert size={28} /></span>
      <h4 className="text-[18px] font-medium">{step === "denied" ? "الإذن مغلق على هذا الجهاز" : step === "unsupported" ? "المتصفح لا يدعم الإشعارات" : "الإشعارات الفورية غير جاهزة في هذه النسخة"}</h4>
      <p className="text-[13px] text-ink-2 max-w-[36ch] leading-relaxed">{step === "denied" ? "لتفعيلها افتح إعدادات الجهاز ← EngSpace ← الإشعارات ثم اسمح بها." : step === "unsupported" ? "كل جديد يصلك داخل التطبيق على أي حال، في مركز الإشعارات." : "لم يكتمل ربط خدمة الإشعارات بهذه النسخة بعد. كل جديد يظهر داخل التطبيق في مركز الإشعارات، وستعمل الإشعارات الفورية في النسخة القادمة."}</p>
      <Primary onClick={app.closeSheet} className="w-full mt-1 press">حسنًا</Primary></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center gap-2"><span className="grid place-items-center w-14 h-14 rounded-2xl bg-wash text-accent"><BellRing size={26} /></span>
        <h3 className="text-[19px] font-medium leading-snug">ابقَ على اطلاع لحظة بلحظة</h3>
        <p className="text-[13px] text-ink-2 max-w-[36ch] leading-relaxed">فعّل الإشعارات لتصلك الفرص والردود فور حدوثها — ولا نرسل إلا ما يخصّك.</p></div>
      <ul className="space-y-2">{benefitsFor(app.profile.role).map(({ id, Icon, title, sub }) => (
        <li key={id} className="flex items-start gap-3 p-3 rounded-2xl bg-canvas border border-line"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><Icon size={18} /></span>
          <div className="min-w-0"><p className="text-[13.5px] font-medium">{title}</p><p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{sub}</p></div></li>))}</ul>
      <p className="text-[11.5px] leading-relaxed text-ink-3 flex items-start gap-1.5"><Lock size={13} className="shrink-0 mt-0.5" /> لا يظهر نص الردود أو الرسائل ولا اسم أحد على شاشة القفل، ويمكنك إيقاف أي نوع في أي وقت.</p>
      <div className="space-y-1"><Primary onClick={enable} disabled={step === "busy"} aria-busy={step === "busy"} className="w-full h-12 press">{step === "busy" ? "جارٍ التفعيل…" : <><Bell size={16} /> تفعيل الإشعارات</>}</Primary>
        <Quiet onClick={later} disabled={step === "busy"} className="w-full">ليس الآن</Quiet></div>
    </div>
  );
}

// one row of the preferences list
const Row = ({ Icon, title, sub, on, onChange, disabled }: any) => (
  <div className={`py-3 flex items-start gap-3 border-t border-line first:border-0 ${disabled ? "opacity-50" : ""}`}>
    <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-wash text-accent"><Icon size={17} /></span>
    <div className="min-w-0 flex-1"><p className="text-[13.5px] text-ink leading-snug">{title}</p><p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{sub}</p></div>
    <span className={disabled ? "pointer-events-none" : ""}><Toggle on={on} onChange={onChange} label={title} /></span>
  </div>
);

export function NotificationPrefsScreen({ app }: any) {
  const p = app.notifPrefs; const eng = !isCompanyRole(app.profile.role) && app.moneyAccess !== "none"; const master = app.profile.notify !== false;
  const [testing, setTesting] = useState(false);
  useEffect(() => { app.refreshPushStatus(); }, []);
  const st = app.pushStatus; // { permission, devices, supported }
  const chip = !st.supported ? ["none", "غير متاحة هنا"] : st.permission === "denied" ? ["warn", "محظورة من إعدادات الجهاز"] : st.permission === "granted" ? (st.devices > 0 || !app.native ? ["good", "مفعّلة على هذا الجهاز"] : ["warn", "الإذن ممنوح — الجهاز لم يُسجَّل بعد"]) : ["default", "غير مفعّلة"];
  const test = async () => { setTesting(true); await app.testPush(); setTesting(false); };
  return (
    <div className="py-4 space-y-3">
      <div className="px-1"><h1 className="text-[21px] font-medium leading-tight">إعدادات الإشعارات</h1><p className="mt-0.5 text-[12px] text-ink-2 leading-relaxed">اختر ما يصلك على جهازك وفي مركز الإشعارات. لا يظهر نص الردود أو الرسائل ولا هوية أحد على شاشة القفل.</p></div>
      <Panel className="p-4"><div className="flex items-start gap-3"><span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-wash text-accent"><Smartphone size={18} /></span>
        <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium">الإشعارات الفورية على هذا الجهاز</p><div className="mt-1.5"><Chip tone={chip[0] as any}>{chip[1]}</Chip></div></div></div>
        {st.supported && st.permission !== "granted" && st.permission !== "denied" && <Primary onClick={() => app.openSheet("pushprimer")} className="mt-3 w-full h-11 press"><BellRing size={16} /> تفعيل الإشعارات</Primary>}
        {st.permission === "denied" && <p className="mt-3 text-[12px] leading-relaxed text-ink-2">لتفعيلها افتح إعدادات الجهاز ← EngSpace ← الإشعارات ثم اسمح بها.</p>}
        {st.supported && st.permission === "granted" && app.cloud && <Secondary onClick={test} disabled={testing} className="mt-3 w-full h-11"><Send size={15} /> {testing ? "جارٍ الإرسال…" : "أرسل لي إشعارًا تجريبيًا"}</Secondary>}
        {!st.supported && <p className="mt-3 text-[12px] leading-relaxed text-ink-2">متصفحك لا يدعم الإشعارات. كل جديد يصلك داخل التطبيق.</p>}</Panel>
      <Panel className="px-4 py-1">
        <Row Icon={Bell} title="تفعيل الإشعارات" sub="المفتاح الرئيسي — إيقافه يوقف كل الإشعارات الفورية." on={master} onChange={(v: any) => { app.updateProfile({ notify: v }); app.toast(v ? "تم التفعيل" : "تم الإيقاف"); }} />
      </Panel>
      <Panel className="px-4 py-1"><h2 className="pt-3 pb-1 text-[12px] text-ink-2">أنواع التنبيهات</h2>
        {eng && <Row Icon={Briefcase} title="الوظائف المطابقة" sub="وظيفة جديدة تناسب تخصصك وخبرتك ومحافظتك — بحدّ أقصى 3 يوميًا." on={p.jobs} disabled={!master} onChange={(v: any) => app.setNotifPref("jobs", v)} />}
        <Row Icon={MessageCircle} title="الردود والإشارات" sub="ردّ على منشورك أو تعليقك، أو من ذكرك بـ @." on={p.replies} disabled={!master} onChange={(v: any) => app.setNotifPref("replies", v)} />
        <Row Icon={Send} title="الرسائل الخاصة" sub="رسالة جديدة من زميل — دون نصها على شاشة القفل." on={p.messages} disabled={!master} onChange={(v: any) => app.setNotifPref("messages", v)} />
        {eng && <Row Icon={Wallet} title="الرواتب والتضخم" sub="أرقام سوق جديدة في تخصصك ومحافظتك، وشهر تضخم جديد." on={p.salary} disabled={!master} onChange={(v: any) => app.setNotifPref("salary", v)} />}
        <Row Icon={ShieldCheck} title="الدعم وفريق EngSpace" sub="ردود تذاكر الدعم وتغيّر حالتها، ورسائل الفريق." on={p.support} disabled={!master} onChange={(v: any) => app.setNotifPref("support", v)} />
      </Panel>
      <p className="px-1 text-[11px] leading-relaxed text-ink-3">إشعارات الحساب والأمان (التوثيق، الإشراف، إيقاف الحساب) تصلك دائمًا. وكل شيء يبقى في مركز الإشعارات داخل التطبيق حتى لو أوقفت الإشعارات الفورية.</p>
    </div>
  );
}
