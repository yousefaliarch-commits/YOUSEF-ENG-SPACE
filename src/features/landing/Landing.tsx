// =====================================================================
//  The public page (engspace.org with nothing after it — app/entry.ts decides who sees it; never the phone apps).
//  · It shows the product instead of describing it: the first screen is a working tool on drawing paper, the documents
//    below it are drawn live by the app's own export engine, and the tool list is the registry itself.
//  · Laid out as a building section: every part of the page sits on a level (+0.00, +3.20 …), marked the way a section
//    drawing marks its floors.
//  · Arabic first; English comes from the dictionary like every screen. The page is its own chunk — a member opening
//    the app never downloads it, and the heavy parts (the document kit, the tools) load only when scrolled to.
// =====================================================================
import { useRef, type ReactNode } from "react";
import { ArrowLeft, Download, Globe, Languages, Moon, PenLine, Sigma, SlidersHorizontal, Smartphone, Sun, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toolsForRole } from "../../tools/gate";
import { PACKS } from "../../tools/registry";
import { LevelMark } from "../../ui/drafting";
import { ArchMark, Num, Wordmark } from "../../ui/primitives";
import { TOOL_ICONS } from "../tools/icons";
import { DocShowcase } from "./DocShowcase";
import { MiniTool } from "./MiniTool";

// where the phone builds are downloaded from: set at build time (the «Deploy website» workflow resolves the latest
// release's files); without it both buttons lead to the releases page
const env = import.meta.env as Record<string, string | undefined>;
export const RELEASES_URL = "https://github.com/yousefaliarch-commits/YOUSEF-ENG-SPACE/releases";
export const downloadLinks = (e: Record<string, string | undefined> = env) => {
  const ok = (u: string | undefined) => (u && /^https:\/\/[\w.-]+\/[\w./%-]+$/.test(u) ? u : RELEASES_URL);
  return { apk: ok(e.VITE_APK_URL), ipa: ok(e.VITE_IPA_URL) };
};

const WRAP = "mx-auto w-full max-w-[1180px] px-4 sm:px-8";
const PRIMARY = "press inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl btn-primary text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const SECONDARY = "press inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-surface border border-line-2 text-[14px] font-medium hover:border-line-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// a level of the page, marked like a floor on a section drawing
function Level({ value, kicker, title, children }: { value: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <header>
      <div className="flex items-center gap-3" aria-hidden="true">
        <LevelMark value={value} />
        <span className="h-px flex-1 bg-line-2" />
      </div>
      <p className="mt-6 text-[12.5px] font-medium text-accent">{kicker}</p>
      <h2 className="mt-2 max-w-3xl text-[clamp(24px,3.4vw,38px)] font-semibold leading-[1.2]">{title}</h2>
      {children && <p className="mt-3 max-w-2xl text-[15px] text-ink-2 leading-relaxed">{children}</p>}
    </header>
  );
}

const PRINCIPLES: [LucideIcon, string, string][] = [
  [Sigma, "يُريك الحساب", "كل ناتج معه خطواته وبند الكود الذي استند إليه. وما لم يُتحقق منه يحمل علامة ⚑ ولا يُسمّى «مطابقًا»."],
  [SlidersHorizontal, "كل قيمة بيدك", "الرتبة والخلطة والهالك وقواعد خصم الفتحات ونسبة الضريبة والتأمين — لا رقم مفروض عليك، وإعداداتك تُحفظ قالبًا لمكتبك."],
  [PenLine, "مستند بهويتك", "خرطوشة باسم شركتك، ترقيم ومراجعات بنظامك، وخانات توقيع تحددها أنت. لا اسم للتطبيق على أي ورقة."],
  [WifiOff, "يعمل في الموقع", "يحفظ على هاتفك أولًا ويعمل بلا إنترنت، ثم يتزامن مع حسابك ومع كمبيوتر المكتب لحظيًا."],
];

