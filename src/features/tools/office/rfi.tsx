// =====================================================================
//  طلب استيضاح فني — RFI (screen + PDF + Word). The question, where it is, what it rests on (drawings, spec clauses), the
//  contractor's proposal and the impact, and the date a reply is needed by. «املأ بالمهندس الذكي» turns a plain description
//  into the form; anything it can't know stays a «[أضف: …]» slot for the engineer.
// =====================================================================
import type { DocBlock } from "../../../doc/model";
import { iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Check, DateField, Grid2, Note, NumField, Pick, RowCards, TextField } from "../../../ui/kit";
import { numInputParse } from "../../../lib/num-input";
import { AiFillCard, str, strs } from "../../ai/AiFill";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

const DISCIPLINES: [string, string][] = [["civil", "إنشائي"], ["arch", "معماري"], ["mech", "ميكانيكا"], ["elec", "كهرباء"], ["infra", "بنية تحتية"], ["other", "أخرى"]];
const PRIORITY: [string, string][] = [["normal", "عادي"], ["urgent", "عاجل"], ["critical", "يوقف العمل"]];

type Ref = { ref: string };
type Body = {
  to: string; discipline: string; location: string; priority: string;
  question: string; refs: Ref[]; proposal: string; impact: string; days: string;
  answer: string; answeredBy: string;
  // the register (W7): when the reply came, and whether the query is closed (older documents have neither)
  answeredOn?: string; closed?: boolean;
};

const blank = (): Body => ({ to: "", discipline: "civil", location: "", priority: "normal", question: "", refs: [], proposal: "", impact: "", days: "7", answer: "", answeredBy: "", answeredOn: "", closed: false });

const DISC_OF: Record<string, string> = { structural: "civil", civil: "civil", architectural: "arch", architecture: "arch", mechanical: "mech", mep: "mech", electrical: "elec", infrastructure: "infra" };
const discOf = (s: string) => {
  const k = s.toLowerCase();
  const hit = Object.keys(DISC_OF).find((x) => k.includes(x));
  if (hit) return DISC_OF[hit];
  if (/إنشا/.test(s)) return "civil";
  if (/معمار/.test(s)) return "arch";
  if (/ميكان|تكييف|صحي|حريق/.test(s)) return "mech";
  if (/كهرب/.test(s)) return "elec";
  return "other";
};

// what the Smart Engineer sent, laid into the form (only the fields it filled; the rest stay as they are)
export function rfiFromAi(b: Body, d: any): Body & { title?: string } {
  const refs = strs(d && d.references, 12, 200).map((ref) => ({ ref }));
  const days = Number(d && d.responseNeededDays);
  return {
    ...b,
    title: str(d && d.title, 140) || undefined,
    discipline: d && d.discipline ? discOf(str(d.discipline)) : b.discipline,
    location: str(d && d.location, 200) || b.location,
    question: str(d && d.description, 3000) || b.question,
    refs: refs.length ? refs : b.refs,
    proposal: str(d && d.proposedSolution, 2000) || b.proposal,
    impact: str(d && d.impact, 1000) || b.impact,
    days: days > 0 && days < 90 ? String(Math.round(days)) : b.days,
  };
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  return (
    <div className="space-y-3">
      <AiFillCard
        app={ctx.app}
        form="rfi"
        disabled={ro}
        project={ctx.project ? { name: ctx.project.name, location: [ctx.project.location?.site, ctx.project.location?.city].filter(Boolean).join(" · "), contractNo: ctx.project.contractNo } : null}
        placeholder={{ ar: "مثال: منسوب بلاطة الدور الأول في اللوحة الإنشائية S-102 مختلف 15 سم عن المعماري A-201 عند المحور C/4…", en: "e.g. the first-floor slab level on structural S-102 differs by 15 cm from architectural A-201 at grid C/4…" }}
        onFill={(d) => {
          const { title, ...next } = rfiFromAi(b, d);
          if (ctx.fill) ctx.fill(next, title);
          else set(next);
        }}
      />
      <Card title="البيانات">
        <Grid2>
          <TextField label="إلى (الاستشاري / المصمم)" value={b.to} onChange={(v) => put({ to: v })} />
          <TextField label="الموقع / المحور / الدور" value={b.location} onChange={(v) => put({ location: v })} />
        </Grid2>
        <div className="mt-2.5 space-y-2.5">
          <Pick label="التخصص" items={DISCIPLINES} value={b.discipline} onChange={(discipline) => put({ discipline })} />
          <Pick label="الأولوية" items={PRIORITY} value={b.priority} onChange={(priority) => put({ priority })} />
        </div>
      </Card>
      <Card title="الاستيضاح">
        <AreaField label="السؤال" value={b.question} onChange={(v) => put({ question: v })} rows={5} />
        <div className="mt-2.5"><AreaField label="الحل المقترح من المقاول" value={b.proposal} onChange={(v) => put({ proposal: v })} rows={3} /></div>
        <div className="mt-2.5"><AreaField label="التأثير على المدة / التكلفة" value={b.impact} onChange={(v) => put({ impact: v })} rows={2} /></div>
        <div className="mt-2.5"><NumField label="الرد مطلوب خلال" unit="يوم" value={b.days} onChange={(v) => put({ days: v })} /></div>
      </Card>
      <Card title="المراجع (لوحات، بنود مواصفات)">
        <RowCards<Ref> rows={b.refs} onChange={(refs) => put({ refs })} max={30} addLabel="مرجع" blank={() => ({ ref: "" })} summary={(r) => r.ref || "مرجع"}
          render={(r, setR) => <TextField label="المرجع" dir="auto" value={r.ref} onChange={(v) => setR({ ref: v })} />} />
      </Card>
      <Card title="الرد (يملؤه الاستشاري)">
        <AreaField label="الرد" value={b.answer} onChange={(v) => put({ answer: v })} rows={3} />
        <div className="mt-2.5"><Grid2>
          <TextField label="رد بواسطة" value={b.answeredBy} onChange={(v) => put({ answeredBy: v })} />
          <DateField label="تاريخ الرد" value={b.answeredOn || ""} onChange={(v) => put({ answeredOn: v })} readOnly={ro} data-rfi-answered-on />
        </Grid2></div>
        <div className="mt-2"><Check label="أُغلق الاستيضاح" on={!!b.closed} onChange={(closed) => put({ closed })} /></div>
      </Card>
      <Note>الخانات بين [ ] ناقصة — أكملها قبل الإصدار. لا يُرسل للاستشاري إلا ما تكتبه أنت.</Note>
    </div>
  );
}

