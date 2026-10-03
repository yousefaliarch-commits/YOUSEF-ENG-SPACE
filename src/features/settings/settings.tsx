import { useEffect, useRef, useState } from "react";
import {
  Award, Bell, BookOpen, Briefcase, Building2, Calculator, Check, ChevronDown, CircleHelp, Compass, Home, 
  Languages, Layers, LockKeyhole, MessageCircle, Moon, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Sun, 
  UserRound, Users, VenetianMask, Wallet
} from "lucide-react";
import { gx } from "../../domain/identity";
import { L3, say } from "../../i18n/i18n";
import { ArchMark, BTN, Back, Forward, Num, Panel, Primary, Secondary, Toggle, Wordmark } from "../../ui/primitives";
import { THEMES } from "../../ui/theme";

// =====================================================================
//  The language screen (the app's first screen) · Settings · the feature guide · the interactive tour · the header theme switch
// =====================================================================
export const TOUR_KEY = "engspace.tour";

export const tourSeen = () => { try { return localStorage.getItem(TOUR_KEY) === "done"; } catch (e) { return true; } };

export const markTourSeen = () => { try { localStorage.setItem(TOUR_KEY, "done"); } catch (e) {} };



// The first screen of the app: the language, chosen before the e-mail / registration screen (and once before Home for a member
// who signed in before languages existed). Written in both languages at once (translate="no" — it is never swapped); a tap
// switches the whole app live, «Continue» moves on. The registration's first step has a Back button that returns here.
export const LANG_OPTS = [["ar", "العربية", "واجهة من اليمين إلى اليسار", "أهلًا بك في EngSpace", "rtl", "ع"], ["en", "English", "Left-to-right interface", "Welcome to EngSpace", "ltr", "En"]];

export const PICK_LANG = L3("اختر لغة للمتابعة · Pick a language to continue", "اختاري لغة للمتابعة · Pick a language to continue", "اختر لغة للمتابعة · Pick a language to continue");

export function LanguageScreen({ app, onContinue, next = "signup" }: any) {
  const [picked, setPicked] = useState(!!app.langChosen); const first = useRef<any>(null); const en = app.lang === "en";
  useEffect(() => { try { if (first.current) first.current.focus({ preventScroll: true }); } catch (e) {} }, []);
  const choose = (id?: any) => { setPicked(true); app.setLang(id); };
  const NEXT = { signup: L3("التالي: إنشاء الحساب", null, "Next: create your account"), signin: L3("التالي: تسجيل الدخول", null, "Next: sign in"), home: L3("التالي: الصفحة الرئيسية", null, "Next: Home") }[next] || null;
  return (
    <div translate="no" className="relative h-full flex flex-col overflow-y-auto scroll-area bg-canvas text-ink" data-screen="language">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 26%, rgb(var(--accent) / 0.13), transparent 62%)" }} />
      <div className="relative flex-1 flex flex-col justify-center px-5 pt-[calc(var(--sat)+2rem)] pb-4">
        <div className="rise flex items-center justify-center gap-2.5"><ArchMark size={30} /><Wordmark size="text-[24px]" /></div>
        <h1 id="lang-title" className="rise mt-8 text-center" style={{ animationDelay: "60ms" }}><span dir="rtl" lang="ar" className="block text-[22px] font-medium">اختر لغتك</span><span dir="ltr" lang="en" className="block mt-1 font-grotesk text-[15px] text-ink-2">Choose your language</span></h1>
        <div role="radiogroup" aria-labelledby="lang-title" className="mt-6 space-y-3">
          {LANG_OPTS.map(([id, name, sub, hello, d, glyph]: any, i) => { const on = picked && app.lang === id; return (
            <button key={id} ref={i === 0 ? first : undefined} type="button" role="radio" aria-checked={on} onClick={() => choose(id)} dir={d} lang={id} style={{ animationDelay: `${140 + i * 90}ms` }}
              className={`rise press w-full flex items-center gap-4 p-4 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash border-accent/50" : "bg-surface border-line-2 hover:border-accent/40"}`}>
              <span className={`grid place-items-center w-12 h-12 rounded-2xl text-[18px] font-semibold transition-colors ${id === "en" ? "font-grotesk" : ""} ${on ? "bg-solid text-white" : "bg-elevated text-accent"}`}>{glyph}</span>
              <span className="min-w-0 flex-1"><span className={`block text-[17px] font-medium ${id === "en" ? "font-grotesk" : ""}`}>{name}</span><span className="block text-[12px] text-ink-2">{sub}</span><span className="block mt-1 text-[11.5px] text-ink-3">{hello}</span></span>
              <span className={`grid place-items-center w-6 h-6 rounded-full border transition-colors ${on ? "bg-accent border-accent text-on-accent" : "border-line-2"}`}>{on && <Check size={14} strokeWidth={3} className="pop-in" />}</span>
            </button>); })}
        </div>
        <p className="rise mt-6 text-center text-[11.5px] leading-relaxed text-ink-3" style={{ animationDelay: "340ms" }}><span dir="rtl" lang="ar" className="block">يمكنك تغييرها في أي وقت من الإعدادات</span><span dir="ltr" lang="en" className="block">You can change it anytime in Settings</span></p>
      </div>
      <div className="relative px-5 pt-2 pb-[max(1.25rem,var(--sab))]">
        <Primary onClick={() => { app.setLang(app.lang); onContinue(); }} disabled={!picked} lang={app.lang} className="w-full h-12 press">{en ? "Continue" : "متابعة"} <Forward /></Primary>
        <p aria-live="polite" lang={app.lang} className="mt-2 min-h-[1.25rem] text-center text-[11px] text-ink-3">{picked ? say(app, NEXT) : say(app, PICK_LANG)}</p>
      </div>
    </div>
  );
}


export const SettingsLink = ({ icon: I, title, sub, onClick }: any) => (
  <button type="button" onClick={onClick} className="press w-full flex items-center gap-3 py-3 text-start border-t border-line first:border-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <span className="grid place-items-center w-9 h-9 rounded-xl bg-wash text-accent shrink-0"><I size={16} /></span>
    <span className="min-w-0 flex-1"><span className="block text-[13.5px] text-ink leading-snug">{title}</span>{sub && <span className="block mt-0.5 text-[11px] text-ink-3 leading-snug">{sub}</span>}</span>
    <Forward size={15} />
  </button>
);