export function Landing({ lang, setLang, mode, setTheme, onEnter }: {
  lang: string; setLang: (l: string) => void; mode: string; setTheme: (t: string) => void; onEnter: () => void;
}) {
  const docs = useRef<HTMLElement | null>(null);
  const tools = useRef<HTMLElement | null>(null);
  const get = useRef<HTMLElement | null>(null);
  // in-page moves scroll; they never write a fragment (the address after # is the app's)
  const go = (ref: { current: HTMLElement | null }) => () => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const all = toolsForRole("engineer").filter((t) => t.status !== "soon");
  const packs = PACKS.map((p) => ({ p, list: all.filter((t) => t.pack === p.id) })).filter((x) => x.list.length);
  const links = downloadLinks();
  const dark = mode === "dark";
  return (
    <div className="land min-h-dvh bg-canvas text-ink" data-landing>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/[.94]">
        <div className={`${WRAP} h-16 flex items-center gap-3`}>
          <span className="flex items-center gap-2.5 shrink-0"><ArchMark size={24} /><Wordmark size="text-[19px]" /></span>
          <nav aria-label="أقسام الصفحة" className="hidden md:flex items-center gap-1 ms-6 text-[13.5px] text-ink-2">
            <button type="button" onClick={go(docs)} className="press h-10 px-3 rounded-lg hover:text-ink hover:bg-surface transition-colors">المستندات</button>
            <button type="button" onClick={go(tools)} className="press h-10 px-3 rounded-lg hover:text-ink hover:bg-surface transition-colors">الأدوات</button>
            <button type="button" onClick={go(get)} className="press h-10 px-3 rounded-lg hover:text-ink hover:bg-surface transition-colors">التحميل</button>
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <button type="button" translate="no" data-landing-lang onClick={() => setLang(lang === "en" ? "ar" : "en")} aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"} className="press grid place-items-center w-10 h-10 rounded-full text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Languages size={18} /></button>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"} className="press grid place-items-center w-10 h-10 rounded-full text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button type="button" data-landing-enter onClick={onEnter} className="press inline-flex items-center h-10 px-4 rounded-xl btn-primary text-[13.5px] font-medium">ادخل التطبيق</button>
          </div>
        </div>
      </header>

      <main>
        {/* +0.00 — the working tool */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="land-paper absolute inset-0" />
          <div className={`${WRAP} relative grid items-center gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] pt-10 pb-16 lg:pt-16 lg:pb-24`}>
            <div className="stagger">
              <p className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-surface border border-line-2 text-[12.5px] text-ink-2"><LevelMark value="+0.00" /> محطة عمل المهندس — للموقع والمكتب الفني</p>
              <h1 className="mt-5 text-[clamp(32px,5.4vw,58px)] font-bold leading-[1.14]">من الحصر إلى المستخلص، بأرقام تُريك حسابها.</h1>
              <p className="mt-5 max-w-xl text-[16px] text-ink-2 leading-[1.85]">
                <Num className="text-ink font-medium">{all.length}</Num> أداة هندسية لمهندسي مصر: كل رقم معه طريقة حسابه، وكل قيمة تعدّلها بنفسك، والمستند يخرج PDF و Word و Excel بمعادلات حية — بخرطوشة شركتك.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" data-landing-start onClick={onEnter} className={PRIMARY}>افتح التطبيق مجانًا <ArrowLeft size={17} className="ltr:-scale-x-100" /></button>
                <button type="button" onClick={go(get)} className={SECONDARY}><Download size={17} /> أندرويد و iPhone</button>
              </div>
              <p className="mt-5 text-[12.5px] text-ink-3 leading-relaxed">الحاسبة المجاورة تعمل الآن بلا حساب · مستنداتك تُحفظ على جهازك أولًا</p>
            </div>
            <MiniTool onOpenApp={onEnter} />
          </div>
        </section>

        {/* +3.20 — the documents */}
        <section ref={docs} className="py-16 lg:py-24 border-t border-line scroll-mt-16" data-landing-docs>
          <div className={WRAP}>
            <Level value="+3.20" kicker="المستندات" title="ورقة تخرج باسم شركتك — جاهزة للاستشاري.">
              هذه صفحات حقيقية يرسمها التطبيق أمامك الآن من بيانات نموذجية، بنفس محرك التصدير: خرطوشة، جدول مراجعات، توقيعات، وأرقام تطابق ملف Excel الحي.
            </Level>
            <div className="mt-10"><DocShowcase /></div>
          </div>
        </section>

        {/* +6.40 — what it is built on */}
        <section className="py-16 lg:py-24 border-t border-line bg-surface/40">
          <div className={WRAP}>
            <Level value="+6.40" kicker="لماذا يثق به المهندس" title="أداة تحترم توقيعك على المستند." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(([Icon, title, text]) => (
                <article key={title} className="p-5 rounded-2xl bg-surface border border-line">
                  <span className="grid place-items-center w-11 h-11 rounded-xl bg-wash text-accent"><Icon size={20} /></span>
                  <h3 className="mt-4 text-[16px] font-medium">{title}</h3>
                  <p className="mt-2 text-[13.5px] text-ink-2 leading-[1.8]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* +9.60 — the tools, from the registry itself */}
        <section ref={tools} className="py-16 lg:py-24 border-t border-line scroll-mt-16" data-landing-tools>
          <div className={WRAP}>
            <Level value="+9.60" kicker="الأدوات" title="من أول صبّة إلى آخر مستخلص.">
              للموقع: الخرسانة والحديد والميزانية واليومية والتصاريح. للمكتب الفني: الحصر والمستخلصات وأوامر التغيير وطلبات المعلومات وسجلاتها. ومعها شبكة المهندسين: رواتب بالصافي وتقييمات شركات، بهوية مجهولة.
            </Level>
            {/* columns, not a grid: a pack with one tool and a pack with seven sit together without empty boxes */}
            <div className="mt-10 gap-4 columns-1 sm:columns-2 lg:columns-3">
              {packs.map(({ p, list }) => (
                <article key={p.id} className="mb-4 break-inside-avoid p-5 rounded-2xl bg-surface border border-line">
                  <h3 className="text-[15px] font-medium">{p.name}</h3>
                  <p className="mt-0.5 text-[12px] text-ink-3">{p.desc}</p>
                  <ul className="mt-3.5 space-y-2">
                    {list.map((t) => {
                      const Icon = (TOOL_ICONS[t.icon] as LucideIcon | undefined) || Sigma;
                      return (
                        <li key={t.id} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                          <Icon size={16} className="shrink-0 text-accent" />
                          <span className="min-w-0">{t.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* +12.80 — get it */}
        <section ref={get} className="py-16 lg:py-24 border-t border-line bg-surface/40 scroll-mt-16" data-landing-get>
          <div className={WRAP}>
            <Level value="+12.80" kicker="التحميل" title="على المتصفح، وعلى هاتفك في الموقع." />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <article className="p-6 rounded-2xl bg-surface border border-accent/30 flex flex-col">
                <Globe size={22} className="text-accent" />
                <h3 className="mt-4 text-[17px] font-medium">المتصفح</h3>
                <p className="mt-2 flex-1 text-[13.5px] text-ink-2 leading-[1.8]">بلا تثبيت. على شاشة المكتب: شريط جانبي، لوحتان، معاينة A4 حية بجوار ما تكتب، ولوحة أوامر بـ <bdi dir="ltr" className="font-grotesk">Ctrl K</bdi>.</p>
                <button type="button" onClick={onEnter} className={`${PRIMARY} mt-5`}>افتح التطبيق</button>
              </article>
              <article className="p-6 rounded-2xl bg-surface border border-line flex flex-col">
                <Smartphone size={22} className="text-accent" />
                <h3 className="mt-4 text-[17px] font-medium">أندرويد</h3>
                <p className="mt-2 flex-1 text-[13.5px] text-ink-2 leading-[1.8]">نسخة تجريبية بملف APK: نزّله وافتحه واسمح بالتثبيت من هذا المصدر. يتحدّث محتواه تلقائيًا مع كل إصدار.</p>
                <a href={links.apk} data-landing-apk rel="noopener" className={`${SECONDARY} mt-5`}><Download size={17} /> تحميل لأندرويد</a>
              </article>
              <article className="p-6 rounded-2xl bg-surface border border-line flex flex-col">
                <Smartphone size={22} className="text-accent" />
                <h3 className="mt-4 text-[17px] font-medium">iPhone</h3>
                <p className="mt-2 flex-1 text-[13.5px] text-ink-2 leading-[1.8]">نسخة تجريبية تُثبَّت من الكمبيوتر بملف IPA حتى صدور نسخة المتجر. أو افتح الموقع في Safari وأضِفه إلى الشاشة الرئيسية.</p>
                <a href={links.ipa} data-landing-ipa rel="noopener" className={`${SECONDARY} mt-5`}><Download size={17} /> ملف iPhone</a>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${WRAP} py-8 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-3`}>
          <span className="flex items-center gap-2"><ArchMark size={18} /><Wordmark size="text-[15px]" /></span>
          <span>صُنع لمهندسي مصر — الرواتب بالصافي دائمًا، والهوية مجهولة.</span>
        </div>
      </footer>
    </div>
  );
}