const dueIso = (dateIso: string, days: string) => {
  const n = numInputParse(days);
  if (!n || !dateIso) return "—";
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(n));
  return d.toISOString().slice(0, 10);
};

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const word = (list: [string, string][], v: string) => (list.find((x) => x[0] === v) || ["", "—"])[1];
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "إلى", value: b.to || "—" }, { label: "التخصص", value: word(DISCIPLINES, b.discipline) }, { label: "الأولوية", value: word(PRIORITY, b.priority) },
      { label: "الموقع", value: b.location || "—", wide: true }, { label: "تاريخ الطلب", value: iso(doc.dateIso) }, { label: "الرد مطلوب قبل", value: iso(dueIso(doc.dateIso, b.days)) },
    ] },
    { k: "notes", title: "الاستيضاح · Query", text: b.question || "—" },
    ...(b.refs.filter((r) => r.ref.trim()).length
      ? [{ k: "notes", title: "المراجع · References", text: b.refs.filter((r) => r.ref.trim()).map((r) => `• ${r.ref}`).join("\n") } as DocBlock]
      : []),
    ...(b.proposal.trim() ? [{ k: "notes", title: "الحل المقترح · Proposed solution", text: b.proposal } as DocBlock] : []),
    ...(b.impact.trim() ? [{ k: "notes", title: "التأثير · Impact", text: b.impact } as DocBlock] : []),
    { k: "notes", title: "الرد · Reply", text: b.answer.trim() ? `${b.answer}${b.answeredBy ? `\n— ${b.answeredBy}` : ""}${b.answeredOn ? ` · ${iso(b.answeredOn)}` : ""}` : "\n\n\n" },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["contractorRep", "consultantRep"] });
}

export const module: ToolModule<Body> = {
  kind: "rfi", v: 1, docType: "RFI", docTypeName: "طلب استيضاح فني · Request for information", discipline: "مكتب فني", engine: "rfi@1.0.0",
  profile: { id: "office@1", edition: "Technical office practice", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "طلب استيضاح فني",
  Editor,
  build,
  summary: (doc) => [`طلب استيضاح فني · ⁦${doc.docNo || doc.dateIso}⁩`, doc.body.location ? `الموقع: ${doc.body.location}` : "", (doc.body.question || "").slice(0, 280), `الرد مطلوب قبل ⁦${dueIso(doc.dateIso, doc.body.days)}⁩`].filter(Boolean).join("\n"),
};