export const SETTINGS_TOGGLES = (app?: any) => { const p = app.profile; return [["notify", "إشعارات الردود والوظائف المطابقة"], ["dm", "السماح بالرسائل الخاصة من الزملاء"], ...(p.photo ? [["showPhoto", "إظهار صورتي مع اسمي في المشاركات العلنية"]] : []), ...(app.isCo || app.moneyAccess === "none" ? [] : [["openToRecruiters", "متاح لرسائل الشركات عند مطابقة وظيفة"]]), ...(app.moneyAccess === "none" ? [] : [["hide", "إخفاء نشاطي عن الشركات التي أتابعها"]]), ["rotate", "تجديد المعرّف المجهول تلقائيًا كل 90 يومًا"]]; };


export function SettingsScreen({ app }: any) {
  const p = app.profile; const persist = (patch?: any) => app.updateProfile(patch);
  return (
    <div className="py-4 space-y-3">
      <Panel className="p-4">
        <h2 className="text-[13px] font-medium inline-flex items-center gap-1.5"><Languages size={15} className="text-accent" /> اللغة</h2>
        <div role="radiogroup" aria-label="اللغة" className="mt-3 grid grid-cols-2 gap-2">
          {[["ar", "العربية", "ع"], ["en", "English", "En"]].map(([id, name, glyph]: any) => (
            <button key={id} type="button" role="radio" aria-checked={app.lang === id} translate="no" lang={id} onClick={() => app.setLang(id)}
              className={`press flex items-center gap-2.5 h-14 px-3 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${app.lang === id ? "bg-wash border-accent/50 text-ink" : "bg-canvas border-line-2 text-ink-2 hover:text-ink"}`}>
              <span className={`grid place-items-center w-9 h-9 rounded-xl text-[14px] font-semibold ${id === "en" ? "font-grotesk" : ""} ${app.lang === id ? "bg-solid text-white" : "bg-elevated text-accent"}`}>{glyph}</span>
              <span className={`flex-1 text-[14px] font-medium ${id === "en" ? "font-grotesk" : ""}`}>{name}</span>{app.lang === id && <Check size={16} className="text-accent pop-in" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-3">{gx(p.gender, "تتبدّل الواجهة واتجاهها فورًا دون أن تفقد مكانك. اللغة تخص الواجهة فقط — المنشورات والتعليقات والرسائل تظهر دائمًا كما كتبها أصحابها.", "تتبدّل الواجهة واتجاهها فورًا دون أن تفقدي مكانك. اللغة تخص الواجهة فقط — المنشورات والتعليقات والرسائل تظهر دائمًا كما كتبها أصحابها.")}</p>
      </Panel>
      <Panel className="p-4"><h2 className="text-[13px] font-medium mb-2 inline-flex items-center gap-1.5"><Sun size={15} className="text-accent" /> المظهر</h2>
        <div role="radiogroup" aria-label="المظهر" className="flex p-1 rounded-full bg-canvas border border-line-2">{THEMES.map(([id, l, I]: any) => <button key={id} type="button" role="radio" aria-checked={app.theme === id} onClick={() => { app.setTheme(id); app.toast(id === "system" ? "المظهر يتبع جهازك" : id === "light" ? "الوضع الفاتح" : "الوضع الداكن"); }} className={`press flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full text-[12.5px] transition-colors ${app.theme === id ? "bg-elevated text-ink" : "text-ink-2"}`}><I size={14} className={app.theme === id ? "text-accent" : ""} />{l}</button>)}</div>
        <p className="mt-2 text-[10.5px] text-ink-3 leading-snug">الآن: {app.mode === "light" ? "فاتح" : "داكن"} · يُحفظ اختيارك على هذا الجهاز ويبقى بعد إعادة التحميل. تبديل سريع من زر الشمس والقمر أعلى الرئيسية.</p>
      </Panel>
      <Panel className="p-4"><h2 className="text-[13px] font-medium mb-1 inline-flex items-center gap-1.5"><Bell size={15} className="text-accent" /> الإشعارات والخصوصية</h2>
        {SETTINGS_TOGGLES(app).map(([k, l]: any) => <div key={k} className="py-2.5 flex items-center justify-between gap-3 border-t border-line first:border-0"><span className="text-[13px] text-ink leading-snug">{l}</span><Toggle on={!!p[k]} onChange={(v) => { persist({ [k]: v }); app.toast(v ? "تم التفعيل" : "تم الإيقاف"); }} label={l} /></div>)}
      </Panel>
      <Panel className="px-4 py-2"><h2 className="pt-2 pb-1 text-[13px] font-medium inline-flex items-center gap-1.5"><CircleHelp size={15} className="text-accent" /> المساعدة</h2>
        <SettingsLink icon={Compass} title="جولة تعريفية في التطبيق" sub={gx(p.gender, "جولة تفاعلية قصيرة على أهم الأقسام — أعدها متى شئت", "جولة تفاعلية قصيرة على أهم الأقسام — أعيديها متى شئتِ")} onClick={app.startTour} />
        <SettingsLink icon={BookOpen} title="دليل الاستخدام" sub={gx(p.gender, "شرح مفصّل لكل ميزة، وكيف تقرأ أرقام الرواتب وتستفيد منها", "شرح مفصّل لكل ميزة، وكيف تقرئين أرقام الرواتب وتستفيدين منها")} onClick={() => app.push({ type: "guide" })} />
        <SettingsLink icon={ShieldCheck} title="كيف نحمي هويتك؟" onClick={() => app.openSheet("privacy")} />
        <SettingsLink icon={SlidersHorizontal} title="صلاحياتي" sub="ما يراه حسابك وما لا يراه، ومن يراسل من" onClick={() => app.push({ type: "permissions" })} />
      </Panel>
      <p className="px-1 text-[10.5px] text-ink-3 leading-relaxed text-center"><Wordmark size="text-[11px]" /> · الإصدار <Num>24</Num> · نسخة تجريبية تعمل بالكامل على جهازك</p>
      {/* which build this is — the first thing to check when a fix "is not there" on a phone */}
      <p className="pt-2 pb-1 text-center text-[10.5px] text-ink-4" dir="ltr">EngSpace {__BUILD__.version}{__BUILD__.run ? ` · build ${__BUILD__.run}` : ""} · {__BUILD__.sha} · {__BUILD__.date}</p>
    </div>
  );
}


// ---- the feature guide: one section per area of the app, shaped by what this account can actually use ----
export const GUIDE_PULL = L3("اسحب الشاشة لأسفل للتحديث.", "اسحبي الشاشة لأسفل للتحديث.", "Pull down to refresh.");

export function guideSections(app?: any) {
  const co = app.isCo, sup = app.moneyAccess === "none", eng = !co && !sup, hr = app.profile && app.profile.role === "hr"; const S: any = [];
  S.push({ id: "start", icon: VenetianMask, title: L3("البداية: هويتان منفصلتان", null, "Getting started: two separate identities"), points: [
    L3("لك هويتان: علنية باسمك وصورتك، ومجهولة بمعرّف مثل ‎#a3f9 وشخصية تمثّل تخصصك. لا يستطيع أي عضو أو صاحب عمل الربط بينهما.", null, "You have two identities: a public one with your name and photo, and an anonymous one with an ID like #a3f9 and a character that represents your discipline. No member or employer can link one to the other."),
    L3("قبل كل منشور أو رد أو تقييم أو مشاركة راتب تختار الهوية لتلك المشاركة وحدها.", "قبل كل منشور أو رد أو تقييم أو مشاركة راتب تختارين الهوية لتلك المشاركة وحدها.", "Before every post, reply, review or salary share, you choose the identity for that contribution alone."),
    L3("تغيّر هويتك الافتراضية من «حسابك»، ويمكنك تجديد المعرّف المجهول في أي وقت.", "تغيّرين هويتك الافتراضية من «حسابك»، ويمكنكِ تجديد المعرّف المجهول في أي وقت.", "Change your default identity from “Your account”, and renew your anonymous ID at any time."),
  ], action: [L3("افتح حسابك", "افتحي حسابك", "Open your account"), () => app.push({ type: "profile" })] });
  if (!sup) S.push({ id: "home", icon: Home, title: L3("الرئيسية", null, "Home"), points: co ? [
    L3("ملخّص لحساب شركتك: إعلاناتك النشطة ومدى وصولها، ونبض السوق في التخصصات التي توظّف لها.", "ملخّص لحساب شركتك: إعلاناتك النشطة ومدى وصولها، ونبض السوق في التخصصات التي توظّفين لها.", "A summary for your company account: your active ads and their reach, and the market pulse in the disciplines you hire for."),
    GUIDE_PULL,
  ] : [
    L3("مرتّبة حسب تخصصك ومكانك وهدفك الحالي: نطاق راتبك المتوقع، والوظائف المطابقة، والنقاشات الأنشط في مجالك.", null, "Arranged around your discipline, location and current goal: your expected salary range, matching jobs, and the most active discussions in your field."),
    L3("غيّر «هدفك الحالي» من حسابك لتتغير أولويات الرئيسية والأدوات.", "غيّري «هدفك الحالي» من حسابك لتتغير أولويات الرئيسية والأدوات.", "Change “Your current goal” in your account to change what Home and Tools prioritise."),
    GUIDE_PULL,
  ], action: [L3("افتح الرئيسية", "افتحي الرئيسية", "Open Home"), () => app.setTab("home")] });
  S.push({ id: "community", icon: Users, title: L3("المجتمع: كيف تسأل وتستفيد", "المجتمع: كيف تسألين وتستفيدين", "Community: how to ask and get value"), points: [
    sup ? L3("اضغط + لإنشاء منشور: سؤال أو استطلاع.", "اضغطي + لإنشاء منشور: سؤال أو استطلاع.", "Tap + to create a post: a question or a poll.")
      : L3("اضغط + لإنشاء منشور: سؤال، أو «عرض ولا لأ» لتأخذ رأي الزملاء في عرض وصلك، أو كشف راتب، أو استطلاع.", "اضغطي + لإنشاء منشور: سؤال، أو «عرض ولا لأ» لتأخذي رأي الزملاء في عرض وصلك، أو كشف راتب، أو استطلاع.", "Tap + to create a post: a question, “Take the offer?” to get colleagues’ views on an offer you received, a salary reveal, or a poll."),
    L3("الغرف تجمع النقاشات حسب التخصص والموضوع (المكتب الفني، الموقع، التصميم الإنشائي، MEP…) — تابع ما يهمك.", "الغرف تجمع النقاشات حسب التخصص والموضوع (المكتب الفني، الموقع، التصميم الإنشائي، MEP…) — تابعي ما يهمك.", "Rooms group discussions by discipline and topic (Technical Office, Site, Structural Design, MEP…) — follow what matters to you."),
    L3("التفاعل: «أوافق» و«لا أوافق» لا يجتمعان، و«مفيد» يرفع الرد في الترتيب. وصاحب السؤال يعتمد أفضل إجابة.", null, "Reactions: “Agree” and “Disagree” can’t be combined, and “Helpful” lifts a reply up the ranking. The question’s author marks the accepted answer."),
    ...(eng ? [L3("في نقاشات الرواتب استخدم «رد بالرقم»: رقمك يدخل في متوسط الردود دون أن يرتبط باسمك.", "في نقاشات الرواتب استخدمي «رد بالرقم»: رقمك يدخل في متوسط الردود دون أن يرتبط باسمك.", "In salary discussions use “Number reply”: your figure feeds the replies’ average without being linked to your name.")] : []),
    L3("أرفق صورة بمنشورك — تُزال منها بيانات الموقع والكاميرا تلقائيًا قبل النشر.", "أرفقي صورة بمنشورك — تُزال منها بيانات الموقع والكاميرا تلقائيًا قبل النشر.", "Attach an image to your post — location and camera data are removed automatically before posting."),
    L3("المنشورات والتعليقات تظهر كما كتبها أصحابها — بالعربية غالبًا — حتى لو كانت واجهتك بالإنجليزية.", null, "Posts and comments appear exactly as their authors wrote them — usually in Arabic — even when your interface is in English."),
    L3("أبلغ عن أي محتوى مخالف من علامة العَلَم، ويراجعه فريق المجتمع.", "أبلغي عن أي محتوى مخالف من علامة العَلَم، ويراجعه فريق المجتمع.", "Report any content that breaks the rules with the flag icon; the community team reviews it."),
  ], action: [L3("افتح المجتمع", "افتحي المجتمع", "Open Community"), () => app.setTab("community")] });
  if (eng) S.push({ id: "salaries", icon: Wallet, title: L3("الرواتب: كيف تقرأ الأرقام وتستفيد منها", "الرواتب: كيف تقرئين الأرقام وتستفيدين منها", "Salaries: how to read the figures and use them"), points: [
    L3("الشريط يبدأ عند الشريحة المئوية الـ10 وينتهي عند الـ90، والنقطة المضيئة هي الوسيط: نصف المهندسين المماثلين لك فوقه ونصفهم تحته.", null, "The bar starts at the 10th percentile and ends at the 90th, and the glowing dot is the median: half of comparable engineers are above it and half below."),
    L3("رشِّح حسب التخصص والمسار (تنفيذ، مكتب فني، تصميم، استشاري…) والمستوى والمحافظة — ولكل مدينة معامل يعكس السوق فيها.", "رشِّحي حسب التخصص والمسار (تنفيذ، مكتب فني، تصميم، استشاري…) والمستوى والمحافظة — ولكل مدينة معامل يعكس السوق فيها.", "Filter by discipline and track (site execution, technical office, design, consultancy…), level and governorate — every city has a factor that reflects its market."),
    L3("حجم العينة يظهر بجانب كل رقم: كلما زاد، كان الرقم أدق.", null, "The sample size shows next to every figure: the bigger it is, the more accurate the figure."),
    L3("شارك راتبك دون كشف هويتك (+50 نقطة) لتفتح التفاصيل الكاملة. رقمك الفردي لا يظهر لأي شركة أبدًا.", "شاركي راتبك دون كشف هويتك (+50 نقطة) لتفتحي التفاصيل الكاملة. رقمك الفردي لا يظهر لأي شركة أبدًا.", "Share your salary anonymously (+50 points) to unlock the full details. Your individual figure is never shown to any company."),
    L3("قبل التفاوض: ضع عرضك على الشريط، ثم استخدم «مقارن العروض» و«سكريبت التفاوض» من الأدوات.", "قبل التفاوض: ضعي عرضك على الشريط، ثم استخدمي «مقارن العروض» و«سكريبت التفاوض» من الأدوات.", "Before negotiating: place your offer on the bar, then use “Offer comparer” and “Negotiation script” from Tools."),
  ], action: [L3("افتح الرواتب", "افتحي الرواتب", "Open Salaries"), () => app.goMarket("salaries")] });
  if (co) S.push({ id: "salaries", icon: Wallet, title: L3("رؤية الرواتب لحسابات الشركات", null, "Salary visibility for company accounts"), points: [
    L3("حسابات الموارد البشرية وأصحاب العمل ترى نطاقات السوق الإجمالية فقط — لا يظهر أي راتب فردي أبدًا.", null, "HR and employer accounts see aggregated market ranges only — no individual salary is ever shown."),
    L3("نطاقات مسمّيات شركتك تظهر متى توفرت 30 مشاركة على الأقل، حمايةً لهوية الموظفين.", null, "Ranges for your company’s job titles appear once there are at least 30 contributions, to protect employees’ identities."),
    L3("استخدم النطاقات لتضع عروضًا عادلة ومنافسة تجذب المرشحين المناسبين.", "استخدمي النطاقات لتضعي عروضًا عادلة ومنافسة تجذب المرشحين المناسبين.", "Use the ranges to make fair, competitive offers that attract the right candidates."),
  ], action: [L3("افتح الرواتب", "افتحي الرواتب", "Open Salaries"), () => app.goMarket("salaries")] });
  if (!sup) S.push({ id: "companies", icon: Building2, title: L3("الشركات والتقييمات", null, "Companies & reviews"), points: [
    L3("لكل شركة صفحة: التقييمات، ونطاقات الرواتب، والوظائف المفتوحة، وبياناتها العامة.", null, "Every company has a page: reviews, salary ranges, open jobs and its public details."),
    co ? L3("ترى تقييمات موظفيك كما يراها الجميع — دون أي بيانات تكشف أصحابها.", "ترين تقييمات موظفيك كما يراها الجميع — دون أي بيانات تكشف أصحابها.", "You see your employees’ reviews exactly as everyone does — with nothing that reveals who wrote them.")
      : L3("قيّم شركتك دون كشف هويتك — التقييم يُنشر بلا اسمك ويساعد زملاءك على الاختيار.", "قيّمي شركتك دون كشف هويتك — التقييم يُنشر بلا اسمك ويساعد زملاءك على الاختيار.", "Review your company anonymously — the review is published without your name and helps colleagues choose."),
  ], action: [L3("افتح الشركات", "افتحي الشركات", "Open Companies"), () => app.goMarket("companies")] });
  if (!sup) S.push({ id: "jobs", icon: Briefcase, title: L3("الوظائف والتقديم", null, "Jobs & applying"), points: co ? [
    L3("انشر وظيفة بتصنيف دقيق (التخصص والمسار والمستوى والمحافظة إلزامية) فيصل إشعار فوري للمطابقين تمامًا.", "انشري وظيفة بتصنيف دقيق (التخصص والمسار والمستوى والمحافظة إلزامية) فيصل إشعار فوري للمطابقين تمامًا.", "Post a job with precise classification (discipline, track, level and governorate are mandatory) and exact matches get an instant notification."),
    L3("تابع المشاهدات وعدد من فتحوا بيانات التواصل في كل إعلان.", "تابعي المشاهدات وعدد من فتحوا بيانات التواصل في كل إعلان.", "Track views and how many opened the contact details for each ad."),
    L3("التقديم يتم خارج المنصة: يراسلك المهندس على بريدك أو هاتفك مباشرة.", null, "Applications happen off the platform: engineers contact you directly by email or phone."),
  ] : [
    L3("رشِّح الوظائف حسب التخصص والمستوى والمحافظة، ولكل إعلان نطاق راتب تقديري من EngSpace.", "رشِّحي الوظائف حسب التخصص والمستوى والمحافظة، ولكل إعلان نطاق راتب تقديري من EngSpace.", "Filter jobs by discipline, level and governorate; every ad has an estimated salary range from EngSpace."),
    L3("التقديم خارج المنصة: افتح بيانات التواصل وأرسل سيرتك الذاتية مباشرة إلى صاحب العمل.", "التقديم خارج المنصة: افتحي بيانات التواصل وأرسلي سيرتك الذاتية مباشرة إلى صاحب العمل.", "Apply off the platform: open the contact details and send your CV directly to the employer."),
    L3("احفظ الوظائف لتعود إليها، ودقّق سيرتك الذاتية بمدقق السيرة الهندسية قبل التقديم.", "احفظي الوظائف لتعودي إليها، ودقّقي سيرتك الذاتية بمدقق السيرة الهندسية قبل التقديم.", "Save jobs to come back to, and run your CV through the engineering CV audit before applying."),
  ], action: [L3("افتح الوظائف", "افتحي الوظائف", "Open Jobs"), () => app.setTab("jobs")] });
  if (hr) S.push({ id: "cv", icon: Calculator, title: L3("الأدوات: مراجعة السير الذاتية", null, "Tools: CV review"), points: [
    L3("حساب الموارد البشرية يرى من الأدوات مراجعة السير الذاتية فقط: افحص سيرة المرشح بمعايير المقاولين والاستشاريين على جهازك، دون رفعها لأي خادم.", null, "An HR account sees only the CV review among the tools: check a candidate's CV against contractor and consultant standards on your device, without uploading it anywhere."),
  ], action: [L3("افتح الأدوات", "افتحي الأدوات", "Open Tools"), () => app.setTab("tools")] });
  if (!hr) S.push({ id: "site", icon: Calculator, title: L3("أدوات الموقع والمكتب الفني", null, "Site and technical office tools"), points: [
    L3("حصر الخرسانة (الحجم والأسمنت والرمل والزلط)، وأوزان الحديد وعدد أسياخ الـ 12 م، وحصر الطوب والبلوك، وتحويل الوحدات ومنها الفدان والقيراط.", null, "Concrete take-off (volume, cement, sand, gravel), rebar weights and 12 m bars to order, brick and block take-off, and unit conversion including feddan and qirat."),
    L3("قوائم فحص واستلام الأعمال (QA/QC): تُحفظ على جهازك أثناء الملء وتُصدَّر تقرير PDF للتوقيع والمشاركة.", null, "Work inspection checklists (QA/QC): saved on your device as you fill them in and exported as a PDF report to sign and share."),
    L3("كلها تقديرات — المرجع دائمًا اللوحات والمواصفات المعتمدة للمشروع.", null, "All are estimates — the approved project drawings and specifications always govern."),
  ], action: [L3("افتح الأدوات", "افتحي الأدوات", "Open Tools"), () => app.setTab("tools")] });
  if (!sup && !hr) S.push({ id: "tools", icon: Calculator, title: L3("الأدوات", null, "Tools"), points: [
    L3("كل أرقام الرواتب في التطبيق صافية — ما يصل حسابك بعد الضرائب والتأمينات. حاسبة الصافي والإجمالي تحوّل بينهما عند الحاجة.", null, "Every salary figure in the app is net — what reaches your account after tax and social insurance. The net ⇄ gross calculator converts when you need it."),
    L3("مقارن العروض وسكريبت التفاوض وتوقيت الزيادة: قرارات مبنية على أرقام.", null, "Offer comparer, negotiation script and raise timing: decisions built on numbers."),
    L3("خريطة المسار، وفاحص العقد، وتكلفة الانتقال، والعلاوة مقابل التضخم.", null, "Career path map, contract checker, relocation cost, and raise vs inflation."),
  ], action: [L3("افتح الأدوات", "افتحي الأدوات", "Open Tools"), () => app.goMarket("tools")] });
  S.push({ id: "dm", icon: MessageCircle, title: L3("الرسائل الخاصة", null, "Direct messages"), points: [
    co ? L3("تراسل الشركات المهندس بخصوص وظيفة مطابقة، أو إذا فعّل «متاح لرسائل الشركات».", null, "Companies message engineers about a matching job, or if they turned on “Open to company messages”.")
      : sup ? L3("تراسل زملاءك المهندسين والمشرفين؛ الرسائل مع الشركات غير متاحة لحساب مشرف الموقع.", "تراسلين زملاءك المهندسين والمشرفين؛ الرسائل مع الشركات غير متاحة لحساب مشرف الموقع.", "Message fellow engineers and supervisors; messaging companies isn’t available to Site Supervisor accounts.")
      : L3("تراسل زملاءك بحرية، والشركات تراسلك فقط بخصوص وظيفة مطابقة أو إذا فعّلت «متاح لرسائل الشركات».", "تراسلين زملاءك بحرية، والشركات تراسلك فقط بخصوص وظيفة مطابقة أو إذا فعّلتِ «متاح لرسائل الشركات».", "Message colleagues freely; companies can message you only about a matching job, or if you turned on “Open to company messages”."),
    L3("الهوية التي تبدأ بها المحادثة تثبت بعد أول رسالة، فلا تلتقي هويتاك أبدًا.", "الهوية التي تبدئين بها المحادثة تثبت بعد أول رسالة، فلا تلتقي هويتاك أبدًا.", "The identity you start a conversation with is fixed after the first message, so your two identities never meet."),
    L3("يمكنك حظر أي محادثة أو الإبلاغ عنها من أعلى المحادثة.", "يمكنكِ حظر أي محادثة أو الإبلاغ عنها من أعلى المحادثة.", "You can block or report any conversation from the top of the chat."),
  ], action: [L3("افتح الرسائل", "افتحي الرسائل", "Open Messages"), () => app.setTab("inbox")] });
  S.push({ id: "roles", icon: ShieldCheck, title: L3("الأدوار والصلاحيات", null, "Roles & permissions"), points: [
    L3("مهندس: كل الأقسام وكل الأرقام.", null, "Engineer: every section and every figure."),
    L3("الموارد البشرية وأصحاب العمل: نطاقات السوق الإجمالية فقط، دون أي راتب فردي.", null, "HR and employers: aggregated market ranges only, with no individual salaries."),
    L3("مشرف الموقع: المجتمع والرسائل وأدوات الموقع وقوائم الفحص فقط — لا رواتب ولا أي أرقام مالية.", null, "Site Supervisor: community, messages, site tools and inspection checklists only — no salaries and no financial figures."),
  ], action: [L3("خريطة الصلاحيات", null, "Permissions map"), () => app.push({ type: "permissions" })] });
  S.push({ id: "privacy", icon: LockKeyhole, title: L3("التوثيق والخصوصية", null, "Verification & privacy"), points: [
    L3("التوثيق اختياري: ترفع كارنيه النقابة وشهادة التخرج، فيراجعهما فريق الإدارة يدويًا، ثم تُحذف المستندات نهائيًا فور المراجعة — قُبل الطلب أو رُفض — ولا تُشارك مع أي أحد.", "التوثيق اختياري: ترفعين كارنيه النقابة وشهادة التخرج، فيراجعهما فريق الإدارة يدويًا، ثم تُحذف المستندات نهائيًا فور المراجعة — قُبل الطلب أو رُفض — ولا تُشارك مع أي أحد.", "Verification is optional: you upload your Syndicate card and graduation certificate, our administration team reviews them by hand, and the documents are permanently deleted right after the review — approved or rejected — and never shared with anyone."),
    L3("حسابات جهات العمل (الموارد البشرية وأصحاب العمل) لا توثَّق — تظهر بشارة دورها.", null, "Employer accounts (HR and employers) aren't verified — they show their role badge instead."),
    L3("بريدك وكلمة مرورك للدخول فقط، ولا يظهران لأي عضو أو شركة.", null, "Your email and password are for signing in only, and are never shown to any member or company."),
  ], action: [L3("كيف نحمي هويتك؟", null, "How do we protect your identity?"), () => app.openSheet("privacy")] });
  S.push({ id: "points", icon: Award, title: L3("المستوى والنقاط", null, "Level & points"), points: [
    L3("تكسب نقاطًا مع كل مساهمة: منشور (+5)، رد (+10)، تقييم شركة (+15)، ومشاركة راتب (+50).", "تكسبين نقاطًا مع كل مساهمة: منشور (+5)، رد (+10)، تقييم شركة (+15)، ومشاركة راتب (+50).", "You earn points for every contribution: a post (+5), a reply (+10), a company review (+15) and a salary share (+50)."),
    L3("مستواك يظهر حول صورتك في الأعلى ويمنح ردودك ثقة أكبر: مبتدئ ← مساهم ← خبير ← مرجع.", null, "Your level shows around your photo at the top and gives your replies more weight: Beginner → Contributor → Expert → Authority."),
  ] });
  S.push({ id: "prefs", icon: Languages, title: L3("اللغة والمظهر", null, "Language & appearance"), points: [
    L3("بدّل بين العربية والإنجليزية من الإعدادات — تتبدّل الواجهة واتجاهها فورًا دون أن تفقد مكانك.", "بدّلي بين العربية والإنجليزية من الإعدادات — تتبدّل الواجهة واتجاهها فورًا دون أن تفقدي مكانك.", "Switch between Arabic and English in Settings — the interface and its direction change instantly, without losing your place."),
    L3("اللغة تخص الواجهة فقط: المنشورات والتعليقات والردود والرسائل تبقى كما كتبها أصحابها.", null, "The language applies to the interface only: posts, comments, replies and messages stay exactly as their authors wrote them."),
    L3("بدّل بين الفاتح والداكن من زر الشمس والقمر أعلى الرئيسية، أو اختر «تلقائي» ليتبع جهازك.", "بدّلي بين الفاتح والداكن من زر الشمس والقمر أعلى الرئيسية، أو اختاري «تلقائي» ليتبع جهازك.", "Switch between light and dark with the sun & moon button at the top of Home, or choose “Auto” to follow your device."),
  ], action: [L3("افتح الإعدادات", "افتحي الإعدادات", "Open Settings"), () => app.push({ type: "settings" })] });
  return S;
}

export const GUIDE_HEAD = {
  title: L3("دليل الاستخدام", null, "User guide"),
  lead: L3("كل ما تحتاجه لتستفيد من EngSpace: الأقسام، والهويتان، وكيف تقرأ أرقام الرواتب وتفاوض بها.", "كل ما تحتاجينه لتستفيدي من EngSpace: الأقسام، والهويتان، وكيف تقرئين أرقام الرواتب وتفاوضين بها.", "Everything you need to get the most out of EngSpace: the sections, the two identities, and how to read salary figures and negotiate with them."),
  tour: L3("ابدأ الجولة التفاعلية", "ابدئي الجولة التفاعلية", "Start the interactive tour"),
};

export function GuideScreen({ app }: any) {
  const sections = guideSections(app); const [open, setOpen] = useState<any>(sections[0].id); const t = (x?: any) => say(app, x);
  return (
    <div translate="no" lang={app.lang} className="py-4 space-y-3">
      <Panel className="p-4 overflow-hidden relative">
        <div aria-hidden="true" className="absolute -top-10 -end-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.18), transparent 70%)" }} />
        <span className="relative grid place-items-center w-11 h-11 rounded-2xl bg-wash text-accent"><BookOpen size={20} /></span>
        <h2 className="relative mt-3 text-[17px] font-medium">{t(GUIDE_HEAD.title)}</h2>
        <p className="relative mt-1 text-[12.5px] leading-relaxed text-ink-2">{t(GUIDE_HEAD.lead)}</p>
        <Primary onClick={app.startTour} className="relative mt-3 h-11 w-full press"><Compass size={16} /> {t(GUIDE_HEAD.tour)}</Primary>
      </Panel>
      <div className="space-y-2 stagger">
        {sections.map((s) => { const on = open === s.id; const I = s.icon; return (
          <section key={s.id} className={`rounded-2xl bg-surface border transition-colors ${on ? "border-accent/30" : "border-line"}`}>
            <h3><button type="button" aria-expanded={on} aria-controls={`guide-${s.id}`} onClick={() => setOpen(on ? null : s.id)} className="press w-full flex items-center gap-3 p-3.5 text-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className={`grid place-items-center w-9 h-9 rounded-xl shrink-0 transition-colors ${on ? "bg-solid text-white" : "bg-wash text-accent"}`}><I size={16} /></span>
              <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{t(s.title)}</span>
              <ChevronDown size={16} className={`text-ink-3 transition-transform duration-300 ${on ? "rotate-180" : ""}`} />
            </button></h3>
            {on && <div id={`guide-${s.id}`} className="guide-open px-4 pb-4">
              <ul className="space-y-2">{s.points.map((x, i) => <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-2"><span aria-hidden="true" className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" /><span>{t(x)}</span></li>)}</ul>
              {s.action && <Secondary onClick={s.action[1]} className="mt-3 h-10 px-3 text-[12.5px] press">{t(s.action[0])} <Forward size={14} /></Secondary>}
            </div>}
          </section>
        ); })}
      </div>
    </div>
  );
}


// ---- the interactive tour: a spotlight that walks across the real interface, switching tabs as it explains them ----
export function tourSteps(app?: any) {
  const co = app.isCo, sup = app.moneyAccess === "none", hr = app.profile && app.profile.role === "hr";
  const TAB: any = {
    home: [L3("الرئيسية", null, "Home"), co ? L3("ملخّص حساب شركتك: إعلاناتك النشطة ومدى وصولها، ونبض السوق في التخصصات التي توظّف لها.", "ملخّص حساب شركتك: إعلاناتك النشطة ومدى وصولها، ونبض السوق في التخصصات التي توظّفين لها.", "A summary of your company account: your active ads and their reach, and the market pulse in the disciplines you hire for.")
      : L3("ملخّص مرتّب حسب تخصصك ومكانك وهدفك: نطاق راتبك المتوقع، والوظائف المطابقة لك، والنقاشات الأنشط في مجالك.", null, "A summary arranged around your discipline, location and goal: your expected salary range, jobs matching you, and the most active discussions in your field.")],
    community: [L3("المجتمع", null, "Community"), sup ? L3("اسأل زملاءك وشارك خبرة الموقع باسمك أو بمعرّف مجهول. الغرف تجمع كل موضوع، و«مفيد» يرفع أفضل الردود.", "اسألي زملاءك وشاركي خبرة الموقع باسمك أو بمعرّف مجهول. الغرف تجمع كل موضوع، و«مفيد» يرفع أفضل الردود.", "Ask colleagues and share site experience under your name or an anonymous ID. Rooms group every topic, and “Helpful” lifts the best replies.")
      : L3("اسأل وشارك تجربتك باسمك أو بمعرّف مجهول — تختار قبل كل نشر. الغرف تجمع كل تخصص، و«مفيد» يرفع أفضل الردود، وصاحب السؤال يعتمد أفضل إجابة.", "اسألي وشاركي تجربتك باسمك أو بمعرّف مجهول — تختارين قبل كل نشر. الغرف تجمع كل تخصص، و«مفيد» يرفع أفضل الردود، وصاحب السؤال يعتمد أفضل إجابة.", "Ask and share your experience under your name or an anonymous ID — you choose before every post. Rooms group each discipline, “Helpful” lifts the best replies, and the question’s author marks the accepted answer.")],
    jobs: [L3("الوظائف", null, "Jobs"), co ? L3("انشر وظيفة بتصنيف دقيق فيصل إشعار فوري للمطابقين تمامًا، وتابع المشاهدات ومن فتحوا بيانات التواصل.", "انشري وظيفة بتصنيف دقيق فيصل إشعار فوري للمطابقين تمامًا، وتابعي المشاهدات ومن فتحوا بيانات التواصل.", "Post a job with precise classification so exact matches get an instant notification, and track views and who opened your contact details.")
      : L3("إعلانات مصنّفة بالتخصص والمسار والمستوى والمحافظة، ولكل إعلان نطاق راتب تقديري. وتقدّم مباشرة لدى صاحب العمل.", "إعلانات مصنّفة بالتخصص والمسار والمستوى والمحافظة، ولكل إعلان نطاق راتب تقديري. وتقدّمين مباشرة لدى صاحب العمل.", "Ads classified by discipline, track, level and governorate, each with an estimated salary range. You apply directly with the employer.")],
    market: co ? [L3("السوق — رؤية إجمالية", null, "Market — aggregated view"), L3("نطاقات السوق الإجمالية فقط — لا يظهر أي راتب فردي أبدًا — ونطاقات مسمّيات شركتك متى توفرت 30 مشاركة على الأقل.", null, "Aggregated market ranges only — no individual salary is ever shown — plus ranges for your company’s job titles once there are at least 30 contributions.")]
      : [L3("السوق: الرواتب والشركات", null, "Market: salaries & companies"), L3("الشريط من الشريحة المئوية 10 إلى 90، والنقطة هي الوسيط. رشِّح بتخصصك ومسارك ومستواك ومحافظتك، وشارك راتبك دون كشف هويتك لتفتح التفاصيل.", "الشريط من الشريحة المئوية 10 إلى 90، والنقطة هي الوسيط. رشِّحي بتخصصك ومسارك ومستواك ومحافظتك، وشاركي راتبك دون كشف هويتك لتفتحي التفاصيل.", "The bar runs from the 10th to the 90th percentile and the dot is the median. Filter by your discipline, track, level and governorate, and share your salary anonymously to unlock the details.")],
    tools: hr ? [L3("الأدوات", null, "Tools"), L3("مراجعة السير الذاتية للمرشحين بمعايير السوق الهندسي — على جهازك.", null, "Review candidates' CVs against engineering-market standards — on your device.")] : sup ? [L3("أدوات الموقع", null, "Site tools"), L3("حصر الخرسانة والحديد والمباني، وتحويل الوحدات، وقوائم فحص واستلام الأعمال مع تقرير PDF للتوقيع.", null, "Concrete, rebar and masonry take-off, unit conversion, and work inspection checklists with a PDF report for signature.")] : [L3("الأدوات", null, "Tools"), L3("حاسبة الصافي، ومقارن العروض، وسكريبت التفاوض، وتوقيت الزيادة، وغيرها — قرارات مبنية على أرقام.", null, "Net calculator, offer comparer, negotiation script, raise timing and more — decisions built on numbers.")],
    inbox: [L3("الرسائل", null, "Messages"), L3("رسائل خاصة ضمن قواعد واضحة تحمي الطرفين، وإشعارات الردود والوظائف المطابقة. الهوية التي تبدأ بها المحادثة تثبت بعد أول رسالة.", "رسائل خاصة ضمن قواعد واضحة تحمي الطرفين، وإشعارات الردود والوظائف المطابقة. الهوية التي تبدئين بها المحادثة تثبت بعد أول رسالة.", "Direct messages under clear rules that protect both sides, plus notifications for replies and matching jobs. The identity you start a chat with is fixed after the first message.")],
  };
  const steps: any = [{ id: "hello", icon: Compass, title: L3("أهلًا بك في EngSpace", "أهلًا بكِ في EngSpace", "Welcome to EngSpace"), body: L3("جولة قصيرة على أهم الأقسام — أقل من دقيقة. يمكنك تخطيها الآن وإعادتها في أي وقت من الإعدادات.", "جولة قصيرة على أهم الأقسام — أقل من دقيقة. يمكنكِ تخطيها الآن وإعادتها في أي وقت من الإعدادات.", "A short tour of the main sections — under a minute. You can skip it now and replay it anytime from Settings.") }];
  steps.push({ id: "tabbar", target: "tabbar", icon: Layers, title: L3("التنقل الرئيسي", null, "Main navigation"), body: sup ? L3("حساب مشرف الموقع فيه ثلاثة أقسام: المجتمع وأدوات الموقع والرسائل. لا رواتب ولا أرقام مالية في أي مكان.", null, "A Site Supervisor account has three sections: Community, site Tools and Messages. No salaries and no financial figures anywhere.")
    : L3("كل أقسام التطبيق في هذا الشريط. القسم المفتوح مضيء، والرقم على «الرسائل» يعني أن جديدًا في انتظارك.", null, "Every section of the app is in this bar. The open section is highlighted, and a number on “Messages” means something new is waiting.") });
  app.tabs.forEach((t) => { const d = TAB[t.id]; if (d) steps.push({ id: "tab-" + t.id, target: "tab-" + t.id, tab: t.id, icon: t.icon, title: d[0], body: d[1] }); });
  steps.push({ id: "theme", target: "theme", icon: Moon, title: L3("الفاتح والداكن", null, "Light & dark"), body: L3("بدّل المظهر بلمسة من هنا. يُحفظ اختيارك ويبقى بعد إعادة التحميل.", "بدّلي المظهر بلمسة من هنا. يُحفظ اختيارك ويبقى بعد إعادة التحميل.", "Switch the appearance with one tap here. Your choice is saved and stays after reloading.") });
  steps.push({ id: "settings", target: "settings", icon: Settings, title: L3("الإعدادات", null, "Settings"), body: L3("اللغة (العربية / English)، والمظهر، والإشعارات والخصوصية — ومنها تعيد هذه الجولة أو تفتح دليل الاستخدام.", "اللغة (العربية / English)، والمظهر، والإشعارات والخصوصية — ومنها تعيدين هذه الجولة أو تفتحين دليل الاستخدام.", "Language (Arabic / English), appearance, notifications and privacy — and from here you can replay this tour or open the user guide.") });
  steps.push({ id: "profile", target: "profile", icon: UserRound, title: L3("حسابك", null, "Your account"), body: L3("هويتاك العلنية والمجهولة، ومستواك ونقاطك، والتوثيق الاختياري، وصورة حسابك.", null, "Your public and anonymous identities, your level and points, optional verification and your account photo.") });
  steps.push({ id: "done", icon: Sparkles, title: L3("جاهز للانطلاق", "جاهزة للانطلاق", "Ready to go"), body: L3("للتفاصيل الكاملة لكل ميزة — وكيف تقرأ أرقام الرواتب وتفاوض بها — افتح «دليل الاستخدام» من الإعدادات.", "للتفاصيل الكاملة لكل ميزة — وكيف تقرئين أرقام الرواتب وتفاوضين بها — افتحي «دليل الاستخدام» من الإعدادات.", "For the full details of every feature — and how to read salary figures and negotiate with them — open the “User guide” in Settings."), guide: true });
  return steps;
}

export const TOUR_UI = {
  skip: L3("تخطي الجولة", null, "Skip tour"), back: L3("السابق", null, "Back"), guide: L3("دليل الاستخدام", null, "User guide"),
  start: L3("ابدأ الجولة", "ابدئي الجولة", "Start the tour"), next: L3("التالي", null, "Next"), finish: L3("ابدأ استخدام EngSpace", "ابدئي استخدام EngSpace", "Start using EngSpace"),
};

export function Tour({ app, onClose }: any) {
  const steps = tourSteps(app); const [i, setI] = useState(0); const [geo, setGeo] = useState<any>(null); const box = useRef<any>(null); const nextBtn = useRef<any>(null); const home = useRef<any>(app.tab);
  const s = steps[Math.min(i, steps.length - 1)]; const last = i >= steps.length - 1; const rtl = app.lang !== "en"; const t = (x?: any) => say(app, x);
  const measure = () => { const b = box.current; if (!b) return; const B = b.getBoundingClientRect(); const el = s.target && b.parentElement ? b.parentElement.querySelector(`[data-tour="${s.target}"]`) : null; const R = el ? el.getBoundingClientRect() : null; setGeo({ W: B.width, H: B.height, r: R && R.width ? { x: R.left - B.left, y: R.top - B.top, w: R.width, h: R.height } : null }); };
  const mRef = useRef<any>(measure); mRef.current = measure;
  const finish = (then?: any) => { markTourSeen(); if (app.tab !== home.current && app.tabs.some((x) => x.id === home.current)) app.setTab(home.current); onClose(); if (then) then(); };
  const next = () => (last ? finish() : setI((k) => k + 1)); const back = () => setI((k) => Math.max(0, k - 1));
  useEffect(() => {
    if (s.tab && app.tab !== s.tab) app.setTab(s.tab);
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => mRef.current()); }); const t1 = setTimeout(() => mRef.current(), 380), t2 = setTimeout(() => mRef.current(), 760);
    try { if (nextBtn.current) nextBtn.current.focus({ preventScroll: true }); } catch (e) {}
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [i]);
  useEffect(() => { const b = box.current; if (!b || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(() => mRef.current()); ro.observe(b); return () => ro.disconnect(); }, []);
  const keys = useRef<any>(null); keys.current = (e) => { if (e.key === "Escape") finish(); else if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) next(); else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) back(); };
  useEffect(() => { const onKey = (e?: any) => keys.current(e); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const pad = 6; const W = geo ? geo.W : 390, H = geo ? geo.H : 800; const r = geo && geo.r;
  const hole = r ? { left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2 } : { left: W / 2, top: H / 2, width: 0, height: 0 };
  const below = r && hole.top + hole.height + 250 < H; const I = s.icon;
  const card = (
    <div key={s.id} translate="no" lang={app.lang} className="tour-card p-4 rounded-3xl bg-surface border border-line-2 shadow-float">
      <div className="flex items-center gap-2.5"><span className="grid place-items-center w-9 h-9 rounded-xl bg-wash text-accent shrink-0">{I && <I size={17} />}</span><span className="flex-1 text-[11px] text-ink-3">{rtl ? <>الخطوة <Num>{i + 1}</Num> من <Num>{steps.length}</Num></> : <>Step <Num>{i + 1}</Num> of <Num>{steps.length}</Num></>}</span>{!last && <button type="button" onClick={() => finish()} className="h-8 px-2.5 rounded-full text-[11.5px] text-ink-2 hover:text-ink hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t(TOUR_UI.skip)}</button>}</div>
      <h2 id="tour-title" className="mt-2.5 text-[16px] font-medium leading-snug">{t(s.title)}</h2>
      <p id="tour-body" className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{t(s.body)}</p>
      <div aria-hidden="true" className="mt-3 flex gap-1">{steps.map((x, k) => <span key={x.id} className={`h-1 rounded-full transition-all duration-300 ${k === i ? "flex-[3] bg-accent" : k < i ? "flex-1 bg-accent/45" : "flex-1 bg-track"}`} />)}</div>
      <div className="mt-3 flex items-center gap-2">
        {i > 0 && <Secondary onClick={back} className="h-10 px-3 text-[12.5px] press"><Back size={15} /> {t(TOUR_UI.back)}</Secondary>}
        {s.guide && <Secondary onClick={() => finish(() => app.push({ type: "guide" }))} className="h-10 px-3 text-[12.5px] press"><BookOpen size={15} /> {t(TOUR_UI.guide)}</Secondary>}
        <span className="flex-1" />
        <button ref={nextBtn} type="button" onClick={next} className={`${BTN} btn-primary h-10 px-4 text-[13px] press`}>{t(last ? TOUR_UI.finish : i === 0 ? TOUR_UI.start : TOUR_UI.next)} {!last && <Forward size={15} />}</button>
      </div>
    </div>
  );
  return (
    <div ref={box} className="absolute inset-0 z-[45]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div aria-hidden="true" className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div aria-hidden="true" className="tour-hole absolute rounded-2xl pointer-events-none" style={{ ...hole, boxShadow: "0 0 0 200vmax rgb(var(--scrim) / 0.66)" }}>{r && <span className="tour-ring absolute inset-0 rounded-2xl" />}</div>
      {!r ? <div className="absolute inset-0 flex items-center px-3 pointer-events-none"><div className="w-full pointer-events-auto">{card}</div></div>
        : <div className="absolute inset-x-3" style={below ? { top: hole.top + hole.height + 12 } : { bottom: H - hole.top + 12 }}>{card}</div>}
    </div>
  );
}
