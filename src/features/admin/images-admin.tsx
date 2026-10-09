// =====================================================================
//  Admin → «مراجعة الصور» (Phase 1.3)
//  Post images reach HR, owner and supervisor accounts only after staff mark them free of money figures (the strict default:
//  supabase/migrations/…_media_privacy.sql). Engineers, the author and staff see them at once. The phone's own reading is
//  shown as a hint; the decision is staff's and is audited.
// =====================================================================
import { useEffect, useState } from "react";
import { Check, EyeOff, Image as ImageIcon, RefreshCw } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { room } from "../../data/companies";
import { agoText } from "../../domain/moderation";
import { Empty } from "../../ui/chrome";
import { Panel, Primary, Secondary } from "../../ui/primitives";
import { PanelHead, ToneChip } from "./kit";

const HINT: Record<string, [string, string]> = {
  clean: ["قراءة الجهاز: بلا أرقام مالية", "good"],
  money: ["قراءة الجهاز: فيها أرقام مالية", "bad"],
  failed: ["قراءة الجهاز: لم تكتمل", "warn"],
};

export function ImagesSection({ A }: any) {
  const [list, setList] = useState<any[] | null>(null); const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState("");
  const load = () => { setErr(""); cloud.admin.imageQueue().then(setList, (e: any) => { setList([]); setErr(e && e.message ? e.message : String(e)); }); };
  useEffect(() => { if (isCloud()) load(); else setList([]); }, []);
  const decide = async (id: string, verdict: "clean" | "money") => {
    setBusy(id);
    try {
      await cloud.admin.reviewImage(id, verdict);
      setList((l) => (l || []).filter((x) => x.post_id !== id));
      A.toast(verdict === "clean" ? "الصورة متاحة الآن لكل الحسابات" : "الصورة تبقى مخفية عن حسابات الشركات ومشرفي المواقع");
    } catch (e: any) { A.toast(e && e.message ? e.message : String(e)); }
    setBusy(null);
  };
  return (
    <Panel className="p-4">
      <PanelHead icon={ImageIcon} title="مراجعة الصور"><Secondary onClick={load} className="h-9 px-3 text-[12px]"><RefreshCw size={13} /> تحديث</Secondary></PanelHead>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">حسابات الشركات ومشرفي المواقع لا ترى صورة منشور إلا بعد أن يراجعها الفريق ويتأكد أنها بلا أرقام مالية. المهندسون وصاحب المنشور يرونها فورًا.</p>
      {err && <p className="mt-3 text-[12px] text-bad">{err}</p>}
      {list === null ? <p className="mt-4 text-[12.5px] text-ink-3">جارٍ التحميل…</p>
        : list.length === 0 ? <Empty icon={Check} title="لا صور بانتظار المراجعة" body={isCloud() ? "كل الصور المنشورة رُوجعت." : "في الوضع التجريبي لا تُرفع صور إلى الخادم."} />
        : <ul className="mt-4 grid sm:grid-cols-2 gap-3" data-image-queue>{list.map((x) => { const [hint, tone] = HINT[x.client_scan] || HINT.failed; return (
          <li key={x.post_id} className="rounded-2xl border border-line overflow-hidden bg-surface">
            <div className="bg-canvas/60 aspect-[4/3] grid place-items-center"><img src={x.src} alt="" loading="lazy" className="max-w-full max-h-full object-contain" /></div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-ink-3"><span>{(room(x.room) || {}).name || x.room}</span><span>·</span><span>{agoText(Date.parse(x.created_at), Date.now())}</span><ToneChip tone={tone}>{hint}</ToneChip></div>
              <div className="flex gap-2">
                <Primary onClick={() => decide(x.post_id, "clean")} disabled={busy === x.post_id} className="flex-1 h-10 text-[12.5px]"><Check size={14} /> بلا أرقام — اعرضها للجميع</Primary>
                <Secondary onClick={() => decide(x.post_id, "money")} disabled={busy === x.post_id} className="h-10 px-3 text-[12.5px]"><EyeOff size={14} /> فيها أرقام</Secondary>
              </div>
            </div>
          </li>); })}</ul>}
    </Panel>
  );
}
