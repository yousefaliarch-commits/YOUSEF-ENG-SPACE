# EngSpace Tools (الأدوات): master blueprint

**Lens.** Field-first, office-complete. Build for the people who stand on the slab at 06:45: site engineers, supervisors, foremen and skilled trades across every discipline. They work offline, with one thumb, often in gloves, in direct sun and in noise, and some workers read little. Rank tools by how often they are used each day and how many minutes they save on site. Then make the daily field tools the best in the market.

**Base.** Branch `feat/tools-suite` at `236d655` (v0.27.0, native line 2). On top of `693bd50` it already contains `src/lib/num-input.ts` (`numInputNormalize` / `numInputParse` / `numInputProblem` / `numInputShow`), the share-cancel fix and the fix that preloads the Arabic report glyphs. Every claim about the code below was checked against this tree.

**Confidence tags.** Tags come from the research briefs: **[H]** high, **[M]** medium, **[L]** low. Every [L] value ships as a configurable default. It carries a visible «⚑ تحقق» note on screen and in the PDF, and is never a hard rule.

---

## 1. Vision and design principles

1. **The site day is the unit of design.** The Tools tab opens on «اليوم في الموقع» (today on site). It shows today's diary, the morning toolbox talk, permits valid right now, today's pour and the last cutting list. A foreman reaches any of them in one tap and fills them in under two minutes.
2. **One thumb, gloves and sun.** Use 56 px targets in field mode (48 px minimum elsewhere) and steppers for counts. Values are typed, never chosen from long pickers. A ± key handles negative levels, because the iOS decimal pad has none. A high-contrast «وضع الشمس» (sun mode) is available. Haptic ticks use the `@capacitor/haptics` plugin, already in line 2. Nothing needs a swipe.
3. **The worker's language.** The trade kit asks one question per screen in Egyptian colloquial («الحيطة طولها كام؟»). It shows pictograms (bags, buckets, tiles) next to every number and counts in the units workers use: شيكارة, جردل, قصعة, عربية يد. Each member's own bucket and wheelbarrow volumes are calibrated once. (A truck mixer is always «خلاطة», never «عربية», so the two never collide.)
4. **Exact maths that can be traced.** Engines are pure TypeScript and work in integer mm (levels, cut lengths) or full float, rounding only for display. Every result expands into «طريقة الحساب» (show the working): formula, inputs with units, code clause, profile and confidence. Results never use a silent default: a default value carries an «افتراضي» chip.
5. **Code profiles, never constants.** Every code-derived number comes from a versioned code profile, for example `ecp203-site@1`, `bs8666-2020@1`, `nfpa13-2022@1` or `iec60364-2009@1`. Each saved document snapshots the constants it used, and at issue it also freezes its computed outputs, checks and working together with the engine version (`BBS_ENGINE = "bbs@1.0.0"`), so a reprint years later prints the same figures even after an over-the-air engine fix.
6. **Drafts never die.** Every keystroke autosaves to IndexedDB, and a per-document outbox syncs to the server. If two phones edit the same document, both versions are kept as a conflict copy and nothing is overwritten. A document that is not yet shared shows a visible «لم يُشارك بعد» state. Once a document is issued it is frozen, and later changes go into a new revision.
7. **Paper the consultant accepts.** Every major tool produces an A4 PDF. The title block (خرطوشة) belongs to the issuer, never to EngSpace. Pages have consistent type and units in column headers, «ما قبله / يُرحّل» (brought forward / carried forward) rows on multi-page books, wet-ink signature boxes and a stamp box, plus a single 7 pt line of EngSpace attribution.
8. **One project, every title block.** Project, owner, consultant, contractor, logos, signatories and document numbering are typed once and reused by every tool.
9. **No double entry.** The daily diary assembles itself from today's pours, toolbox talks, permits and QA/QC inspections. Take-offs feed the material request. The level book feeds the drain-run inverts.
10. **The role rules are structural.** Gating uses an allow-list derived from the tool registry. Supervisors see no money anywhere, and HR sees only the CV review. Field-tool schemas have no price fields at all, and a test pins that. The same rule holds inside the store: money documents never surface in a supervisor's lists, search, Today strip, storage meter, backup or verify screen (`toolKindsForRole`, §5e).
11. **Everything in wave 1 ships over the air on line 2.** Wave 1 is JS, CSS, fonts and wasm only. Native additions wait for line 3, which batches with the production keystore, and they are optional upgrades: GPS stamps, text-to-speech, saving to Downloads.
12. **Honest limits.** Calculators switch off rather than extrapolate outside their range: excavation deeper than 6.1 m, a gas test outside its window, more than 90 s of overloaded crane. Every PDF states what it is not, for example «ليست حسابات هيدروليكية» (not a hydraulic calculation).

---

## 2. Tool matrix

**Key.**
- **Roles:** E engineer, O owner (company account), S supervisor. HR sees only `cvreview`.
- **Money tools** are marked 💲 and never open for S.
- **Freq:** H several times a day or daily · M weekly · L per project.
- **Value** is 1–5. **Cx** is build complexity, S/M/L/XL.
- **Docs:** saves documents. **PDF:** produces a PDF deliverable.
- **Status of existing tools:** NEW, UPG (upgraded), MRG (merged into another tool), KEPT.
- **Packs:** «المكتب الفني» (technical office) holds the non-money office tools and is open to supervisors; «العقود والمستخلصات» (contracts & payments 💲) and «الراتب والعروض» (salary & offers 💲) render only with money access.
- **Wave 1** is everything that ships before the W1 gate (Phases 1–4, §7). A wave-2 money row marked «Phase 4b» ships straight after the gate.

Rows are ranked within each wave by daily field frequency × minutes saved. Rows 81–90 and the Freq corrections (areaSchedule H, openings M, coolingLoad H, waterTank M, from the architecture, HVAC and plumbing briefs) were added by the review (§9), so their rank is approximate. Every discipline in the taxonomy (civil, architecture, mechanical, electrical, survey) has at least one wave-1 tool.

| # | id | Arabic name | English name | Pack | Disciplines | Roles | Freq | Value | Cx | Docs | PDF | Wave | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `tradeKit` | حاسبة الصنايعي | Trade quick kit | workforce quick tools | all trades, foremen | E O S | H | 5 | M | y | y | 1 | NEW |
| 2 | `concrete` | حصر وصب الخرسانة | Concrete take-off & pour planner | structural & concrete | civil/structural | E O S | H | 5 | L | y | y | 1 | UPG (was `concrete`) |
| 3 | `siteDiary` | يومية الموقع | Daily site diary | HSE & site management | all | E O S | H | 5 | L | y | y | 1 | NEW |
| 4 | `toolboxTalk` | التوعية الصباحية وتمام المهمات | Toolbox talk & PPE muster | HSE & site management | all | E O S | H | 4 | M | y | y | 1 | NEW |
| 5 | `bbs` | جدول تفريد وقص الحديد | Bar bending schedule & 12 m cutting optimiser | rebar | structural, steel fixers | E O S | H | 5 | XL | y | y | 1 | UPG (was `rebar`) |
| 6 | `checklists` | قوائم الفحص والاستلام | QA/QC checklists & inspections | HSE & site management | all | E O S | H | 5 | M | y | y | 1 | KEPT, moved to the doc kit |
| 7 | `levelBook` | دفتر الميزانية | Levelling field book + two-peg test | survey | survey, civil, infrastructure | E O S | H | 5 | L | y | y | 1 | NEW |
| 8 | `workPermit` | تصاريح العمل | Permit-to-work with safety calculators | HSE & site management | all | E O S | H (large sites) | 4 | L | y | y | 1 | NEW |
| 9 | `cableCheck` | الكابل وهبوط الجهد | Cable & voltage-drop check | electrical | electrical power | E O S | H | 4 | M | y | y | 1 | NEW |
| 10 | `acInstall` | فحص تركيب التكييف | AC split / ducted installation check | MEP-mechanical | HVAC | E O S | H | 4 | S | y | y | 1 | NEW |
| 11 | `drainRun` | مناسيب غرف التفتيش | Drain run invert schedule + sight rails | MEP-mechanical | plumbing/drainage, infrastructure | E O S | H | 4 | M | y | y | 1 | NEW |
| 12 | `sprinklerCheck` | توزيع وفحص الرشاشات | Sprinkler count & spacing check | MEP-mechanical | fire | E O S | H | 4 | S | y | y | 1 | NEW |
| 13 | `units` | تحويل الوحدات والمساحات | Units, slopes & shapes | workforce quick tools | all | E O S | H | 3 | S | n | n | 1 | KEPT + extended |
| 14 | `masonry` | حصر المباني | Masonry (now a trade-kit mode) | quantities & finishes | civil, masons | E O S | H | — | — | — | — | 1 | MRG into `tradeKit` (single wall); the multi-wall take-off is `wallTakeoff` (#81) |
| 15 | `rebar` | أوزان الحديد | Rebar weights (now the bbs quick mode) | rebar | structural | E O S | H | — | — | — | — | 1 | MRG into `bbs` (alias `rebar`→`bbs`) |
| 81 | `wallTakeoff` | حصر المباني والبياض | Masonry & plaster take-off (walls, lintels, plaster faces) | quantities & finishes | civil, architecture, masons | E O S | H | 5 | M | y | y | 1 | NEW (Phase 2, §3.14) |
| 16 | `takeoffSheet` | كشف الحصر | Generic take-off sheet (n×L×W×H, deductions) | quantities & finishes | all | E O S | H | 4 | M | y | y | 1 | NEW (Phase 2, §3.15) |
| 17 | `finishTakeoff` | حصر التشطيبات | Room-based finishes take-off (walls, plaster, tiles, paint, ceilings, waterproofing) | quantities & finishes | architecture, finishing | E O S | H | 5 | L | y | y | 1 | NEW (Phase 4; reuses `wallTakeoff` walls) |
| 18 | `snagList` | قائمة الملاحظات | Snag / punch list with photos | HSE & site management | all | E O S | H | 4 | M | y | y | 2 | NEW |
| 19 | `fieldDensity` | الكثافة الحقلية | Field density & compaction QC | survey | roads, geotech | E O S | H | 4 | M | y | y | 1 | NEW (Phase 4) |
| 20 | `heatStress` | الإجهاد الحراري وحظر الظهيرة | Heat index & midday-ban planner | HSE & site management | all | E O S | H (summer) | 4 | S | n | n | 2 | NEW |
| 21 | `crewPlanner` | تخطيط العمالة والمدة | Crew size & duration planner (no money) | workforce quick tools | all trades | E O S | M | 4 | S | y | n | 2 | NEW |
| 22 | `cubeLog` | سجل مكعبات الخرسانة | Concrete cube register & results | structural & concrete | civil, QC | E O S | M | 4 | M | y | y | 2 | NEW |
| 23 | `hotConcrete` | حرارة الخرسانة صيفًا | Fresh-concrete temperature & ice/chilled-water planner | structural & concrete | civil | E O S | M (summer H) | 4 | S | n | n | 2 | NEW |
| 24 | `lapLength` | التماسك والوصلات | Development & lap length | rebar | structural | E O S | M | 3 | S | n | n | 2 | NEW |
| 25 | `earthworks` | الحفر والردم والنقل | Earthworks (grid, sections, swell, trips) | survey | civil, infrastructure | E O S | M | 4 | M | y | y | 2 | NEW |
| 26 | `trench` | خنادق المواسير | Pipe trench, pipes, manholes, dewatering estimate | survey | infrastructure, plumbing | E O S | M | 4 | M | y | y | 2 | NEW |
| 27 | `pavement` | كميات طبقات الرصف | Pavement layer quantities | quantities & finishes | roads | E O S | M | 4 | M | y | y | 2 | NEW |
| 28 | `traverse` | المضلعات والإحداثيات | Bearings, traverse (Bowditch/transit), area & feddan | survey | survey | E O S | M | 4 | M | y | y | 2 | NEW |
| 29 | `setOut` | التوقيع المساحي | Setting-out sheet (station, backsight, angles) | survey | survey | E O S | M | 4 | S | y | y | 2 | NEW |
| 30 | `stairCheck` | السلالم والقائمات المنفذة | Stair design & as-built riser check | architecture | architecture, finishing | E O S | M | 4 | S | y | y | 2 | NEW |
| 31 | `liftPlan` | خطة الرفع المبسطة | Lift plan (slings, utilisation, outrigger mats) | HSE & site management | all | E O S | M | 4 | M | y | y | 2 | NEW |
| 32 | `scaffoldTags` | بطاقات السقالات والسلالم | Scaffold / ladder / harness tag register | HSE & site management | all | E O S | M | 3 | M | y | y | 2 | NEW |
| 33 | `weeklyReport` | التقرير الأسبوعي والشهري | Weekly / monthly roll-up from diaries | HSE & site management | all | E O S | M | 4 | M | y | y | 2 | NEW |
| 34 | `incident` | الحوادث ومؤشرات السلامة | Incident / near-miss report + TRIR/LTIFR | HSE & site management | all | E O S | L | 4 | M | y | y | 2 | NEW (sensitive data) |
| 35 | `extinguishers` | طفايات الحريق | Extinguisher count & inspection register | MEP-mechanical | fire | E O S | M | 3 | S | y | y | 2 | NEW |
| 36 | `detectors` | توزيع الكواشف | Detector & call-point spacing | MEP-mechanical | fire, low current | E O S | M | 3 | S | y | y | 2 | NEW |
| 37 | `fireDemand` | الطلب المائي للحريق | Sprinkler demand & fire-tank volume (preliminary) | MEP-mechanical | fire | E O S | L | 3 | S | y | y | 2 | NEW |
| 38 | `coolingLoad` | حمل التبريد واختيار الوحدات | Cooling load (quick + CLTD) & unit selection | MEP-mechanical | HVAC | E O S | H | 4 | L | y | y | 1 quick / 2 CLTD | NEW (quick mode + unit selection in Phase 4) |
| 39 | `ventilation` | التهوية والشفط | Outdoor air & exhaust | MEP-mechanical | HVAC | E O S | M | 3 | M | y | y | 2 | NEW |
| 40 | `ductSizer` | مقاسات الدكت | Duct sizer (equal friction) | MEP-mechanical | HVAC | E O S | M | 3 | M | y | y | 2 | NEW |
| 41 | `waterTank` | الطلب المائي والخزانات | Water demand & tank sizing | MEP-mechanical | plumbing | E O S | M | 3 | S | y | y | 2 | NEW |
| 42 | `pumpSize` | المضخات | Transfer / booster pump sizing | MEP-mechanical | plumbing | E O S | L | 3 | S | y | y | 2 | NEW |
| 43 | `panelSchedule` | جدول اللوحة | Panel / load schedule (phase balance, main breaker) | electrical | electrical | E O S | M | 4 | L | y | y | 2 | NEW |
| 44 | `lighting` | الإنارة | Lumen-method lighting | electrical | electrical | E O S | M | 3 | S | y | y | 2 | NEW |
| 45 | `earthing` | التأريض واختبار المقاومة | Earth-rod design & fall-of-potential test record | electrical | electrical | E O S | L | 3 | S | y | y | 2 | NEW |
| 46 | `rampAccess` | المنحدرات والإتاحة | Ramps & accessibility check | architecture | architecture | E O S | L | 3 | S | y | y | 2 | NEW |
| 47 | `ipc` | المستخلص الجاري 💲 | Interim payment certificate (BOQ import, claimed vs certified) | contracts & payments [money] | QS, contracts | E O | M | 5 | XL | y | y | 2 (Phase 4b) | NEW |
| 48 | `voRegister` | سجل الأوامر التغييرية 💲 | Variation order register | contracts & payments [money] | contracts | E O | M | 4 | M | y | y | 2 (Phase 4b) | NEW |
| 82 | `subStatement` | مستخلص مقاول الباطن 💲 | Subcontractor statement (on the IPC engine) | contracts & payments [money] | QS, contracts | E O | M | 4 | M | y | y | 2 (Phase 4b) | NEW |
| 83 | `irRegister` | سجل طلبات الاستلام | IR / WIR / MIR register (fed by QA/QC, first-time pass %) | technical office | all | E O S | H | 4 | M | y | y | 2 | NEW |
| 84 | `rfiLog` | سجل الاستفسارات والاعتمادات | RFI, submittal & transmittal register (status A/B/C) | technical office | all | E O S | M | 4 | M | y | y | 2 | NEW |
| 85 | `meetingMinutes` | محضر اجتماع | Meeting minutes with action owners and due dates | technical office | all | E O S | M | 3 | S | y | y | 2 | NEW |
| 86 | `dayworkSheet` | يوميات الأعمال الإضافية | Daywork sheet: named labour and plant hours, no rates | HSE & site management | all | E O S | M | 4 | S | y | y | 2 | NEW |
| 87 | `steelTakeoff` | حصر الحديد الإنشائي | Structural steel take-off (sections, plates, bolts, paint m²/t) | quantities & finishes | structural steel | E O S | M | 3 | M | y | y | 2 | NEW |
| 88 | `curveSetOut` | توقيع المنحنيات | Horizontal curve setting-out (T, L, E, chainages, deflections) | survey | survey, roads | E O S | M | 3 | M | y | y | 2 | NEW |
| 63 | `areaSchedule` | جدول المساحات والاشتراطات | Area schedule, zoning & parking | architecture | architecture | E O | H | 3 | M | y | y | 2 (first batch) | NEW (moved from wave 3) |
| 49 | `bearingTest` | قراءة اختبارات التحمل | CBR / DCP / plate-load reader (no allowable bearing) | survey | geotech, roads | E O S | L | 3 | M | y | y | 3 | NEW |
| 50 | `kerbs` | البردورات والإنترلوك | Kerbs & interlock | quantities & finishes | roads, landscape | E O S | L | 3 | S | n | y | 3 | NEW |
| 51 | `gridCheck` | أنظمة الإحداثيات المصرية | ETM/UTM belt detection & scale factors | survey | survey | E O S | L | 3 | M | n | n | 3 | NEW |
| 52 | `supplyPipe` | مواسير التغذية | WSFU supply pipe sizing | MEP-mechanical | plumbing | E O S | M | 3 | M | y | y | 3 | NEW (waits for licensed tables) |
| 53 | `drainSize` | مقاسات الصرف والتهوية | DFU drainage & vent sizing | MEP-mechanical | plumbing | E O S | L | 3 | M | y | y | 3 | NEW (waits for licensed tables) |
| 54 | `chwPipe` | مواسير المياه المثلجة | Chilled-water pipe sizing | MEP-mechanical | HVAC | E O S | L | 3 | M | y | y | 3 | NEW |
| 55 | `firePump` | مضخة الحريق والجوكي | Standpipe demand, fire & jockey pump | MEP-mechanical | fire | E O S | L | 3 | S | y | y | 3 | NEW |
| 56 | `emergencyLight` | إنارة الطوارئ والهروب | Emergency lighting & exit signs | MEP-mechanical | fire, electrical | E O S | L | 2 | S | y | y | 3 | NEW |
| 57 | `septicGrease` | خزان التحليل والجريز | Septic tank & grease interceptor | MEP-mechanical | plumbing | E O S | L | 2 | S | n | y | 3 | NEW |
| 58 | `rainwater` | صرف الأمطار | Roof rainwater | MEP-mechanical | plumbing | E O S | L | 2 | S | n | y | 3 | NEW |
| 59 | `shortCircuit` | تيار القصر | Short-circuit at a panel | electrical | electrical | E O S | L | 3 | M | y | y | 3 | NEW |
| 60 | `pfCorrection` | تحسين معامل القدرة | PF correction (kvar) | electrical | electrical | E O S | L | 2 | S | n | n | 3 | NEW |
| 61 | `genUps` | المولد والـ UPS | Generator & UPS sizing | electrical | electrical | E O S | L | 2 | S | n | y | 3 | NEW |
| 62 | `lowCurrent` | التيار الخفيف | Low-current quick checks (fire-alarm battery, Cat6 length, CCTV storage) | electrical | low current | E O S | L | 2 | S | n | n | 3 | NEW |
| 64 | `openings` | جدول الفتحات والإضاءة والتهوية | Openings schedule + room register | architecture | architecture | E O S | M | 3 | M | y | y | 3 | NEW |
| 65 | `egress` | حمل الإشغال والهروب | Occupant load & egress width | architecture | architecture, fire | E O | L | 3 | M | y | y | 3 | NEW (high liability) |
| 66 | `ncr` | تقرير عدم المطابقة | Non-conformance report | HSE & site management | QA/QC | E O S | L | 3 | S | y | y | 3 | NEW |
| 67 | `rcSection` | مقاومة القطاعات الخرسانية | RC section check (ECP 203, engineer-only) | structural & concrete | structural | E O | L | 3 | L | y | y | 3 | NEW (high liability) |
| 68 | `delayPenalty` | غرامات التأخير 💲 | Delay penalty (Law 182/2018 / contract) | contracts & payments [money] | contracts | E O | L | 3 | S | n | y | 3 | NEW |
| 69 | `priceAdjust` | فروق الأسعار 💲 | Price adjustment | contracts & payments [money] | contracts | E O | L | 3 | M | y | y | 3 | NEW |
| 70 | `rateAnalysis` | تحليل سعر البند 💲 | Unit-rate build-up | contracts & payments [money] | estimating | E O | M | 3 | M | y | y | 3 | NEW |
| 89 | `finalAccount` | الحساب الختامي 💲 | Final account (on the IPC engine) | contracts & payments [money] | contracts | E O | L | 4 | M | y | y | 2 (Phase 6) | NEW |
| 90 | `siteBook` | دفتر الموقع | Site instruction book [L] | HSE & site management | all | E O S | M | 3 | S | y | y | 3 | NEW [L ⚑] |
| 71–79 | `offer` `net` `compare` `script` `raise` `path` `contract` `move` `inflation` | (current names) 💲 | Salary & offer tools | salary & offers [money] («الراتب والعروض») | career | E O | M | 4 | — | per tool as today | n | live | KEPT unchanged, now with an explicit `pack:"money"` |
| 80 | `cvreview` | مراجعة السيرة الذاتية | CV review | — (HR card, outside the packs) | HR | E O **HR** | M | 4 | — | n | n | live | KEPT |

**What happens to the existing tools.**
- `concrete` keeps its id and becomes the take-off and pour planner. Its old one-element sheet survives as «حساب سريع».
- `rebar` becomes `bbs`. A `TOOL_ALIASES` entry (`rebar → bbs`) keeps old opens working, and the old weight calculator becomes the BBS quick mode.
- `masonry` merges into `tradeKit` (mode «المباني»), with an upgraded engine: cement and sand, hollow-block bed, AAC, clay brick. The multi-wall PDF take-off is `wallTakeoff` (§3.14, Phase 2), which `finishTakeoff` later reads.
- **Old names still find the tools.** «حصر الخرسانة», «أوزان الحديد» and «حصر المباني» (and their English names) stay in the registry `keywords`, and each tile carries a «سريع» chip that opens its quick mode in one tap, so muscle memory survives the move. Every product string that names the old tools (settings.tsx:196 and :283, auth.tsx:134 supervisor role text, tabs.tsx:288) is rewritten in Phases 1–2, with English in the TSV files.
- `units` is kept and extended.
- QA/QC is kept. It moves to the document kit and the project profile, and its inspections gain tombstones.
- The nine salary and offer tools are kept exactly as they are, now explicitly in the money pack.

---

## 3. Wave-1 specifications

### 3.0 Conventions shared by every wave-1 tool

**Screen skeleton.** Each tool is a pushed screen (`.pushed screen-layer`) with no tab bar. The tool home opens on route `#app/tool/<id>` and shows:
- a hero row with the tool name, the active-project chip and a «طريقة الحساب» link;
- a «جديد» button;
- the `DocList` of saved documents;
- a «حساب سريع» entry where one makes sense, which computes without saving.

A document opens on `#app/tooldoc/<id>:<docId|new>` and has:
- a `DocHeader` card: project code · document number · Rev · status · date. Tapping it opens a bottom sheet to edit the header (project, title, signatories override);
- collapsible `Section`s, each with a count badge and an error badge;
- a `ResultCard` pinned under the section that drives it;
- the sticky `.foot` `ExportBar`: «معاينة» · «تصدير PDF» · «مشاركة», plus an overflow menu «⋯»: «إصدار» · «مراجعة جديدة» · «نسخة» · «نقل لمشروع آخر» (drafts only) · «تصدير Excel» · «تصدير JSON» · «حذف»;
- an autosave chip with five states: «محفوظ على الجهاز» → «تمت المزامنة 07:42» / «بانتظار الاتصال» / «على هذا الجهاز فقط» (demo mode, or signed out) / «تعارض» (opens the conflict copy).

Every edit saves at once (no save button), following the QA/QC `up()` pattern. All hooks sit above early returns. «جديد» opens `tooldoc/<id>:new`; on the first save the screen calls `app.replaceTop({ type: "tooldoc", id: "<id>:<docId>" })` (§5e), so a reload, an over-the-air restart or a renderer loss reopens the same draft, never a blank one.

**Document envelope.** Every saved document is a `ToolDoc` (see §5c). Its fields:
- `id`, `kind`, `v`, `at`, `lang` (the language the document is issued in);
- `projectId` plus a `project` snapshot, frozen at issue;
- `docNo`, `rev`, `status` (draft → issued → superseded / void);
- `profile`, a `ProfileSnap` holding only the constants this document used, the overridden keys with a reason per key, and the unverified keys;
- `engine`, the version string of the engine that computed it (`"bbs@1.0.0"`);
- `frozen`, written at «إصدار»: `{ outputs, checks, trace }`. Report builders read `frozen` for issued, superseded and void documents and never recompute them;
- `signatories?`, which overrides the project defaults for this one document;
- `body`, `photos`, `log` (rolling, ≤ 50) and `audit` (never truncated: issue, revision, conflict, raw-reading edits; above 500 entries the tool asks for a new revision instead of dropping one).

Issued documents are read-only. «مراجعة جديدة» (new revision) copies the document to the next revision and marks the old one superseded. A draft opened under a newer engine shows «النتائج تغيّرت مع تحديث المحرك» with the changed outputs side by side before it can be issued.

**Engine contract** (every engine, `src/domain/tools/common.ts`).
```ts
export type Conf = "H" | "M" | "L";
export type Check = { id: string; level: "error" | "warn" | "info"; ok: boolean; msg: string; clause?: string; conf?: Conf };
export type TraceStep = { key: string; label: string; formula: string; values: Record<string, number | string>;
  result: number | string; unit?: string; ref?: string; conf?: Conf };
// every engine module exports `<PREFIX>_ENGINE = "<tool>@x.y.z"` and returns { …outputs, checks: Check[], trace: TraceStep[] }
```
- The per-tool `warnings` arrays below are `Check[]` with `level: "warn"`; the tool-specific error codes are the `Check.id`s.
- «طريقة الحساب» in `ResultCard` renders from `trace`, and the PDF basis appendix prints the same steps.
- `tests/tools/engine-versions.test.ts` stores a hash of every engine's vector outputs in `tests/tools/engine-versions.json`. It fails when the outputs change and `<PREFIX>_ENGINE` was not bumped.

**PDF common frame.** Every PDF has:
- the page-1 title block (§5a), plus a running header from page 2;
- a code-basis strip, then the tool sections;
- a checks table (word plus mark, never colour alone);
- a **calculation-basis block** (`{ k: "basis" }`) on every calculation PDF, before the signatures: البند · القيمة · الوحدة · المصدر/البند · الثقة · ⚑ · «قيمة المشروع» (the override and its reason). It lists every profile key the document used and the formulas from `trace`. A test checks that every [L] key used appears in it with ⚑;
- the discipline disclaimer at 8/12 **above the signature block** (§8.1), a signature and stamp row, and a photo appendix where photos exist;
- a last-page colophon with technical data only: profiles, verified flags, app version, engine versions and the document fingerprint.

Every field PDF has **no money column**. The guard is a token test, not a substring regex (the old regex failed on the blueprint's own `costImpact` and on harmless keys such as `generatedAt`, `governorate`, `separate`, and missed `wage` or `fee`):
- Each supervisor-allowed tool exports `<prefix>NewBody()` and a `FIELD_KEYS[kind]` list, and ships fixtures in `tests/doc/fixtures/`.
- `tests/tools/no-money.test.ts` walks those objects' keys recursively and the DocSpec column keys of every supervisor-allowed report builder. It splits each key on camelCase and `_` (`/(?=[A-Z])|_/`) and fails when any token, singular or plural, is one of: price, rate, cost, amount, egp, fee, wage, salary, budget, payment, money, currency, tax, vat. It also fails when a string value or a generated DocSpec text contains «ج.م».
- Its own fixtures prove it: `costImpact` and `unitPrice` fail; `generatedAt`, `governorate`, `operator`, `cabDerate` and `commercial` pass.

**Test tolerance policy.**
- Integer-mm engines (levels, cut lengths, inverts) compare exactly.
- Every float pin is compared **at the decimals it prints**: `toBeCloseTo(x, dp(x))`, where `dp` counts the printed decimals. The vector file stores the full-precision value beside each printed one (for example `Ib: { shown: "160.87", exact: 160.8716 }`) and a second assertion checks the exact value at 1e-4 relative. Where a brief states a percentage band (±0.1 %, ±0.5 % for Hazen–Williams), that band is used instead.
- Full-precision values for the wave-1 pins: Ib 160.8716 · It 268.0247 · Iz 222.3676 · S_min 29.2035 · L_max 30.4768 / 32.0141 · As 753.982 · cement 65.934 · Ld/Φ 86.5309 / 66.5622 · two-peg arc 24.7518″ · PPE 91.3043 % · fleet utilisation 77.7778 % · ladder 5.1231 m / 75.9638° · land 3.1566 S · slope 66.6667 %.
- Counts that round up compare exactly.

Vectors live in `tests/tools/<tool>-calc.test.ts`.

**Liability baseline.** The first-use banner and the PDF (above the signature block) print the discipline disclaimer from §8.1. Tool-specific notes are added below each spec.

**Summary for WhatsApp.** Every tool that saves documents registers `summary(doc, lang): string` (§5a Delivery); a registry test fails when one is missing.

---

### 3.1 `tradeKit`: حاسبة الصنايعي (Trade quick kit)

**Purpose.** Answer the foreman's daily questions in seconds:
- how many bags, buckets, bricks, tiles, litres, sheets or bars are needed;
- how much fall a screed needs.

Lines can be added to a **material request** («طلب خامات») that the engineer signs. The kit never shows prices.

**Screen flow.**
1. **Kit home.** A 2-column grid of large pictogram tiles (64 px icon plus a colloquial label). Phase 2 ships 8 civil and finishing tiles: خلطة الشيكارة · المباني · البياض · البلاط والترويب · الدهانات · خشب الشدة · تقسيط الحديد · الميول. Phase 4 adds 4 tiles for the other trades (see «Trades beyond civil» below): الكهربائي · السباك · الجبس بورد · حديد الهياكل.
2. **Mode screen.**
   - **Simple mode** («وضع مبسّط», remembered per device in `toolDevice.simple`, §5c) asks one question per screen. Each screen has a big `NumField` or `Stepper`, a unit word with an icon, and «التالي» in the sticky bar. A progress row of dots sits on top.
   - **Full mode** shows every field in one form.
3. **Result.**
   - `ResultCard` with the hero number and its unit word.
   - A pictogram row, for example 8 bag icons. Above 12 icons it shows «×N» instead.
   - Secondary rows.
   - «طريقة الحساب».
   - Sticky bar: «أضِف لطلب الخامات» · «مشاركة النتيجة» (WhatsApp text).
4. **Material request.** A document listing lines from any mode, plus the zone, element, «مطلوب يوم» (needed-by date) and the requester. It exports to PDF.

**Calibration.** The first time a bucket or wheelbarrow figure is needed, the kit asks «الجردل بتاعك كام لتر؟» and «عربية اليد كام جردل؟». The answers are stored in `toolPrefs.calib` and printed on the PDF.

| Calibration value | Default | Confidence |
|---|---|---|
| Bucket | 20 L | [L] ⚑ |
| Wheelbarrow | 60 L | [L] ⚑ |
| Bag | 50 kg | [H] |
| Loose cement | 1,440 kg/m³ (a bag ≈ 34.7 L) | [L/M] |

**Inputs and validation (SI internally).**

| Mode | Inputs (unit, range) | Validation |
|---|---|---|
| Bag batch | cement content C (kg/m³, 150–500, default 350 [M]); sand per m³ (0.4 [M]); gravel per m³ (0.8 [M]); w/c (0.35–0.70, default 0.50) | warn w/c > 0.55 [L]; warn yield outside 1 ± 5 % when the mix is edited |
| Masonry | unit preset or L×W×H (cm, 5–70); wall length × height (m, 0.1–100 / 0.1–12); openings Σ (m²); leaves ½ / 1 / 1½ / 2; joint (cm, 0.2–2.5, default 1); unit waste (0–15 %, defaults: brick 5, cement brick 3, block 4, AAC 3 [M]); mortar mix (kg cement per m³ sand: 250 above ground, 350 below [M]); mortar waste (20–30 %, default 25 [M]) | openings < wall area |
| Plaster | net area (m², 0.1–10,000); preset internal (spatter 4 mm @450 + base 20 mm @300 [M]), external (spatter 4 @450 + base 25 @300), under-tile (spatter + base, no finish coat), or single layer (t, Cs); waste (default 20 % [M]) | t 5–40 mm |
| Tiles | room L×W (m) or area; tile a×b (mm, 50–3200); joint (mm, 0–15, default 2); pattern straight 10 / offset 12 / diagonal 15 / herringbone 20 % [H/M]; m² per box; tile thickness (mm, for grout depth); doors Σ width (m) for skirting; skirting height (cm) | joint ≤ 15 |
| Paint | room L×W×H or wall area; openings; ceiling yes/no; coats (1–4); spread (m²/L per coat, 4–20, no default: "from the product sheet" ⚑, suggestions 9 emulsion / 8 silk / 11 enamel [H/M]); practical factor η (0.6–0.85, default 0.75 [M]) or "the sheet value is already practical"; waste (5–10 %); pack size (L) | warn spread outside 8–14 |
| Formwork | element kind (column / beam / slab / wall), dims, count; sheet 1.22×2.44 [H]; waste (default 10 %) | — |
| Bar spacing | clear length (m), end cover (mm, default 25), spacing (mm, 50–400), Ø chip, bar length in the other direction (m) | spacing ≥ 2Ø + 20 mm warn |
| Falls | slope (%, 0.1–10) or 1:n; run (m); minimum thickness at the outlet (mm); plan area for volume (m²) | — |

**Engine API** (`src/domain/tools/trade-calc.ts`, prefix `trade`).
```ts
export type TradeMix = { bagKg: number; cementKgM3: number; sandM3: number; gravelM3: number; wc: number };
export function tradeBagBatch(mix: TradeMix, bucketL: number): {
  yieldM3: number; sandBuckets: number; gravelBuckets: number; waterL: number; warnings: TradeWarn[] };
export type TradeUnit = { l: number; w: number; h: number; kind: "solid" | "hollow" | "aac" };   // cm
export function tradeMasonry(i: { unit: TradeUnit; lengthM: number; heightM: number; openingsM2: number;
  leaves: 0.5 | 1 | 1.5 | 2; jointCm: number; unitWastePct: number; mortarKgM3: number; mortarWastePct: number;
  hollowMortarLm2?: number; thinBed?: boolean }): {
  netAreaM2: number; wallThickM: number; unitsPerM2: number; units: number; mortarWetM3: number;
  sandM3: number; cementKg: number; cementBags: number; adhesiveKg?: number };   // thinBed (AAC): adhesive only, sand and cement are 0
export function tradePlaster(i: { areaM2: number; layers: { tMm: number; cementKgM3: number }[]; wastePct: number }): {
  cementKg: number; cementBags: number; sandM3: number; sandBuckets: (bucketL: number) => number };
export function tradeTiles(i: { areaM2: number; aMm: number; bMm: number; jointMm: number; wastePct: number;
  boxM2?: number; thickMm?: number; groutDensity?: number; groutWastePct?: number;
  skirting?: { perimeterM: number; doorsM: number; hCm: number } }): {
  tiles: number; tilesExact: number; boxes?: number; groutKg?: number; groutKgM2?: number;
  skirtingM?: number; skirtingTiles?: number };
export function tradePaint(i: { areaM2: number; coats: number; spreadM2L: number; practical: number;
  wastePct: number; packL: number }): { litres: number; packs: number };
export function tradeFormwork(i: { contactM2: number; wastePct: number; sheetM2?: number }): { sheets: number; exact: number };
export function tradeFormworkContact(e: { kind: "column" | "beam" | "slab" | "wall"; a: number; b: number; h: number; n: number }): number;
export function tradeBarSpacing(i: { clearM: number; coverMm: number; spacingMm: number; d: number; otherLenM: number }): {
  bars: number; asMm2PerM: number; totalM: number; kg: number };
export function tradeFalls(i: { slopePct: number; runM: number; minMm: number; areaM2?: number }): {
  dropMm: number; maxMm: number; avgMm: number; volumeM3?: number };
```

**Formulas.**

| Mode | Formula | Source |
|---|---|---|
| Bag batch | Y = bagKg / C · sand buckets = sandM3 · Y · 1000 / bucketL · gravel likewise · water = wc · bagKg | [H] arithmetic, [M] mix |
| Masonry, solid units, ½ leaf | n = 1 / ((L + j)(H + j)) per m² · V_m = t_wall − n · L·W·H | [H] geometry |
| Masonry, solid units, 1 leaf | n = 1 / ((W + j)(H + j)) per m² · V_m as above, t_wall 0.25 | [H] geometry |
| Masonry, solid units, 1½ leaves | n = 1 / ((L + j)(H + j)) + 1 / ((W + j)(H + j)) per m² · V_m as above, t_wall 0.38 | [H] geometry |
| Masonry, solid units, 2 leaves | n = 2 / ((W + j)(H + j)) per m² · V_m as above, t_wall 0.51 | [H] geometry |
| Masonry, AAC thin bed (j 0.3 cm) | n = 1 / ((L + j)(H + j)) per m² · adhesive kg = A · (2.2 kg/m² at 10 cm, 4.5 kg/m² at 20 cm, linear between) [M]; no sand or cement. AAC laid on ordinary mortar uses the block path with j = 1 cm | [H] count, [M] adhesive |
| Masonry, hollow block | V_m = hollowMortarLm2 / 1000 (defaults 7 / 10 / 14 L/m² for 10 / 15 / 20 cm) | [M] |
| Masonry, materials | sand = V_m (1 + w_m) · cement = sand × kg/m³ · bags = ceil(cement / 50) | [M] Egyptian kg-per-m³-sand convention, never mixed with volume ratios in one calculation |
| Plaster | per layer: cement = A · t · (1 + w) · C_i · sand = A · Σt · (1 + w) | [M] |
| Tiles | pitch = (a + j)(b + j) · tiles = ceil(A (1 + w) / pitch) · boxes = ceil(A (1 + w) / box) | [H] |
| Grout | kg/m² = (a + b) / (a · b) · j · d · ρ, with ρ 1.6 default | [H] |
| Skirting | L = perimeter − doors · strips per tile = floor(b / (h + 0.3 cm)) · tiles = ceil(1.10 · L / (strips · a)) | [H] |
| Paint | litres = A · coats / (spread · η) · (1 + w) · packs = ceil(litres / pack) | [M] |
| Formwork contact | column 2(a + b)·h · beam (b + 2·h_drop)·L · slab area · wall 2·L·h | [M] |
| Formwork sheets | sheets = ceil(contact (1 + w) / 2.9768) | [H] |
| Bar spacing | bars = ceil((L − 2c) / s) + 1 · As = (1000 / s) · π d² / 4 · kg = bars × otherLen × kg/m (table, §3.3) | [H] |
| Falls | drop = slope · run · max = min + drop · avg = min + drop / 2 (linear) · V = A · avg | [H] |

**Outputs.** The hero quantity in purchase units (bags, buckets, tiles, boxes, litres, packs, sheets, bars, kg), the unrounded value under it, then secondary rows.

**Saved document.**
```ts
type MaterialRequestBody = {
  zone: string; element: string; neededBy?: string /* ISO date */; requester: string;
  calib: { bucketL: number; barrowL: number; bagKg: number };
  lines: { id: string; mode: TradeMode; label: string; inputs: Record<string, number | string>;
           outputs: Record<string, number>; qty: number; unit: TradeUnitWord; note?: string }[];   // ≤ 60 lines
};
// profile snapshot: eg-site@1 → mixes, waste table, hollow mortar L/m², sheet size, loose cement density
```

**PDF «طلب خامات» (MR).**
- Title block with type «طلب خامات · Material request», MR number, zone and element, and the needed-by date.
- A table: # · البند · الوصف والفرضيات · الكمية · الوحدة · ملاحظات.
- An assumptions box: mix, waste % and calibration volumes, each with its source and confidence.
- Signatures: الطالب (foreman), المهندس المسؤول (approver), أمين المخزن (store keeper), and a stamp box.
- No price column, ever.

**Test vectors** (`tests/tools/trade-calc.test.ts`).
1. **Bag batch.** 50 kg, C 350, 0.4 / 0.8, bucket 20 L, w/c 0.5 → Y **0.142857 m³**, sand **2.857** buckets, gravel **5.714** buckets, water **25 L**.
2. **Plaster, single layer.** A 40 m², t 20 mm, waste 10 %, Cs 300 → volume 0.880 m³, cement 264 kg → **6 bags**, sand 0.880 m³ = **44 buckets** of 20 L.
3. **Plaster, layered internal.** A 40 m², 4 mm @450 + 20 mm @300, waste 20 % → cement **374.4 kg → 8 bags**, sand **1.152 m³**.
4. **Tiles.** 4.0 × 3.5 m, 600×600, j 2 mm, waste 10 %, box 1.44 → **43 tiles** (42.494), **11 boxes** (10.69). Grout at 9 mm depth gives **0.096 kg/m²** and **1.478 kg** with 10 % waste.
5. **Paint.** 4 × 3.5 × 3.0 m, door 0.9 × 2.1, window 1.5 × 1.2, with ceiling, 2 coats, spread 10, η = 1 (sheet value already practical), waste 10 % → walls **41.31 m²**, area **55.31 m²**, **12.168 L** → 4 × 3.6 L packs.
6. **Formwork.** 8 columns 0.3 × 0.6 × 3.0 → contact **43.2 m²**; waste 10 % → **16 sheets** (15.963).
7. **Masonry, half-brick.** 25×12×6, ½ leaf, j 1 cm, 10 m² net, unit waste 5 %, mix 250, mortar waste 25 % → **54.945 units/m²**, **577 units**, wet mortar **0.2110 m³**, sand **0.2637 m³**, cement **65.9 kg → 2 bags**.
8. **Masonry, block 20.** 10 m², waste 5 % → 11.614/m² → **122 blocks**. At the default block waste of 4 % → 120.79 → **121 blocks**.
   - 1½ bricks, 25×12×6, j 1 cm → **164.835 units/m²**, V_m **0.08330 m³/m²**. 2 bricks → **219.780 units/m²**, V_m **0.11440 m³/m²**.
   - AAC 60×20, thin bed j 0.3 cm, 10 cm wall → **8.17 units/m²** and 2.2 kg/m² adhesive; sand and cement **0**.
9. **Bar spacing.** Clear 4.20 m, cover 25 mm, s 150, Ø12, other length 3.55 m → **29 bars**, As **754.0 mm²/m**, **102.95 m**, **91.42 kg** (table 0.888).
10. **Falls.** 1 % over 12 m with 30 mm minimum → drop **120 mm**, max **150 mm**, average **90 mm**. Over 12 × 10 m that is **10.8 m³**. A bathroom at 1 % over 1.80 m gives a drop of **18 mm**.

**Trades beyond civil (Phase 4).** Electricians, plumbers, HVAC technicians, drywall fixers and steel fabricators are a large share of foremen, so four more tiles ship with the MEP checks. Each has the same simple mode (colloquial questions, one per screen), feeds the material request, and keeps a no-price schema enforced by the token test (§3.0).
- **«الكهربائي».** Points and boxes per room; wire or conduit length per run + 10 % [M]; and the wire size for a breaker from a fixed conservative table in the `iec60364-2009@1` profile, labelled «للتوريد فقط — الحساب في أداة الكابلات». Vector: 6 rooms × 8 points, runs Σ 180 m → **198 m** of wire, **48 boxes**.
- **«السباك».** PPR or UPVC pipe count from run lengths in 4 m lengths, ceil(ΣL / 4); a fittings allowance (default 1 fitting per 1.5 m [L ⚑]); and the existing falls mode. Vector: runs 7.5 + 12.0 + 5.3 m → 24.8 m → **7 lengths**, **17 fittings**.
- **«الجبس بورد».** Boards, studs, tracks and screws from the `finishTakeoff` formulas: boards = ceil(A(1 + w)/2.88); studs at 0.60 m; tracks = 2 × run; screws 30 per m² per layer [M]. Vector: partition 6.0 × 3.0 m, one board each side, waste 10 % → **14 boards** (13.75), **11 studs**, **12 m** of track.
- **«حديد الهياكل».** Section weight from an IPE / HEA / UPN / L / RHS table (kg/m from the section tables [H]) × length × count. Vector: 12 × IPE 200 × 6.0 m at 22.4 kg/m → **1,612.8 kg**.

**WhatsApp summary.** «طلب خامات · MR-0007 · مسودة» · up to 4 lines «أسمنت 8 شكاير · رمل 1.2 م³ · طوب 577» · «تقدير — راجع المستند الكامل» (§5a Delivery).

**Liability note (screen and PDF).** «تقدير للطلب والتجهيز على الموقع. نسب الخلطات والهالك قيم شائعة قابلة للتعديل ولا تغني عن الخلطة المعتمدة ولا عن المواصفات. أحجام الجردل والعربية حسب معايرتك.» In English: an estimate for ordering and preparing on site. The mix ratios and waste figures are common values that can be changed. They do not replace the approved mix or the specification. Bucket and wheelbarrow sizes follow your own calibration.

---

### 3.2 `concrete`: حصر وصب الخرسانة (Concrete take-off & pour planner)

**Purpose.** A `concrete` document has `scope: "takeoff" | "pour"`.
- A **take-off** covers the whole building: up to 400 elements, each with its own mix, grouped into `pours[]` (pour · date · grade · element ids). It totals net and order m³ by grade, formwork, and the cement, sand and gravel per mix for site-mixed work, which most private Egyptian buildings use. «أنشئ خطة صب» on a pour spawns a pre-filled pour plan that links back to it.
- A **pour plan** is one document per pour.

A pour plan covers:
- a precedence-aware element take-off with formwork as a by-product;
- the order volume, number of trucks, arrival interval, fleet size and duration;
- crew, a cold-joint guard and the cube plan;
- a curing, striking and cube-test calendar.

The output is a «خطة صب» (pour plan) PDF that doubles as the pour request, plus a WhatsApp summary.

**Screen flow.** The tool home lists pour plans, plus «حساب سريع» (the old single-element calculator, unsaved). A document has eight sections:
1. **البيانات (data).** Project, zone and level, pour date and start time, grade (C15–C60; old «C250» notation is accepted as 25 MPa), supplier, target slump (editable defaults [L] ⚑), cement type (OPC / blended).
2. **العناصر (elements).** A `RowEditor` with a type chip, dimensions as `UnitField`s and a count. Each row shows live net m³ and m² of formwork. The waste % defaults by element type and can be edited. A precedence hint appears per row, for example «الأعمدة حتى بطنية البلاطة».
3. **الطلب (order).** Truck load (m³), practical pump output, plant allocation, crew capacity, one-way travel (min), setup and cleanup (min), pump priming loss.
4. **الوصلات الباردة (cold joints).** Layer thickness, time to cover (t_cover), and the plan area of the strip.
5. **المكعبات (cubes).** Sampling rule, cubes per set, spares.
6. **الفك والمعالجة (striking and curing).** Spans, temperature band and cement type, which together produce the calendar.
7. **الطاقم (crew).** A suggested crew per pump [L] that can be edited.
8. **Result hero:** «اطلب 122.9 م³ · 14 خلاطة · خلاطة كل 18 د · 6 على الطريق · 5 س 21 د».
9. **سجل الخلاطات (truck log, on pour day).** One row per arriving truck: ticket no. · batch time · arrival · slump (mm) · concrete °C · accepted / rejected with a reason. Discharge time (arrival − batch) is checked against the discharge limit, rejected loads are excluded from the delivered m³, and the log feeds the diary's pours section and, in wave 2, `cubeLog`.

The sticky bar holds «تصدير PDF» and «ملخص واتساب». The WhatsApp summary names the order quantity, not the net volume, because the batch plant reads it as the order: «صب البلاطة دور 3 · صافي 120 م³ · اطلب 122.9 م³ C30 · 14 خلاطة كل 18 د · البداية 07:00 · 3 مجموعات مكعبات».

**Element kinds and formulas** (all [H] geometry unless marked).

| Kind | Volume | Formwork |
|---|---|---|
| Blinding | (L + 2p)(B + 2p)·t, p 0.10 [L], t 0.10 [M] | edges |
| Isolated footing, rectangular | L·B·H | perimeter · H |
| Isolated footing, sloped | L·B·h₁ + (h₂/6)·(A₁ + A₂ + 4·A_m), A_m = ((L + a)/2)·((B + b)/2) (prismoidal, exact for any rectangular top; the frustum form is exact only for similar rectangles) | perimeter · h₁ |
| Combined / strap footing | H·(B₁ + B₂)/2·L + strap b·h·L_clear | sides |
| Raft | A·t + Σ b·Δh·L (thickenings) + pits | perimeter · t |
| Tie beam | Σ L_clear·b·h | 2·h·L, or 0 if cast against soil |
| Neck column | a·b·(top of footing → top of tie beam) | perimeter · h |
| Column, rectangular / round | a·b·h / π d²/4 · h, h measured from the finished slab below to the soffit of the slab above (FFL–FFL − slab t), warning outside 2–6 m; a column measured to the beam soffit is refused by the precedence check | perimeter · h |
| Beam | entered as on the drawing: b · total h · slab t · clear span (between column faces); drop = h − t (error when negative) | (2·drop + b)·L |
| Solid slab | A_net · t, deducting openings above the profile threshold (0 / 0.05 m³ / 0.1 m² [M]) | soffit − beam widths + edge perimeter · t |
| Hourdi slab, one-way | c = t_s + h_b·b_rib/s per m², blocks = 1/(s·l_block) | full deck + edges |
| Hourdi slab, two-way | c = t_s + h_b(1 − a_b·b_b/(s₁s₂)) | full deck + edges |
| Hourdi solid strips | Σ b·h·L (solid bands at beams and edges) | in the deck |
| Blinding «من القواعد» | from the linked footings: (L + 2p)(B + 2p)·t per footing | edges |
| Stair flight | L_incl = n√(R² + G²); waist w·t·L_incl + steps n·R·G/2·w + landings | L_incl·w + n·R·w + 2 stringers |
| Wall, custom | L·t·H / L·W·H | 2·L·H |

**Hourdi limits** [M]: rib ≥ 10 cm, clear spacing ≤ 70 cm, topping ≥ max(5 cm, clear/10). These are shown as warnings.

**Precedence order** (prevents double counting): lean → footing/raft → neck → tie beam → column (to soffit) → beam (drop only) → slab → stairs.

**Waste, mixes and measurement** [M unless marked].
- Waste is applied **once, per element**. Setting a separate order waste as well raises the error `conc.doubleWaste`.
- Site-mixed work adds +4 % [L] to the order.
- A measurement preset picks the deduction threshold and precedence wording: «العرف المصري» (default) or SMM7 [M].
- Mixes (per m³): RC 350 kg cement · 0.4 m³ sand · 0.8 m³ gravel · 175 L water [M]; plain 250 / 0.4 / 0.8 / 140 [M]; lean 200 / 0.45 / 0.8 / 135 [L]. Every element carries a mix id.
- **Materials:** order m³ × mix; bags = ceil(cement / 50).
- **Yield check** [H arithmetic]: cement/3150 + water/1000 + (sand + gravel)·ρ_bulk/2650 + air, with ρ_bulk 1,600 kg/m³ [M] and air 1.5 % [M]; a warning outside 1 ± 5 %.

**Pour planner** [H method, Caltrans example; defaults [M]/[L]].
```
Q_eff     = min(pump_practical, plant_allocated, crew_capacity)            // the governing one is named
V_order   = Σ V_net,i·(1 + w_i) + priming_loss                             // waste applied once, per element
trucks    = ceil(V_order / load)
interval  = load / Q_eff · 60                                              // min between arrivals
cycle     = load_time + 2·travel + interval + wash_wait
fleet     = ceil(cycle / interval) + 1 spare
duration  = setup + V_order / Q_eff · 60 + cleanup                         // min; end time = start + duration
A_max     = Q_eff · t_cover/60 / layer                                     // cold-joint guard
```

Pour-planner defaults:

| Parameter | Default | Range / note | Confidence |
|---|---|---|---|
| Truck load | 9 m³ | 6–12 | [M] |
| Pump practical output | slab 30 m³/h, raft 40 m³/h | — | [M] |
| Load time | 10 min | — | [L] |
| Wash and wait | 12 min | — | [L] |
| Setup | 45 min | — | [L] |
| Cleanup | 30 min | — | [L] |
| Priming loss | 0.5 m³ | 0.5–1 | [L] |
| t_cover | ≤ 25 °C → 120 min; 25–32 °C → 90 min; > 32 °C → 75 min (all editable; the brief gives 120–150 min at 20–25 °C and 60–90 min in the Egyptian summer) | — | [M] |
| Discharge limit | 90 min (60 min above 32 °C), warning only | — | [L] |

**Cubes** [L, configurable].
- Rule `perVolume`: sets = max(minSets, ceil(V_order / volPerSet)), with volPerSet 50 and minSets 1.
- Rule `first50then100`: sets = 1 + ceil(max(0, V − 50) / 100).
- Cubes per set: 6 (3 at 7 days + 3 at 28 days), plus 3 spares per set when spares are on (Egyptian 9-cube practice).
- Cube size: 150 mm, or 158 mm [L], or 100 mm with a 0.97 factor [L].
- One extra set whenever the mix, supplier or element changes.
- Results are recorded, never judged: there is no acceptance verdict in v1.

**Calendar** [L/M, table in the profile].

| Item | Minimum time |
|---|---|
| Vertical sides | 48 h ≥ 21 °C, 72 h < 21 °C |
| Slab sides | 3 d |
| Beam soffits | 7 d |
| Slab props, span ≤ 4.5 m | 7 d |
| Slab props, span > 4.5 m | 14 d |
| Beam props, span ≤ 6 m | 14 d |
| Beam props, span > 6 m | 21 d |
| Curing, OPC | 7 d [M] |
| Curing, blended cement | 10 d [M] |
| Cube tests | 7 d and 28 d |

**Engine API** (`src/domain/tools/concrete-calc.ts`, prefix `conc`).
```ts
export type ConcElement = { id: string; kind: ConcKind; label: string; n: number; dims: Record<string, number>; wastePct?: number; openingsM3?: number;
  mixId?: string; grade?: string; againstSoil?: boolean };
export function concVolume(e: ConcElement, p: ConcProfile): { netM3: number; formworkM2: number; checks: Check[]; trace: TraceStep[] };
export type ConcMix = { id: string; name: string; cementKg: number; sandM3: number; gravelM3: number; waterL: number };
export function concMaterials(orderM3: number, mix: ConcMix, bagKg: number): { cementKg: number; bags: number; sandM3: number; gravelM3: number; waterM3: number };
export function concMixYield(mix: ConcMix, d: { bulkKgM3: number; sg: number; airPct: number }): number;
export function concTakeoff(els: ConcElement[], p: ConcProfile): {
  rows: { id: string; netM3: number; orderM3: number; formworkM2: number }[];
  netM3: number; orderM3: number; formworkM2: number; warnings: ConcWarn[] };
export function concPour(i: { orderM3: number; primingM3: number; loadM3: number; pumpM3h: number; plantM3h: number;
  crewM3h: number; travelMin: number; loadMin: number; washMin: number; setupMin: number; cleanupMin: number; startIso: string }): {
  vOrderM3: number; qEff: number; governs: "pump" | "plant" | "crew"; trucks: number; intervalMin: number;
  cycleMin: number; fleet: number; durationMin: number; endIso: string };
export function concColdJoint(qEffM3h: number, tCoverMin: number, layerM: number, stripAreaM2: number): { aMaxM2: number; ok: boolean; maxStripWidthM?: (lenM: number) => number };
export function concCubes(vOrderM3: number, rule: ConcCubeRule): { sets: number; cubes: number; spares: number };
export function concCalendar(pourIso: string, i: { spansM: { slab?: number; beam?: number }; airC: number; cement: "opc" | "blended" }, p: ConcProfile): { item: string; dateIso: string; basis: string }[];
```

**Saved document.**
```ts
type ConcTakeoffBody = { scope: "takeoff"; rule: "egPractice" | "smm7"; deductThreshold: number; siteMixed: boolean;
  elements: ConcElement[] /* ≤ 400 */; mixes: ConcMix[]; pours: { id: string; date: string; grade: string; elementIds: string[]; planId?: string }[] };
type PourPlanBody = {
  scope: "pour"; takeoffId?: string;
  zone: string; level: string; pourAt: string; grade: string; supplier: string; slumpMm?: number; cement: "opc" | "blended";
  elements: ConcElement[];                      // ≤ 200
  order: { loadM3: number; pumpM3h: number; plantM3h: number; crewM3h: number; travelMin: number; primingM3: number;
           loadMin: number; washMin: number; setupMin: number; cleanupMin: number };
  coldJoint?: { layerM: number; tCoverMin: number; stripAreaM2: number };
  cubes: ConcCubeRule; crew: { role: string; n: number }[]; airC: number; spans: { slab?: number; beam?: number };
  qcPrepourId?: string;                         // link to a QA/QC «ما قبل صب الخرسانة» inspection
  trucks?: { ticket: string; batchAt: string; arriveAt: string; slumpMm?: number; tempC?: number; m3: number; ok: boolean; reason?: string }[];   // ≤ 120
};
// profile snapshot: ecp203-site@1 → waste table, deduction threshold, cube rules, striking/curing table, hourdi limits, logistics defaults
```

**PDF «خطة صب · Pour plan» (PP).**
- **Page 1:** the title block; pour data as a key-value grid (date, start → end, element, zone, grade, supplier, slump, cement type); and the result KPIs (order m³, trucks, interval, fleet, duration).
- **Take-off table:** # · العنصر · العدد · الأبعاد (م) · الصافي (م³) · الهالك % · المطلوب (م³) · الشدة (م²), with a totals row.
- **Logistics:** a key-value grid showing which factor governs, Q_eff, cycle and fleet, followed by an **arrival schedule** table (truck n · planned arrival time · cumulative m³). This is the table the site actually works from.
- **Checks:** cold joint (A_max against the strip), the discharge limit, hot weather, and the hourdi limits.
- **Cube plan:** sets, cubes and the test dates.
- **Crew table.**
- **Calendar table:** the striking, curing and cube-test dates.
- **Link:** the QA/QC pre-pour inspection number and verdict, if linked.
- **Truck log** (once the pour has started): ticket · batch → arrival · discharge min · slump · °C · m³ · accepted / rejected, with delivered m³ against ordered m³.
- **Signatures:** contractor site engineer · consultant inspector («إذن صب») · batch-plant representative · stamp.

**PDF «كشف حصر الخرسانة والشدات · Concrete & formwork take-off» (CT, portrait)** for `scope: "takeoff"`: an assumptions grid (measurement preset, precedence, deduction threshold, waste basis); the element table (# 8 · element & location 44 · n 10 · dimensions 40 · net m³ 18 · waste % 12 · order m³ 18 · formwork m² 24 mm) with grade sections and carried-forward net, order and formwork; a summary by grade; materials by mix; hourdi blocks; the pour grouping with cube sets; the basis block; signatures أعدّه · راجعه · الاستشاري and a stamp.

**Test vectors** (`tests/tools/concrete-calc.test.ts`).
1. **Sloped footing.** 2.0 × 2.0 m, h₁ 0.30, h₂ 0.30, top 0.6 × 0.6 → sloped part **0.556 m³**, total **1.756 m³** (similar rectangles, so the prismoidal and frustum forms agree).
   - **1b.** Base 3.0 × 1.5, h₁ 0.30, top 0.3 × 0.6, h₂ 0.30 → prismoidal sloped part **0.5805 m³**, total **1.9305 m³** (the frustum form would give 0.5580, 3.9 % low).
   - **K1.** 4 footings 2.0 × 2.0 × 0.6, blinding «من القواعد» p 0.10, t 0.10 → **9.600 m³**, formwork **19.200 m²**, blinding **1.936 m³**.
   - **K5.** 9.6 m³ net at 5 %, RC mix → order **10.080 m³**; cement 3,528 kg = **71 bags**; sand **4.032 m³**; gravel **8.064 m³**; yield **1.0256** at ρ_bulk 1,600 and air 1.5 % → no warning.
   - **K6.** Cube sets for 120 / 42 / 260 m³ → `perVolume` **3 / 1 / 6** (18 / 6 / 36 cubes without spares); `first50then100` **2 / 1 / 4**.
   - **K7.** 12 columns 0.30 × 0.60, FFL–FFL 3.20, slab 0.15 → **6.588 m³**, formwork **65.880 m²**; 6 beams b 0.25, h 0.60, slab 0.15 (drop 0.45), span 4.70 → **3.1725 m³**, formwork **32.430 m²**. A beam with h 0.12 under a 0.15 slab → error (negative drop). Setting order waste on top of element waste → `conc.doubleWaste`.
2. **Hourdi slab.** One-way, block 40 × 20 cm (h 0.20), rib 0.10, topping 0.05 → **0.090 m³/m²**, **10 blocks/m²**.
3. **Stair flight.** n 10, R 0.16, G 0.30, w 1.2, t 0.15 → L_incl **3.400 m**, waist **0.612**, steps **0.288**, total **0.900 m³**.
4. **Slab pour.** V_net 120, waste 2 %, priming 0.5, load 9, pump 30 / plant 60 / crew 40, travel 25, load 10, wash 12, setup 45, cleanup 30 → V_order **122.9**, **14 trucks** (13.66), interval **18 min**, cycle **90 min**, fleet **6**, duration **320.8 min (5.35 h)**; the pump governs. Cubes: `perVolume` gives **3 sets** (27 cubes with spares); `first50then100` gives **2 sets**.
5. **Raft pour.** V_net 480, waste 3 %, priming 1.0, load 10, Q_eff 40, travel 30, wash 15, setup 60, cleanup 30 → V_order **495.4**, **50 trucks**, interval **15 min**, cycle **100 min**, fleet **8**, duration **833.1 min (13.9 h)**, **10 cube sets**.
   - Cold joint: Q 40, t_cover 120, layer 0.5 → A_max **160 m²**. A 30 × 20 m raft (600 m²) gives a **warning**: the maximum strip width over a 20 m length is 8 m.
   - At 30 °C the default t_cover is 90 min: Q 40, layer 0.5 → A_max = 40 × 1.5 / 0.5 = **120 m²**.
6. **Calendar.** Pour on 2026-10-10 at 25 °C, OPC, slab span 4.2 m, beam span 6.5 m:
   - vertical sides **2026-10-12**
   - slab props **2026-10-17**
   - beam props **2026-10-31**
   - curing ends **2026-10-17**
   - cube tests **2026-10-17** and **2026-11-07**

**Liability note.** «تقدير للحصر وتخطيط الصب. قيم الكود (المكعبات، أزمنة الفك والمعالجة، الهبوط) افتراضية حسب ملف الكود ويجب مطابقتها بالمواصفات المعتمدة والكود المصري 203 والخلطة التصميمية؛ القرار الفني للمهندس المسؤول.» In English: an estimate for take-off and pour planning. The code values (cubes, striking and curing times, slump) are defaults from the code profile. They must be checked against the approved specification, the Egyptian code 203 and the design mix. The technical decision rests with the responsible engineer.

---

### 3.3 `bbs`: جدول تفريد وقص الحديد (Bar bending schedule & cutting optimiser)

**Purpose.** A BBS that names its code. It has:
- BS 8666:2020 shape codes with sketches;
- cut lengths computed from the formula, with the bend radius taken from the code profile;
- theoretical weights from the published table;
- a cutting optimiser for 12 m stock that draws a diagram for each stock bar, numbers the cut order, reuses remnants and keeps a remnant store per project.

Steel fixers cut from this every day, and the waste it saves is real tonnage.

**Screen flow.**
- **Tool home.** A list of schedules, the quick mode (the old weight calculator: Ø, count and length give kg and 12 m bars) and «مخزن البواقي» (remnant store, per project).
- **Document tabs:** «الجدول» (schedule) · «الملخص» (summary) · «خطة القص» (cutting plan).
  - **Header:** member group, drawing reference and revision, concrete fcu (used for laps), code profile (`ecp203-2020-bbs@1` default; `bs8666-2020@1` and `aci318-19@1`, see «Laps under other profiles»), steel grade, cover, rounding (25 mm default [M]; options 0 / 5 / 10 / 25).
    - Grade picklist: B500DWR · B500B-R · B420DWR · B400DWR · B400B-R · B400C-R · B350DWR · B300 · B240B-P, and the legacy ECP designations 24/35 · 28/45 · 36/52 · 40/60 (fy derived; the mapping to modern grades is [L ⚑]). Free text is allowed with a typed fy. Older drawings default to B400 (40/60) [H/M].
  - **Bar lines** are cards in a windowed `RowEditor` (card mode fits a 360 px phone; the dense grid is only for review and landscape):
    - collapsed, a card reads «01 · Ø16 · [21] · 24 × 2,875 · 71.67 kg»;
    - expanded: member and mark (auto 01, 02…); position «علوي / غير ذلك» (top bar, which sets η); Ø chips (6–32; 36 and 40 marked «بالطلب», made to order); a shape picker (a grid of sketches with 00, 11, 21, 51 and 63 pinned first; the chosen sketch shows letters A–E, and the inputs follow the letters); number of members × number per member as `KitStepper`s;
    - live: total number, cut length (exact and rounded), total m and kg, and inline checks;
    - «＋ بند» copies the member and Ø of the line above; delete has undo.
    - A line longer than the stock is flagged and offers a lap or special-length stock. The default lap is **1.3·Ld**, because wave-1 splices are not staggered (see Splicing).
  - **Summary:** per Ø, the total m, kg/m, kg and t (3 dp), plus the grand total. The procurement view is a separate box: laps, optimiser scrap %, and a mill under-rolling margin of 2–5 % [M] for metres per tonne.
  - **Cutting plan:** «احسب خطة القص» runs the worker. For each Ø it shows:
    - KPIs: new bars, the naive count, the lower bound, the optimality word and kg saved;
    - one strip per pattern with repetitions and a numbered cut order; marks are labelled and colours come from a palette defined for both themes, so colour is never the only cue; scrap is hatched and a remnant is outlined with its R-nn tag;
    - scrap %, and remnants that can be sent to the store («أضف للمخزون»).

**Shapes in wave 1.** These are the BS 8666:2020 formulas from the brief, with r the minimum scheduling radius from the profile:

| Code | Cut length | Confidence |
|---|---|---|
| 00 | A | [H] |
| 11 | A + (B) − 0.5r − d | [H] |
| 12 | A + (B) − 0.43R − 1.2d | [H] |
| 13 | A + 0.57B + (C) − 1.6d | [H] |
| 21 | A + B + (C) − r − 2d | [H] |
| 22 | A + B + C + (D) − 1.5r − 3d | [M] ⚑ |
| 23 | A + B + (C) − r − 2d | [M] ⚑ |
| 25 | A + B + (E) | [H] |
| 26 | A + B + (C) | [H] |
| 31 | A + B + C + (D) − 1.5r − 3d | [M] ⚑ |
| 33 | 2A + 1.7B + 2(C) − 4d | [H] |
| 41 | A + B + C + D + (E) − 2r − 4d | [H] |
| 51 | 2A + 2B + max(16d, 160) (minimised form) | [H] |
| 63 | d ≤ 16: 2A + 3B + max(14d, 140); d ≥ 20: 2A + 3B + 13d | [H] |
| 77 | C·π(A − d), or C·√((π(A − d))² + B²) when B > A/5 | [H] |
| 99 | Free sketch: straight segments measured to the tangent intersections, deflection angles θᵢ ≤ 90° in radians; L = Σ straights − Σᵢ 2(r + d)·tan(θᵢ/2) + Σᵢ θᵢ·(r + d/2) (exact centre line; for θ = 90° the deduction is the familiar 2(r + d)). Bends over 90° (135° / 180° hooks) are drawn as hook segments with the BS 8666 end-length convention, not as intersection dimensions | [H] |

**Bend radius r** (integer mm, in `ecp203-2020-bbs@1`). Where BS 8666:2020 Table 2 lists the size, its minimum scheduling radius is used: 6 → 12 · 8 → 16 · 10 → 20 · 12 → 24 · 16 → 32 · 20 → 70 · 25 → 87 · 32 → 112 · 40 → 140 [M]. For sizes the table does not list, r = 2d for d ≤ 16 and r = 3.5d for d > 16 (EC2 mandrels 4φ / 7φ), so Ø14 → 28, Ø18 → 63, Ø22 → 77, Ø28 → 98, Ø36 → 126 [H rule; the ECP bend table was not retrieved ⚑]. Ø18 is common in Egypt and must never fall on the small mandrel. **Weight** uses the 3-decimal table: 6 → 0.222 · 8 → 0.395 · 10 → 0.617 · 12 → 0.888 · 14 → 1.208 · 16 → 1.578 · 18 → 1.998 · 20 → 2.466 · 22 → 2.984 · 25 → 3.853 · 28 → 4.834 · 32 → 6.313 · 36 → 7.990 · 40 → 9.865 [H]. The PDF line multiplies by the table value, so a consultant's line-by-line check matches.

**Which length governs.** The governing cut length is the **BS formula** value, rounded up to the profile step. A checker can reproduce it from the printed formula. The exact centre-line value (with the tan(θ/2) deduction above) is computed as a self-test, and a difference over 5 mm adds a note. Shape 99 has no BS formula, so its exact value governs. «قاعدة الموقع» (deduct 2d per 90° bend, 3d per 135°) is an optional comparison column only.

**Development and lap length** (`bbsLd`, ECP profile only). Ld = α·β·η·(fy/γs)·Φ / (4·fbu), with fbu = 0.30·√(fcu/γc), γs = 1.15 and γc = 1.5 [H; this reproduces the 87Φ worked example].
- β = 0.75 (deformed) [H]; α = 1.0 straight [H], 0.7 hooked [L ⚑].
- η = 1.3 for top bars [H], 1.0 otherwise. Each line has `pos: "top" | "other"`; **when the position is unknown, η = 1.3** (the conservative case, 23 % longer).
- **Plain grades** (`-P`, 24/35, 28/45) are not computed: β and fbu for plain bars are unverified [L/M]. The member types the lap (minimum 400 mm, hooks required) and the PDF prints «طول الوصلة مُدخل».
- Minimum 300 mm deformed, 400 mm smooth [M].
- Lap = Ld only when ≤ 50 % of the bars are spliced at one section and the splices are staggered with centres ≥ 1.3 Ld apart; otherwise 1.3 Ld [M]. Laps are rounded up to 25 mm and are never below 300 mm. The lap is a computed default the user can override with a reason.
- **Laps under other profiles.** `bs8666-2020@1` is a scheduling standard with no Ld formula, and the ACI 318-19 ld formula is not implemented in wave 1. Under either profile the lap is locked to a value the member types, and its source is printed («وصلة 800 مم — المصدر: لوحة S-05»). The ACI formula arrives with `lapLength` (§4.1) and then feeds the BBS. Choosing ACI never produces an ECP lap silently.

**Cutting optimiser** (`bbs-optimise.ts`, prefix `cut`, run in a Web Worker).
- **Units.** Integer mm. Stock is 12,000 mm by default [H]; 6–24 m is selectable.
- **Settings.**

| Setting | Default | Range | Confidence |
|---|---|---|---|
| Kerf | 0 (shear) | — | [M] |
| End trim | 0 | 0–50 mm | — |
| L_min (shortest usable remnant) | max(floor, shortest length still open in the project's *other* schedules of that Ø and grade); just the floor when nothing else is open | floor 1,000 mm, settable 1,000–1,500 mm | [M] |

- **Pipeline for each (Ø, grade) group:**
  1. Remnants from the store are used first (priority-in-use).
  2. FFD and BFD run as a baseline. This is always done, and it is also the fallback.
  3. Pattern-based integer optimisation: Gilmore–Gomory column generation over a small, self-written dense simplex, with bounded-knapsack DP pricing on a 5 mm grid. The LP solution is floored, then the residual is solved exactly by branch-and-bound up to 12 pieces, or by FFD beyond that.
  4. The best of steps 2 and 3 is kept under the lexicographic objective: new bars ↓, scrap mm ↓, number of remnants ↓, **longest single remnant ↑** (offcuts concentrated in one useful piece), total remnant length ↑, number of patterns ↓.
- **Budget.** 300 ms per diameter, with a deterministic seed and tie-breaks so results can be reproduced.
- **Output.** The material lower bound LB = ⌈Σlᵢnᵢ/L⌉, the LP bound ⌈LP⌉ from column generation, the FFD count and the naive baseline (each mark cut alone).
- **Optimality word.** «أمثل» (`proven`) only when newBars = max(LB, ⌈LP⌉); «في حدود سيخ واحد من الأمثل» (`withinOne`) when newBars ≤ ⌈LP⌉ + 1; otherwise «النتيجة N · الحد الأدنى M» (`heuristic`). When the LP was not solved (method `ffd` after the budget ran out), no claim is printed.
- **Splicing.** Pieces over the stock length are split with **lap = 1.3·Ld** (rounded up to 25 mm, ≥ 300 mm), because wave-1 splices are not staggered: every bar of the mark is spliced at the same section, so 100 % are spliced there. The member may switch a mark to «متخالفة» (staggered: ≤ 50 % per section, centres ≥ 1.3 Ld apart), which uses lap = Ld and prints that declaration. Laps are added to the totals and printed. Moving the splice point automatically is not in wave 1.
- **Remnant store** (`rebarStock`, one per project). Each item has Ø, grade, length, the document that produced it (`fromDoc`) and `usedBy` once a plan consumes it. Plans tag remnants R-01, R-02… so the steel fixer can chalk them. A plan reserves the remnants it uses and releases them when it is recomputed.

**Checks** (`Check.id`):
- `bbs.dupMark` error: a mark used twice in the document;
- `bbs.notMult5` warning: a dimension that is not a multiple of 5;
- `bbs.shortLeg` warning: a leg or hook below the BS 8666 minimum P for that Ø (profile table);
- `bbs.rBelowMin` warning: a radius override below the profile minimum;
- `bbs.siteRuleDelta` warning: the site rule differs from the exact length by more than 25 mm;
- `bbs.overStock` warning: a line longer than the stock with no lap chosen;
- `bbs.lapTyped` info: the lap was typed (plain grade or non-ECP profile).

**Engine API** (prefixes `bbs` and `cut`).
```ts
export const BBS_ENGINE = "bbs@1.0.0";
export const BBS_KG_PER_M: Readonly<Record<number, number>>;
export function bbsRadius(d: number, p: BbsProfile): number;
export function bbsCutLength(shape: BbsShape, dims: BbsDims, d: number, p: BbsProfile): {
  formulaMm: number | null; roundedMm: number; exactMm: number; formula: string; siteRuleMm?: number; checks: Check[]; trace: TraceStep[] };   // formulaMm null for shape 99
export function bbsLine(l: BbsLine, p: BbsProfile): { totalNo: number; cutMm: number; totalM: number; kgPerM: number; kg: number };
export function bbsSummary(lines: BbsLineOut[]): { d: number; totalM: number; kg: number; t: number }[];
export function bbsLd(i: { fy: number; fcu: number; d: number; grade: string; pos: "top" | "other" | "unknown"; hooked?: boolean; staggered?: boolean }, p: BbsProfile): {
  fbu: number; ldPhi: number; ldMm: number; ldRoundedMm: number; lapMm: number; lapRoundedMm: number; typedRequired: boolean; trace: TraceStep[] };
export type CutDemand = { mark: string; lenMm: number; n: number };
export function cutLowerBound(demand: CutDemand[], stockMm: number): number;
export function cutNaive(demand: CutDemand[], stockMm: number): number;
export function cutFfd(demand: CutDemand[], stockMm: number, o?: CutOpts): CutPlan;
export function cutPlan(demand: CutDemand[], stockMm: number, o: CutOpts & { remnants?: number[]; budgetMs?: number }): CutPlan;
export type CutPlan = { patterns: { cuts: { mark: string; lenMm: number }[]; reps: number; offcutMm: number; offcut: "scrap" | "remnant" | "none"; fromRemnant?: string; tag?: string }[];
  newBars: number; scrapMm: number; remnantsMm: number[]; remnantsUsed: string[]; lowerBound: number; lpBound: number | null; ffdBars: number; naiveBars: number;
  method: "lp" | "ffd"; optimality: "proven" | "withinOne" | "heuristic" | null };
```

**Saved documents.**
```ts
type BbsBody = { group: string; drawingRef: string; drawingRev: string; grade: string; fy: number; fcu: number; coverMm: number;
  roundingMm: 0 | 5 | 10 | 25; lines: BbsLine[];               // ≤ 800 lines; > 800 → «جدول جديد» (new schedule)
  plan?: Record<string /* d */, CutPlan>; planInputsHash?: string };   // a stale plan is flagged when the lines change
type BbsLine = { id: string; member: string; mark: string; d: number; grade?: string; pos: "top" | "other" | "unknown"; shape: BbsShape; dims: BbsDims;
  nMembers: number; nPer: number; rOverride?: number; rev?: string;
  lap?: { mode: "auto" | "staggered" | "typed"; mm?: number; source?: string; reason?: string } };
type RebarStockBody = { projectId: string; items: { id: string; tag: string /* R-01 */; d: number; grade: string; lenMm: number; n: number;
  fromDoc?: string; usedBy?: string; at: number }[] };
// profile snapshot: radius rule, rounding, kg/m table, Ld factors, cover, L_min, kerf, end trim, stock length
```

**PDF «جدول تفريد الحديد · Bar bending schedule» (BBS).** Schedule and cutting pages are A4 landscape; the summary is portrait.
- **Title block:** adds drawing reference and revision, member group, code profile, steel grade, cover and lap basis.
- **Schedule table columns** (mm, 261 in all): Member 38 · Mark 12 · Type & Ø 16 · No. mbrs 11 · No. each 11 · Total no. 12 · Shape 10 · A 12 · B 12 · C 12 · D 12 · E/R 12 · Sketch 22 (a vector mini-sketch with letters) · Cut length (mm) 15 · Total length (m) 16 · kg/m 12 · Weight (kg) 18 · Rev 8.
  - Member section rows are kept with the next 2 rows.
  - The header repeats on every page.
  - Weight subtotals carry forward with «يُرحّل / ما قبله» rows.
- **Appendix A:** summary by Ø (m, kg, t), separated from the procurement allowances.
- **Appendix B:** cutting plan per Ø. A pattern table (# · cuts in mm · reps · offcut · scrap or remnant), one bar diagram per pattern (12 m = 225 mm wide, cuts labelled by mark and length, scrap hatched, remnants outlined and tagged R-nn, «× reps»), a numbered cut order, and KPIs: new bars, naive, lower bound, scrap %, kg saved, and the optimality word under the rule above (never printed when the LP was not solved).
- **Appendix C:** remnants produced and used (tag · Ø · length · from · used by).
- **Appendix D:** bar-tag list (mark, Ø, length, quantity), then the calculation-basis block (§3.0).
- **Signatures:** Prepared (contractor technical office) · Checked (TO manager) · Reviewed (consultant RE), plus a status box (A approved / B approved as noted / C revise and resubmit) and a 40 × 40 mm stamp.

**Test vectors** (`tests/tools/bbs-calc.test.ts`, `tests/tools/cut-optimise.test.ts`).
1. **Shape 11.** Ø16, A 1200, B 400, r 32 → formula **1568 mm**, rounded **1575**, exact centre line **1566.8** (the 1.2 mm difference stays under the note threshold). 24 pieces give **37.800 m × 1.578 = 59.648 kg**.
   - **1b. Ø18 shape 11**, A 1200, B 400, r 63 → **1550.5 mm**, rounded **1575** (r = 3.5d for d > 16).
2. **Shape 21.** Ø20, A 300, B 1500, C 300, r 70 → **1990**, rounded **2000**. **Shape 51:** Ø8, A 500, B 200 → **1560** (minimised form), rounded **1575**.
   - **B2.** Ø12 shape 21, A 300, B 1500, C 300, r 24 → formula **2,052** → cut **2,075**; exact **2,050.25**; 20 bars → 41.500 m → **36.852 kg**.
   - **B4.** Ø25 shape 21, A 500, B 2000, C 500, r 87 → formula **2,863** → cut **2,875**; exact **2,864.59**; site rule **2,900** → `bbs.siteRuleDelta` (+35.4 mm).
   - **B5.** Summary of shape 00 Ø16 A 5000, 4 × 6 (120.000 m, 189.360 kg) + B2 + shape 51 Ø8 A 250 B 550 × 40 (1,760 → 1,775; 71.000 m; 28.045 kg) + shape 11 Ø25 A 1200 B 400 r 87 (1,531.5 → 1,550; × 12 → 18.600 m) → Ø8 28.045 · Ø12 36.852 · Ø16 189.360 · Ø25 **71.666** → **325.923 kg = 0.326 t**.
3. **Ld.** fy 500, fcu 25, Ø16. Top bar (η 1.3) → fbu **1.2247 MPa**, **86.53Φ = 1384.5 mm → 1400**. Bottom bar → **66.56Φ = 1065 → 1075**. fy 400, fcu 30, bottom → **48.61Φ** (the brief's table says 49). fy 400, fcu 25, bottom → **53.25Φ = 852.0 mm**; top → 69.22Φ = 1,107.6 mm.
   - **Laps** (fy 500, fcu 25, Ø16): top, not staggered → 1.3 × 1384.5 = 1799.8 → **1800 mm**; bottom → 1.3 × 1065.0 = 1384.5 → **1400 mm**; top, staggered → lap = Ld → **1400 mm**.
   - Position unknown, Ø16 B500DWR, fcu 25 → η 1.3 → Ld **1400 mm**.
   - A B240B-P line → `typedRequired: true` and no computed lap. Profile `aci318-19@1` → lap typed, never an ECP value.
4. **Cutting v1.** Stock 12,000; demand 4500×10, 3000×6, 2400×8 (Σ 82,200 mm) → lower bound **7**, plan **7 bars**, Σ offcut **1800 mm** (one 1800 mm remnant, since ≥ L_min, and scrap 0), naive **9** → saves **2 bars**, 37.87 kg at Ø16.
5. **Cutting v2.** Optimiser beats FFD. Demand 4400×4, 3800×4, 3600×4 (Σ 47,200) → FFD **5 bars**, pattern optimiser **4 bars** (pattern [4400, 3800, 3600] × 4, offcut 200 each, all scrap), naive **6**.
6. **Cutting v3.** Demand 24 × **1575** (the governing rounded length from vector 1), L_min 1,000 → **4 bars**, one pattern [1575 × 6] × 4, offcut **2,550** each, Σ **10,200 mm**, scrap **0**, 4 remnants of 2,550. A 7-piece bar would leave 975 < L_min, which is scrap, so 7/7/7/3 loses on scrap.
   - Pure-optimiser check at 1,568: 6/6/6/6 and 7/7/7/3 tie on bars, scrap (0), remnant count (4) and total (10,368); the «longest single remnant» tie-break picks **7/7/7/3**: offcuts 1,024 × 3 + **7,296**, Σ 10,368 — matching the brief.
   - v1 and v2 report `optimality: "proven"` (v2: ⌈LP⌉ = ⌈47,200/12,000⌉ = 4 = result).
7. **Shape 99.** Ø16, r 32, segments 1000 / 500 / 1000 with two 45° bends → **2483.3 mm** (= 2500 − 2 × [96·tan 22.5° − (π/4)·40]), rounded **2500**. Ø20, r 70, same geometry → **2476.5 mm**, rounded **2500**. (The old 2(r + d)-per-bend form gave 2370.8, 112.5 mm short.)
8. **More cutting.**
   - **C2.** Ø20, 3 × 5,000 + 3 × 4,000 + 3 × 3,000 → FFD **4**, naive **4**, plan **3** × [5,000 + 4,000 + 3,000], scrap 0, `proven`; saving **1 bar = 29.592 kg**.
   - **C3.** Ø12, 10 × 2,600, L_min 1,000 → **3 bars**: [2,600 × 4] × 2 (offcut 1,600, remnant) + [2,600 × 2] (remnant 6,800); the longest-remnant tie-break picks this over 4/3/3. With project remnant R-01 = 6,800: R-01 gives 2 pieces (offcut 1,600) + **2 new bars**, `remnantsUsed: ["R-01"]`.

**Liability note.** «جدول للتنفيذ والطلب مبني على أبعاد اللوحات المدخلة. أطوال الثني والتماسك والغطاء من ملف الكود المختار ويجب مطابقتها باللوحات المعتمدة والكود المصري 203؛ الجدول لا يغني عن مراجعة المكتب الفني واعتماد الاستشاري.» In English: a schedule for execution and ordering, built from the drawing dimensions entered. Bend, anchorage and cover lengths come from the chosen code profile and must be checked against the approved drawings and the Egyptian code 203. The schedule does not replace review by the technical office and the consultant's approval.

---

### 3.4 `levelBook`: دفتر الميزانية (Levelling field book + two-peg test)

**Purpose.** An offline level book that is checked as you type:
- rise/fall or height of instrument, with the arithmetic check on every row;
- misclosure against a chosen allowance;
- adjustment by setups or by distance;
- design levels with cut and fill;
- the two-peg instrument check.

Raw readings cannot be changed silently: every late edit goes into the audit. The PDF is the «رفع مشترك» (joint survey) sheet.

**Screen flow.**
- **Header section.**
  - Purpose: TBM transfer · OGL grid · slab levels · road profile · other.
  - Method: HI or rise-and-fall. HI is the default; both checks are shown.
  - Instrument make, model and serial; date and result of the last two-peg test (with a button to the two-peg sub-screen); staff type and length (default 5 m).
  - Opening BM: ID, RL and source (ESA BM / TBM certificate). Closing: a BM (ID and known RL), «حلقة مغلقة» (closed loop, closing on the opening BM), or none for open runs.
  - Allowance preset; observer and booker; weather.
- **Readings (card-first entry).** One reading per row, which fits a 360 px phone with 56 px targets in field mode:
  - point name (auto P1, P2…, CP1…);
  - a type chip [BS] [IS] [FS] [CP = FS then BS];
  - one `NumField` in metres (3 dp), stored as integer mm; the «±» key enters an inverted staff reading as a negative and marks it «مقلوبة»;
  - optional distance, design RL and remark behind «المزيد».
  - Enter moves to the next reading and the keypad stays up. Live columns: HI or rise/fall, RL, cut/fill.
  - The dense grid (Point · BS · IS · FS · Dist · Design RL · Remark) is a review view, and the default in landscape.
- **Sticky check bar** (always visible, pinned above the on-screen keyboard through `visualViewport`): `ΣBS − ΣFS = −1.160 ✓ Σرفع − Σهبوط ✓ آخر − أول ✓`. Once the closing BM or loop is set, it adds `e = −6 مم · المسموح 7.2 مم ✓`.
- **Adjust.** «وزّع خطأ القفل» (distribute the misclosure) is disabled with a reason when the run fails, with the instruction «أعد الميزانية».
- **Readings are in metres (3 dp)** and stored as integer mm.
- **Validation** (`Check.id`):
  - `lvl.firstNotBs` error: the first reading must be a BS on a BM;
  - `lvl.twoBs` error: two BS readings with no FS between them; `lvl.isBeforeBs` error: an IS before any BS;
  - `lvl.overStaff` error: a reading longer than the staff declared in the header («أطول من القامة»);
  - `lvl.longSight` warning: a sight over 100 m; `lvl.unbalanced` warning: a setup whose BS and FS distances differ by more than 10 m (collimation sensitivity);
  - RL range −500 to +9,000 m.
- **Edits.** A reading can be corrected freely for 5 minutes after it was booked. After that the edit writes an `audit` entry with the old and new value; a reason is optional in a draft. An issued book is read-only and changes only through a new revision.

**Allowance presets** (stored in `survey-eng@1`). K is the route length in km, n the number of setups.

| Preset | Formula | Confidence |
|---|---|---|
| Engineering | 12√K mm (default) | [H] |
| Precise | 4√K mm | [H/M] |
| Rough | 24√K mm | [M] |
| Building site | 5√n mm | [M] |
| Project specification | C√K, or a fixed allowance in mm, entered by the user | — |
| Egypt data point | 6√K mm | [L] ⚑, labelled as a data point, not an ESA rule |

**Formulas** [H].
- **HI method.** HI = RL_bs + BS; RL = HI − IS or HI − FS.
- **Check 1.** ΣBS − ΣFS = RL_last − RL_first.
- **Check 2.** Σ(HIᵢ·nᵢ) − ΣIS − ΣFS = Σ RL except the first.
- **Rise and fall.** d = previous reading − current reading. ΣBS − ΣFS = ΣRise − ΣFall = last − first.
- **Misclosure.** e = observed − known.
- **Adjustment by setups.** c = −e·i/N for every point read from setup i.
- **Adjustment by distance.** c = −e·cum/total.
- **Rounding.** Corrections are applied in full precision; adjusted RLs are rounded half away from zero to 1 mm.
- **Closed loop.** The known closing RL is the opening BM's RL.
- **Two-peg test** («اختبار الوتدين (ضبط خط النظر)»). Δh₁ = a₁ − b₁; e = (Δh₂ − Δh₁)/(s_a − s_b) in mm/m; corrected b₂ = b₂ − e·s_b. The limit is ≤ 1 mm per 20 m [M], or as the project specifies.
- **Cut / fill** = RL − design; positive is cut, printed «C 0.750» / «F 0.120».

**Engine API** (`src/domain/tools/level-calc.ts`, prefix `lvl`; every level and reading is an integer mm; the two-peg corrected readings are 0.1 mm floats).
```ts
export type LvlRow = { id: string; pt: string; bs?: number; is?: number; fs?: number; distM?: number; designMm?: number; remark?: string };
export function lvlReduce(rows: LvlRow[], openRlMm: number): {
  pts: { id: string; hiMm?: number; rlMm: number; riseMm?: number; fallMm?: number; setup: number; cumDistM?: number }[];
  sumBs: number; sumIs: number; sumFs: number; sumRise: number; sumFall: number; setups: number };
export function lvlChecks(r: LvlReduced): { check1: boolean; check2: boolean; checkRf: boolean; diffMm: number; check2Lhs: number; check2Rhs: number };
export function lvlMisclosure(r: LvlReduced, closeKnownMm: number, rule: { kind: "sqrtK" | "sqrtN" | "fixed"; c: number; fixedMm?: number }, routeKm?: number): {
  eMm: number; allowMm: number; ok: boolean; ratio: number };
export function lvlAdjust(r: LvlReduced, eMm: number, by: "setups" | "distance"): { id: string; corrMm: number; adjRlMm: number }[];
export function lvlTwoPeg(i: { a1: number; b1: number; a2: number; b2: number; saM: number; sbM: number }, limitMmPer20m: number): {
  eMmPerM: number; per20Mm: number; arcSec: number; ok: boolean; b2CorrMm: number /* 0.1 mm */; a2CorrMm: number /* 0.1 mm */ };
export function lvlCutFill(rlMm: number, designMm: number): { mm: number; kind: "cut" | "fill" | "onGrade"; label: string };
```

**Saved document.**
```ts
type LevelBookBody = {
  purpose: "tbm" | "ogl" | "slab" | "road" | "other"; method: "hi" | "rf";
  instrument: { make: string; model: string; serial: string; twoPeg?: { dateIso: string; per20Mm: number; ok: boolean } };
  staff: string; staffLenMm: number; openBm: { id: string; rlMm: number; source: string };
  close: { bm: { id: string; knownMm: number; source: string } } | { loop: true } | null;
  allow: { kind: "sqrtK" | "sqrtN" | "fixed"; c: number; fixedMm?: number; label: string }; adjustBy?: "setups" | "distance";
  observer: string; booker: string; weather: string; datum: string;
  rows: LvlRow[];                                   // ≤ 1500; each row keeps bookedAt for the 5-minute grace
};
// a change to a raw reading more than 5 minutes after it was booked appends to the document's `audit` (§3.0): { at, path: "rows.<id>.bs", from, to, reason? };
// an issued book is read-only and changes only through a new revision
```

**PDF «دفتر الميزانية · Level book — رفع مشترك» (LB).**
- **Header grid:** project, sheet x of y, date, weather; instrument with its serial and the last two-peg test (date and result); staff; opening and closing BMs with their sources; datum and grid; method; observer and booker.
- **Readings table:** Point · BS · IS · FS · Rise · Fall (or HI) · RL · Dist · Corr · Adj. RL · Design · Cut(+)/Fill(−) · Remarks.
  - Each page ends with «يُرحَّل» (carried forward) sums of ΣBS ΣIS ΣFS ΣRise ΣFall. Each next page starts with a «ما قبله» (brought forward) row.
  - Inverted readings print with «مقلوبة» in the remarks and the minus sign.
  - Edited cells carry †.
- **Check block:** check 1 and check 2 with ✓/✗, the misclosure, the allowance with its formula, K or n, the adjustment rule, and PASS/FAIL.
- **Two-peg appendix**, if run.
- **Edit appendix:** each original value struck through → the new value, time and reason, keyed to the † marks.
- **Signatures:** contractor surveyor · contractor site engineer · consultant surveyor/RE, plus a stamp.

**Test vectors** (`tests/tools/level-calc.test.ts`, the brief's fixture, integer mm).
1. **Reduction.** BM1 100.000; BS 1.250; IS 2.105, −1.630; CP1 FS 0.985 / BS 1.460; IS 1.875; CP2 FS 2.310 / BS 0.755; BM2 FS 1.330.
   - RLs: 99.145, **102.880**, 100.265, 99.850, 99.415, **98.840**.
   - HIs: 101.250 / 101.725 / 100.170.
   - ΣBS **3465**, ΣFS **4625**, ΣIS **2350**, ΣRise **3735**, ΣFall **4895**.
   - Check 1: **−1160 = −1160 = −1160** ✓.
   - Check 2: **600.395 = 600.395** ✓.
2. **Misclosure.** Known BM2 98.846 → e **−6 mm**. K 0.36 km at 12√K → **7.2 mm**, PASS (ratio 0.83). Under 5√n, n 3 → **8.66 mm**, PASS. Under 4√K → **2.4 mm**, FAIL, and the adjustment is refused.
3. **Adjustment.**
   - By setups: A, B, CP1 **+2**; C, CP2 **+4**; BM2 **+6** → 98.846.
   - By distance (CP1 at 120 m, CP2 at 250 m, end at 360 m): **+2.0 / +4.17 → 99.419 / +6.0**.
4. **Two-peg.** a₁ 1.523, b₁ 1.187, a₂ 1.420 at 5 m, b₂ 1.090 at 55 m → e **+0.12 mm/m**, **2.4 mm per 20 m**, **24.75″**, corrected b₂ **1.0834**, a₂ **1.4194** (0.1 mm floats) → **FAIL** at 1 mm per 20 m.
5. **Closed loop (LV3).** BM 50.000, BS 1.500, FS 2.000 (CP1 49.500), BS 1.200, FS 0.690 on the BM; K 0.2 km, n 2 → closes at 50.010, e **+10 mm**; 12√K = **5.37 → FAIL**; 24√K = **10.73 → PASS**; 5√n = **7.07 → FAIL**.
6. **Cut / fill (LV5).** RL 100.350, design 99.600 → **+750 mm, cut, «C 0.750»**.
7. **Validation.** A first reading typed as IS → `lvl.firstNotBs`; BS, BS → `lvl.twoBs`; a 5.120 m reading on a 5 m staff → `lvl.overStaff` (error); the same reading with a 7 m staff declared → no error.

**Liability note.** «دفتر ميداني بحسابات تحقق آلية. القراءات الأصلية لا تُعدّل إلا بسجل. حدود الخطأ المسموح حسب الإعداد المختار أو مواصفات المشروع؛ لا يغني عن اعتماد المساح المختص، والأعمال المساحية القانونية لمساح مرخّص.» In English: a field book with automatic arithmetic checks. Original readings can only be changed through the log. The allowed misclosure follows the chosen setting or the project specification. It does not replace approval by the responsible surveyor, and legal survey work needs a licensed surveyor.

---

### 3.5 `siteDiary`: يومية الموقع (Daily site diary)

**Purpose.** The day's contemporary record, which is the claim evidence under FIDIC 20.1 / 20.2.3 [M]. It is filled in under 5 minutes because it assembles itself:
- Yesterday's crew and equipment carry over as suggestions.
- Today's pour plans, toolbox talks, permits and QA/QC inspections are pulled in as linked rows.
- Photos are stamped with the time and place.
- Delays are logged for the extension-of-time file.
- A weekly roll-up follows in wave 2.

There is **no money field anywhere**.

**Screen flow.**
- **Diary home.** A 14-day calendar strip whose dots show draft / issued / missing, a large «يومية اليوم» button, and a list.
- **Day screen.** Accordion sections, each with a count badge. Empty sections do not print.
  1. **Header and weather.** Report number (auto), date and day, shift and hours, prepared by. Weather chips: صافٍ · غائم · رياح · عاصفة ترابية · مطر · حر شديد. Maximum and minimum °C, humidity %, wind (km/h and direction, which also feeds lift checks), rain (mm), hours lost, works stopped (yes/no).
  2. **العمالة (manpower).** A trade × company matrix of steppers. «زي امبارح» (same as yesterday) copies the counts. Hours default to the shift length.
  3. **المعدات (equipment).** Type, ID or plate, owned or hired, and hours working / idle / breakdown.
  4. **الأعمال المنفذة (work executed).** Location (building / level / zone / grid) × activity × quantity × unit × optional BOQ item code, with the cumulative quantity per activity carried from earlier issued diaries. There are quantities only, never rates.
  5. **الصب (pours).** Pulled in from `concrete` documents dated today (element, m³, grade, cube sets), plus manual rows.
  6. **التوريدات (materials received).** Material, supplier, delivery note number, quantity and unit, storage location, MIR number, accepted or rejected.
  7. **الاستلامات (inspections).** QA/QC inspections dated today are pulled in (IR number, title, inspector, verdict), plus manual IR/WIR rows; a re-inspection links to the IR it repeats.
  8. **التعليمات و RFIs (instructions and RFIs).** Number, from, summary, with two impact flags (time / commercial) as yes/no only, never an amount. Instruction rows link to `voRegister` for members with money access.
  9. **الزوار (visitors).**
  10. **السلامة (HSE).** The toolbox talk and attendance, active permits and incident counts by type (LTI · first aid · near miss · property damage) are pulled in. Man-hours are computed automatically. Days without an LTI are shown.
  11. **التأخيرات (delays).** Cause category (weather, owner information, utilities, materials, design, access, third party, contractor), from–to, affected activity, notice reference.
  12. **الصور (photos).** Up to 12, each with a stamp burned in and a caption.
  13. **خطة الغد (tomorrow's plan).**
  14. **التوقيعات (signatures).**
- **Issue.** «إصدار» (issue) locks the day. A later change becomes Rev 01.

**Engine API** (`src/domain/tools/diary-calc.ts`, prefix `diary`).
```ts
export function diaryTotals(d: DiaryBody): {
  heads: number; manHours: number;
  byTrade: Record<string, { heads: number; hours: number }>; byCompany: Record<string, { heads: number; hours: number }>;
  equipment: { id: string; util: number | null }[]; equipUtil: number | null;          // working / (working + idle + breakdown)
  weatherLostH: number; delayMin: number; poursM3: number; photos: number };
export function diaryCarryOver(prev: DiaryBody | null, dateIso: string): DiaryBody;     // copies manpower rows and counts, equipment ids/owner/operator
                                                                                          // (hours reset), yesterday's «خطة الغد» → today's suggested activities;
                                                                                          // never weather, photos, quantities, delays, visitors
export function diaryDaysSince(lastLtiIso: string | null, dateIso: string): number | null;
export function diaryAssemble(dateIso: string, docs: { pours: ToolDoc[]; talks: ToolDoc[]; permits: ToolDoc[]; inspections: Inspection[] }): DiaryLinks;
export function diaryNumber(projectCounters: Record<string, number>, dateIso: string): string;   // per-project daily sequence
```

**Saved document.**
```ts
type DiaryBody = {
  dateIso: string; shift: { from: string; to: string }; preparedBy: string;
  weather: { chips: WeatherChip[]; maxC?: number; minC?: number; humidityPct?: number; wind?: { kmh: number; dir: string };
             rainMm?: number; lostH?: number; stopped?: boolean };
  manpower: { company: string; trade: TradeCode; n: number; hours: number; direct: boolean }[];
  equipment: { type: string; tag: string; owner: "own" | "hired"; work: number; idle: number; down: number; operator?: string }[];
  work: { loc: string; activity: string; qty?: number; unit?: string; boq?: string; cumQty?: number }[];
  pours: { docId?: string; element: string; m3: number; grade: string; cubeSets?: number }[];
  materials: { item: string; supplier: string; dn: string; qty: number; unit: string; store?: string; mir?: string; status: "accepted" | "rejected" | "pending" }[];
  inspections: { qcId?: string; ir: string; title: string; inspector?: string; reinspectionOf?: string; result: "A" | "B" | "C" | "pending" }[];
  instructions: { no: string; from: string; summary: string; impact: { time: boolean; commercial: boolean } }[];   // yes/no only, never an amount
  visitors: { name: string; org: string; purpose: string; inAt: string; outAt?: string }[];
  hse: { talkIds: string[]; permitIds: string[]; incidents: { lti: number; firstAid: number; nearMiss: number; property: number };
        lastLtiIso?: string; observations?: string };
  delays: { cause: DelayCause; from: string; to: string; activity: string; notice?: string }[];
  nextDay: string; photos: string[];                                // keys into doc.photos
};
// limits: ≤ 60 manpower rows, ≤ 40 equipment, ≤ 80 work rows, text ≤ 600 characters each — body stays under 64 KB
```

**Photo stamping** (wave 1, OTA).
- The capture runs through `useImagePicker` → `processImage`, extended with a burn-in strip at the bottom of the image: `2026-10-09 07:42 · <project> · <zone>` plus a clock mark.
  - «⏱ شبكة» (network) when the offset between device and server clock was measured within the last 12 h. The offset comes from the `Date` header of the last successful Supabase response.
  - «⏱ جهاز» (device) otherwise.
- EXIF is stripped, as today.
- GPS is a line-3 option (§7).

**PDF «التقرير اليومي · Daily report» (DR, portrait).**
- Title block: report number, date and day, shift.
- A weather strip.
- Manpower table: trade rows × company columns, with totals for heads and man-hours.
- Equipment table with utilisation.
- Tables for work executed, pours, materials, inspections, instructions and visitors.
- HSE box: talk topic and attendance, permits, incidents, man-hours, days without an LTI.
- Delays table.
- Tomorrow's plan.
- Photo pages: a 2 × 3 grid, 85 × 64 mm frames, captions and stamps.
- Signatures: contractor site engineer · project manager · consultant RE, labelled «استلام — لا يعني الموافقة على المحتوى» (received, not acceptance of the contents).

**WhatsApp summary.** «التقرير اليومي · NAC-DR-0142 · Rev 00 · صادر» · «عمالة 30 · 240 ساعة» · «صب 120 م³» · «تأخير 195 د» · «تقدير — راجع المستند الكامل».

**Test vectors** (`tests/tools/diary-calc.test.ts`).
1. **Manpower totals.** Main contractor: engineers 2, carpenters 6, steel fixers 8, labourers 10. Subcontractor: masons 4. All at 8 h → **30 heads**, **240 man-h**, carpenters 48 h, subcontractor 32 h.
2. **Equipment utilisation.** Tower crane 8 working / 1 idle / 1 breakdown → **80 %**. Mixer 6 / 2 / 0 → 75 %. Fleet: 14 / 18 → **77.8 %**. An item with all zero hours has utilisation **null**, never 0.
3. **Days since LTI and carry-over.** Last LTI 2026-09-01, date 2026-10-09 → **38 days**.
   - `diaryCarryOver` copies 5 manpower rows with counts, copies equipment tags with hours reset to 0, and turns yesterday's «خطة الغد» into today's suggested activities.
   - It leaves weather, photos, work quantities and delays empty.
4. **Weather loss.** A stoppage 12:30–15:00 → **2.5 h** lost; delays 12:30–15:00 plus 09:00–09:45 → **195 min**.

**Liability note.** «سجل يومي معاصر يعدّه المقاول؛ توقيع الاستشاري يعني الاستلام فقط. الطقس والعمالة كما أُدخلت؛ الصور مختومة بوقت الجهاز أو الشبكة كما هو مبيّن.» In English: a contemporary daily record prepared by the contractor. The consultant's signature means receipt only. Weather and manpower are as entered. Photos are stamped with device or network time, as marked.

---

### 3.6 `toolboxTalk`: التوعية الصباحية وتمام المهمات (Toolbox talk & PPE muster)

**Purpose.** Record the 10–15 minute pre-start talk and the PPE muster in under 2 minutes:
- Pick a topic and today's hazards.
- Mark attendance by tapping names from the project crew roster.
- Check PPE per worker with ISO 7010 pictograms.
- Every worker missing PPE needs an action.

The record feeds the diary.

**Screen flow.**
1. **Topic.** Twelve library cards, each with an icon and three colloquial key points: heat stress, work at height, excavation, lifting, hot work, housekeeping, electrical, manual handling, PPE, scaffolds, confined space, plant and traffic.
2. **Today's tasks and hazards.** Chips plus free text.
3. **Attendees.** The roster grouped by trade, one tap per person. «+ عامل جديد» (new worker) asks for name, trade, company and badge number.
4. **PPE matrix.** Helmet · shoes · vest · gloves · glasses · harness when needed. Everything defaults to ✓; tapping a pictogram toggles ✗, and an action is then required: «سُلّمت» (issued) / «أُبعد عن العمل» (sent off work) / «أخرى» (other).
5. **Group photo** (optional) and the presenter's sign-off.

The result shows the attendee count, man-hours and PPE compliance %.

**Defaults.** Duration 15 min [M]. The topic library text is product copy, reviewed by an HSE engineer before release ⚑.

**Engine API** (`src/domain/tools/toolbox-calc.ts`, prefix `tbt`).
```ts
export function tbtSummary(t: ToolboxBody, nowIso: string): {
  n: number; manHours: number; ppeOk: number; ppePct: number | null;
  missingNoAction: string[]; dupBadges: string[]; errors: TbtError[] };     // errors: noAttendee | noPresenter | future | dupBadge | missingAction
```

**Saved documents.**
```ts
type ToolboxBody = { dateIso: string; startTime: string; durationMin: number; zone: string; contractor: string;
  presenter: { name: string; role: string }; topicId: string; topicText?: string; tasks: string[]; hazards: string[]; questions?: string;
  attendees: { crewId?: string; name: string; trade: string; company: string; badge?: string;
               ppe: Record<PpeItem, boolean>; action?: "issued" | "sentOff" | "other"; actionNote?: string }[];   // ≤ 120
  photo?: string };
type CrewBody = { projectId: string; people: { id: string; name: string; trade: string; company: string; badge?: string; active: boolean }[] };   // kind "crew", ≤ 400
```

**PDF «سجل التوعية اليومية · Toolbox talk record» (TBT).**
- Title block.
- Talk data as a key-value grid.
- A topic box with the key points.
- Today's hazards and controls.
- Attendee table: # · الاسم · المهنة · الشركة · رقم البطاقة · PPE pictograms with ✓/✗ marks · الإجراء · **التوقيع** (left blank for wet ink).
- Totals: count, man-hours, PPE %.
- The photo.
- Signatures: presenter and site supervisor.

**Test vectors.**
1. **Totals.** 23 attendees × 15 min → **5.75 man-h**. 21 fully equipped → **91.30 %**.
2. **Duplicate badge.** Two attendees with badge «B-117» → `dupBadges = ["B-117"]` and an error. A worker with no badge is not a duplicate.
3. **Missing action and edge cases.** A worker without a helmet and no action → error `missingAction` naming them. With action «issued», there is no error and ppeOk excludes that worker → **21/23**. Zero attendees → `noAttendee`. A start time later than now → `future`.

**Liability note.** «سجل توعية وحضور؛ لا يغني عن تقييم المخاطر وخطة السلامة المعتمدة. بيانات العمال محفوظة في حسابك فقط، ولا تظهر إلا في المستندات التي تشاركها أنت.» In English: an awareness and attendance record. It does not replace the risk assessment or the approved safety plan. Workers' details are kept in your account only, and appear only in the documents you choose to share.

---

### 3.7 `workPermit`: تصاريح العمل (Permit-to-work with safety calculators)

**Purpose.** An HSG250-style permit [H] with a validity window, hazards and controls, isolations, signatures, handover and close-out. Built-in calculators turn the usual rules of thumb into checked numbers. The permit shows its state at a glance, and the diary and the «اليوم في الموقع» strip list only the permits that are authorised or active.

**States** (an explicit state machine; nobody may rely on a draft):
- **مسودة (draft)** → **مصرّح (authorised)** → **ساري (active)** → **موقوف (suspended)** → **مغلق (closed)** | **ملغى (cancelled)**.
- «إصدار» (authorise) requires the issuer, performing-authority and acceptor names, a «وُقّع ورقيًا» (signed on paper) confirmation, and, for confined space and hot work, a passing gas test. `until` (§5c) is written only at authorisation.
- A permit becomes **active** inside its window. It is **suspended** when a repeat gas test is due or fails; a passing test returns it to active. It is **closed** at close-out, and **cancelled** by the issuer with a reason.
- Every state other than authorised or active shows «مسودة — غير مصرّح بالعمل» or its own state word, never «ساري». The countdown chip appears only on authorised and active permits.

**Types.**

| Type | Calculator |
|---|---|
| Hot work (أعمال ساخنة) | fire watch, distances |
| Work at height (العمل على ارتفاع) | fall clearance, ladder geometry |
| Confined space (الأماكن المحصورة) | gas test table |
| Excavation (الحفر) | slopes, protective system, egress |
| Lifting near power lines (الرفع بالقرب من خطوط الكهرباء) | clearance by kV. The full lift plan is wave 2 |
| Electrical isolation (عزل كهربائي / LOTO) | isolation list |

**Screen flow.** Type → location and work description → validity (start, hours; the default is one shift, 8 h) → hazards and controls checklist (✓ / ✗ / N/A) → the type's calculator card → gas tests (repeatable rows; each expires after the company interval, 2 h by default [L] ⚑) → signatures (issuer, performing authority, acceptor) → «إصدار» (authorise) → handover rows → close-out. A countdown chip shows the remaining validity of an authorised or active permit. An expired permit cannot be revalidated without a new gas test where one applies.

**Calculators and defaults.** Profile `hse-intl@1`, with per-project overrides.

| Calculator | Rule | Confidence |
|---|---|---|
| Excavation, protective system | Required at depth ≥ 1.5 m unless stable rock; depth > 6.1 m → PE design required, and the calculator switches off | [H, OSHA 1926.651/652] |
| Excavation, slopes | Rock vertical · A ¾:1 · B 1:1 · C 1½:1; submerged or seeping soil → C | [H] |
| Excavation, top width | top = base + 2·D·(H:V) | [H] geometry |
| Excavation, other limits | spoil ≥ 0.61 m from the edge; ladder within 7.62 m of travel once ≥ 1.22 m deep → ladders = ceil(L / 15.24); atmosphere test when > 1.22 m and gas is possible | [H] |
| Fall protection | from 1.8 m (construction), 3.1 m (scaffold) | [H] |
| Fall clearance | Free fall FF = max(0, lanyard + 1.5 − anchorAboveFeet) (D-ring 1.5 m above the feet; anchor height measured above the working surface, default 0, the conservative case). FF ≤ 1.8 m (OSHA) or ≤ 4.0 m (EN 355 absorber limit); absorber extension ≤ 1.07 m (OSHA) or ≤ 1.75 m (EN). Required clearance **below the working surface** = lanyard + extension + 1.5 + margin 1.0 − anchorAboveFeet | [H] limits, [M] method |
| Anchor | ≥ 22.2 kN per person | [H] |
| Ladder | base = H/4; length = √(H² + base²); minimum ladder = length + extension (1.0 m HSE / 0.9 m OSHA); angle = atan 4 = 75.96° | [M/H] |
| Gas test | O₂ 19.5–23.5 %; LEL < 10 %; H₂S < 1 ppm (ACGIH TLV, company may set otherwise); CO < 25 ppm; test order O₂ → LEL → toxics at top / middle / bottom | [H] for O₂ and LEL, [M] for toxics |
| Hot work | combustibles within 11 m removed or shielded; O₂ cylinders ≥ 6.1 m from fuel gas or behind a 1.5 m barrier; fire watch default 60 min (OSHA 30 / NFPA 51B 60) | [M] |
| Power-line clearance (OSHA 1926.1408 Table A) | ≤ 50 kV 3.05 m · 50–200 kV 4.57 m · 200–350 kV 6.10 m · 350–500 kV 7.62 m · 500–750 kV 10.67 m · 750–1000 kV 13.72 m | [H ≤ 350 kV, M above] |
| Power line of unknown voltage | lifting is blocked until the distribution company confirms the voltage. The screen shows 15.24 m as the conservative planning distance | — |

**Engine API** (`src/domain/tools/permit-calc.ts`, prefix `ptw`).
```ts
export function ptwExcavation(i: { depthM: number; baseM: number; lengthM: number; soil: "rock" | "A" | "B" | "C"; water?: boolean }, p: HseProfile): {
  slopeHV: number; topWidthM: number; protectiveRequired: boolean; peRequired: boolean; ladders: number; spoilSetbackM: number;
  atmosphereTest: boolean; off: boolean; notes: string[] };
export function ptwFallClearance(i: { lanyardM: number; absorberM: number; harnessM: number; marginM: number; anchorAboveFeetM: number;
  profile: "osha" | "en"; availableM?: number }): { freeFallM: number; freeFallOk: boolean; absorberOk: boolean; requiredM: number;
  ok: boolean | null; advice?: "srl" | "restraint" | "raiseAnchor" };   // availableM is measured below the working surface
export function ptwLadder(heightM: number, extensionM: number): { baseM: number; lengthM: number; minLadderM: number; angleDeg: number };
export function ptwGasTest(r: { o2: number; lel: number; h2s: number; co: number }, p: HseProfile): { ok: boolean; fails: ("o2Low" | "o2High" | "lel" | "h2s" | "co")[] };
export function ptwLineClearance(kv: number | null): { minM: number; band: string; blocked: boolean };
export type PtwState = "draft" | "authorised" | "active" | "suspended" | "closed" | "cancelled";
export function ptwValidity(p: { state: PtwState; startIso: string; hours: number; lastGasIso?: string; lastGasOk?: boolean; gasEveryMin?: number;
  needsGas: boolean }, nowIso: string): { valid: boolean; state: PtwState; reason?: "notAuthorised" | "notStarted" | "expired" | "gasDue" | "gasFailed" | "closed";
  expiresIso: string; gasDue: boolean };
```

**Saved document.**
```ts
type PermitBody = { type: PtwType; state: PtwState; no: string; location: string; work: string; startIso: string; hours: number;
  authorisedAt?: number; paperSigned?: boolean; cancelReason?: string;
  hazards: { id: string; state: "yes" | "no" | "na" }[]; controls: string[]; isolations: { point: string; method: string; lock?: string }[];
  calc: Record<string, number | string | boolean>; gas: { at: string; o2: number; lel: number; h2s: number; co: number; tester: string; instr: string }[];
  parties: { issuer: string; performer: string; acceptor: string }; handovers: { at: string; from: string; to: string }[];
  closeOut?: { at: string; complete: boolean; areaSafe: boolean; by: string } };
```

**PDF «تصريح عمل · Permit to work» (PTW).**
- One A4 page per permit, spilling to two only when there are many gas tests.
- Title block: permit number, type and state (a draft prints «مسودة — غير مصرّح بالعمل» across the validity box).
- A large **validity window** box: from → to.
- Location and work description.
- Hazards and controls checklist with ✓ / ✗ / N/A marks.
- Calculator outputs, each with its clause reference, for example «OSHA 1926.652 — حفر ≥ 1.5 م يلزم نظام حماية».
- Gas-test table: time · O₂ · LEL · H₂S · CO · tester · instrument · result.
- Isolations.
- Signatures: the four parties.
- Handover log, then close-out.

**Test vectors** (`tests/tools/permit-calc.test.ts`).
1. **Excavation.**
   - D 3.0 m, type B, base 1.2, length 40 → top **7.2 m**, protective system required, **3 ladders**, atmosphere test **true** when gas is possible.
   - D 2.5, type C (water), base 0.8 → top **8.3 m**.
   - D 6.5 → `peRequired`, `off: true`.
2. **Fall clearance and ladder.**
   - Lanyard 2.0, EN absorber 1.75, anchor at D-ring height (1.5 m above the feet) → FF **2.0 m** (OSHA warning, > 1.8; within EN 4.0), clearance below the working surface **4.75 m**.
   - Same, anchor at foot level (0) → FF **3.5 m**, clearance **6.25 m**; available 5.5 → `ok: false`, advice `srl`.
   - Ladder 4.0 m with 1.0 m extension → base **1.00**, length **4.123**, minimum ladder **5.12 m**, angle **75.96°**.
3. **Gas, lines and validity.**
   - Gas: 20.9 / 0 / 0 / 3 → PASS. O₂ 19.2 → FAIL `o2Low`. LEL 12 → FAIL `lel`.
   - Line clearance: 66 kV → **4.57 m**; 220 kV → **6.10 m**; 500 kV → **7.62 m**; null → blocked.
   - Validity: authorised, 07:00, 8 h, now 15:30 → **expired**.
   - A **draft** whose window covers now → `{ valid: false, reason: "notAuthorised" }`. An active confined-space permit whose repeat gas test fails → `state: "suspended"`, `reason: "gasFailed"`.

**Liability note.** «التصريح أداة تنظيم وتسجيل؛ التصريح الورقي الموقّع هو المرجع، وحالة التطبيق للمتابعة فقط. القيم من مراجع دولية (OSHA / HSE / EN) ما لم تُعدّل لقواعد الشركة. لا يغني عن الشخص المختص ولا عن قراءات جهاز غاز معاير؛ الحفر الأعمق من 6.1 م والرفعة الحرجة يحتاجان تصميمًا هندسيًا.» In English: the permit is a tool for organising and recording; the signed paper permit is the reference, and the state in the app is for tracking only. Values come from international references (OSHA / HSE / EN) unless changed to company rules. It does not replace the competent person or the readings of a calibrated gas detector. Excavations deeper than 6.1 m and critical lifts need an engineered design.

---

### 3.8 `acInstall`: فحص تركيب التكييف (AC installation check)

**Purpose.** A per-unit site check for split, ducted and cassette units:
- condensate flow, minimum drain size, slope and fall;
- the refrigerant line set against the manufacturer's maximum length and lift, plus the extra charge;
- photos.

The output is an installation inspection report. Line sizes are **never defaulted**: they always come from the unit's manual.

**Screen flow.** A list of units as `RowEditor` cards. Per unit:
- tag, room, model;
- capacity in Btu/h (the HP label is shown, never used in calculations);
- the manual's maximum length, maximum lift, precharged length, g/m, and liquid and gas sizes;
- measured length, lift, installed liquid and gas sizes;
- drain run (m), slope %, trap yes/no;
- 3 photos.

Each card shows live PASS / FAIL chips.

**Formulas.**
- Condensate (optional): ṁ = ρ·V·(W_on − W_off), with ρ 1.2 kg/m³ [H].
- Minimum drain by capacity, IMC Table 307.2.2 [M]: ≤ 20 TR ¾″ · 20–40 TR 1″ · 40–90 TR 1¼″ · 90–125 TR 1½″ · 125–250 TR 2″. The drain never gets smaller downstream.
- Minimum slope 1 % [M]; fall = slope × run.
- Extra charge = g/m × max(0, L − L_pre).
- Pass conditions: L ≤ L_max, lift ≤ lift_max, and installed sizes = manual sizes.
- Sanity band 3–7.6 L/h per TR in humid conditions [L] ⚑.
- Conversion: 1 TR = 3.516853 kW [H].

**Engine API** (`src/domain/tools/ac-calc.ts`, prefix `acx`).
```ts
export function acxCondensate(i: { airLs?: number; wOn?: number; wOff?: number; tr: number; runM: number; slopePct: number }, p: AcProfile): {
  lph: number | null; minDrainIn: string; fallMm: number; slopeOk: boolean; sanity?: "low" | "high" };
export function acxLineSet(i: { lenM: number; liftM: number; maxLenM: number; maxLiftM: number; preM: number; gPerM: number;
  liquidIn: string; gasIn: string; manualLiquidIn: string; manualGasIn: string }): { extraG: number; lenOk: boolean; liftOk: boolean; sizesOk: boolean };
export function acxHpLabel(btuh: number): string;   // label only
```

**Saved document.** `AcInstallBody = { units: AcUnitRow[] /* ≤ 120 */ }`, with photos keyed by unit id. Profile snapshot `ac-site@1`: the drain table, minimum slope and ρ.

**PDF «تقرير فحص تركيب وحدات التكييف · AC installation inspection» (ACI).**
- Units table: tag · room · model · Btu/h · line sizes (installed / manual) · L / L_max · lift / lift_max · extra charge (g) · drain Ø · slope % / fall · trap · result.
- Photo appendix: 3 per unit.
- Signatures: technician · MEP site engineer · consultant.

**Test vectors.**
1. **Condensate.** 1000 L/s, ΔW 0.004 → **17.28 L/h**.
2. **Drain size and fall.** 50 TR → **1¼″**. Exactly 20 TR → **¾″**. A 20 m run at 1 % → **200 mm** fall. 0.8 % → `slopeOk: false`.
3. **Line set.** L 12 m, lift 5 m, precharge 7.5 m, 20 g/m, manual limits 15 / 8 → **+90 g**, all pass. L 16 → `lenOk: false`. Installed gas 3/8″ against manual 1/2″ → `sizesOk: false`.

**Liability note.** «فحص موقعي؛ بيانات المصنّع (الأقطار والأطوال والشحنة) هي المرجع الملزم. وسائط التبريد A2L (مثل R32) لها حدود شحنة ومساحة غرفة — راجع دليل المصنّع.» In English: a site check. The manufacturer's data (pipe sizes, lengths and charge) is the binding reference. A2L refrigerants such as R32 have charge and room-size limits; see the manufacturer's manual.

---

### 3.9 `drainRun`: مناسيب غرف التفتيش (Drain run invert schedule + sight rails)

**Purpose.** The main plumbing and infrastructure site tool. It computes, from the first manhole downstream:
- invert levels, depths, crowns and cover;
- the slope check per pipe size and manhole spacing;
- the outfall check against the public sewer;
- **sight-rail and grade-stake marks** for setting out.

Ground levels can be taken from a `levelBook` document, which avoids typing them twice.

**Screen flow.**
- **Header:** datum and BM reference (pick a level book), pipe material, minimum cover, slope profile (metric default, or IPC strict), public-sewer IL (optional).
- **Reach rows** (a `RowEditor`): MH ID · chainage or length · GL (typed or from the level book) · DN / OD · slope % or «أقل ميل» (minimum slope) · drop in the manhole.
- **Live outputs:** IL in and out, depth, crown, cover, ✓/✗ checks.
- **Sight-rail card:** traveller length and peg RL give the rail RL and the mark above the peg.
- **Grade stake card:** stake RL against design gives «C 0.750» or «F …».

**Formulas** [H].
- IL_i = IL_{i−1} − s·L_i − drop_i
- depth = GL − IL; crown = IL + OD; cover = GL − crown
- rail RL = IL + traveller; mark = rail − peg RL
- cut / fill = ground − design

**Minimum slope by DN** (editable). The IPC profile uses ¼ in/ft = 2.083 % for ≤ 2½″, ⅛ in/ft = 1.042 % for 3–6″ and 1/16 in/ft = 0.521 % for ≥ 8″ [H]. The metric profile uses 1 % for DN100–150 and 0.5 % for ≥ DN200 [L] ⚑.

**Spacing.** Cleanouts ≤ 30.5 m; manholes for ≥ 8″ at ≤ 122 m and at every change of direction [M].

**Manhole internal size by depth.** 60×60 below 1 m, then 80×80 and 100×100 [L] ⚑, editable.

**Engine API** (`src/domain/tools/drain-calc.ts`, prefix `drn`; integer mm levels).
```ts
export function drnRun(i: { startIlMm: number; reaches: { lenM: number; dnMm: number; odMm: number; slopePct?: number; dropMm?: number; glMm?: number }[];
  minCoverMm: number; outfallIlMm?: number }, p: DrainProfile): {
  nodes: { ilInMm: number; ilOutMm: number; depthMm?: number; crownMm: number; coverMm?: number; checks: DrnCheck[] }[]; ok: boolean };
export function drnMinSlope(dnMm: number, p: DrainProfile): number;
export function drnSightRail(ilMm: number, travellerMm: number, pegRlMm?: number): { railMm: number; markAbovePegMm?: number };
export function drnGradeStake(stakeMm: number, designMm: number): { label: string; mm: number };   // "C 0.750" / "F 0.120"
```

**Saved document.** `DrainRunBody = { datum, bmRef, levelBookId?, material, minCoverMm, profile, outfallIlMm?, startIlMm, reaches: [...] /* ≤ 200 */ }`.

**PDF «جدول مناسيب غرف التفتيش · Manhole invert schedule» (DRN).**
- Profile table: MH · chainage · GL · IL in · IL out · depth · L · slope % · DN · manhole size · cover · checks.
- A vector longitudinal chart: GL and IL polylines with the manholes marked. The horizontal scale is the first of 1:500 · 1:1000 · 1:2000 that fits the run in the 261 mm landscape text block (300 m at 1:500 would need 600 mm); a longer run is split across pages with match lines and chainage labels. The vertical scale is exaggerated, and both scales are stated.
- A sight-rail table.
- Datum and BM source (with the level-book document number).
- Signatures: surveyor · MEP site engineer · consultant.

**Test vectors.**
1. **Run at 1.5 %.** MH1 IL 99.200, L 20 and 25 m, GL2 100.050, GL3 99.900 → IL2 **98.900** (depth **1.150**), IL3 **98.525** (depth **1.375**).
2. **Run at 1:200 with sight rails.** IL 98.500 → at 0+030 **98.350**; MH2 at 0+045 **98.275**; GL 100.120 gives depth **1.845**. Traveller 2.000 → rails **100.500 / 100.275**. A peg at 99.800 → mark **0.700**.
3. **Minimum slope and stakes.** DN100 at 1.0 %: IPC profile → **FAIL** (1.042 % required); metric profile → PASS. Grade stake 100.350 against design 99.600 → **«C 0.750»**.

**Liability note.** «حساب مناسيب وتوقيع؛ الميول الدنيا والمسافات وأبعاد غرف التفتيش حسب الملف المختار ويجب مطابقتها بكود الصرف المصري واشتراطات شركة المياه.» In English: a levels and setting-out calculation. Minimum slopes, spacings and manhole sizes follow the chosen profile and must be checked against the Egyptian drainage code and the water company's requirements.

---

### 3.10 `sprinklerCheck`: توزيع وفحص الرشاشات (Sprinkler count & spacing check)

**Purpose.** Two jobs:
- **Design mode** finds the minimum head count and the spacing for each room.
- **Site mode** checks measured spacing and wall distances against NFPA 13-2022 limits for standard-spray heads, using the §10.2.4.1.1 rule that S and L are the larger of the head-to-head spacing and twice the wall distance.

The output is a check sheet with a grid sketch. The ECP profile ships disabled («بانتظار المراجعة», awaiting review).

**Limits** (`nfpa13-2022@1`, Table 10.2.4.2.1 [M–H]).

| Hazard | Maximum area per head | Maximum spacing S |
|---|---|---|
| Light (LH), hydraulically calculated, noncombustible or unobstructed combustible construction | 20.9 m² (225 ft²) | 4.6 m |
| Light (LH), pipe schedule | 18.6 m² (200 ft²) | 4.6 m |
| Light (LH), combustible obstructed, members ≥ 0.9 m on centre | 15.6 m² (168 ft²) | 4.6 m |
| Light (LH), combustible obstructed, members < 0.9 m on centre | 12.1 m² (130 ft²) | 4.6 m |
| Ordinary (OH1/OH2) | 12.1 m² | 4.6 m |
| Extra (EH), hydraulic | 9.3 m² | 3.7 m |
| Extra (EH), pipe schedule | 8.4 m² | 3.7 m |

- Each room carries `system: "hydraulic" | "pipeSchedule"` and `ceiling: "nc-unobstructed" | "nc-obstructed" | "comb-unobstructed" | "comb-obstructed"` (with member spacing for comb-obstructed), which pick the row. The default is hydraulic, noncombustible unobstructed, and the PDF prints the choice.
- Wall distance ≤ S_max/2 and ≥ 0.1 m in each direction; head to head ≥ 1.8 m [H].
- **Site area per head** = max(s_x, 2·wall_x) × max(s_y, 2·wall_y) (§10.2.4.1.1), so an edge head with a generous wall distance cannot pass on the head spacing alone.
- Out of scope, blocked with a message: extended coverage, sidewall, ESFR, storage, and ceilings above the listed heights.

**Algorithm** [deterministic].
1. Try both orientations.
2. For each nx from ⌈a/S⌉ to ⌊a/1.8⌋: sx = a/nx; sy_max = min(S, A_max/sx); ny = ⌈b/sy_max⌉; reject sy < 1.8.
3. Pick the minimum nx·ny, then the minimum |sx − sy|.

**Engine API** (`src/domain/tools/sprinkler-calc.ts`, prefix `spk`).
```ts
export function spkLayout(lM: number, wM: number, hazard: SpkHazard, p: SpkProfile): { nx: number; ny: number; n: number; sx: number; sy: number; areaM2: number; wallX: number; wallY: number };
export function spkSiteCheck(m: { sxM: number; syM: number; wallXM: number; wallYM: number; wallMinM: number; headMinM: number },
  room: { hazard: SpkHazard; system: SpkSystem; ceiling: SpkCeiling; memberSpacingM?: number }, p: SpkProfile): { areaM2: number; sM: number; lM: number; checks: Check[]; ok: boolean };
```

**Saved document.** `SprinklerBody = { rooms: { name, lM, wM, hazard, system, ceiling, memberSpacingM?, mode: "design" | "site", measured?: { sxM, syM, wallXM, wallYM, headMinM } }[] /* ≤ 150 */ }`, with photos per room.

**PDF «فحص توزيع الرشاشات · Sprinkler spacing check» (SPK).**
- Hazard basis with annex examples.
- Limits table with clause numbers.
- Per-room table: room · L × W · hazard · nx × ny · sx × sy · area per head · wall distances · result.
- A grid sketch per room (vector).
- Site table: measured vs limit.
- Banner «ليست حسابات هيدروليكية».
- Signatures: fire engineer · site engineer · consultant.

**Test vectors.**
1. **OH1, 20 × 12 m** → **20 heads** (5 × 4), **4.0 × 3.0 m**, **12.0 m²**, walls 2.0 / 1.5 m.
2. **LH, same room** → **15 heads** (5 × 3), 4.0 × 4.0 m, 16.0 m². **EH hydraulic, 30 × 9 m** → **30 heads** (10 × 3), 3.0 × 3.0 m.
3. **Site check, OH1.** Measured 4.3 × 3.0 → area 12.9 > 12.1 → **FAIL**. A wall distance of 2.4 m > 2.3 m → **FAIL**. Head-to-head 1.7 m → **FAIL**.
4. **Site check, edge heads, OH1.** 3.4 × 3.4 m, walls 2.0 / 1.7 → area = max(3.4, 4.0) × max(3.4, 3.4) = **13.6 m² > 12.1 → FAIL** (the old sx·sy check gave 11.56 and passed). Walls 1.7 / 1.7 → 3.4 × 3.4 = **11.56 m² → PASS**.
5. **LH, pipe schedule.** Measured 4.6 × 4.2 → **19.32 m² > 18.6 → FAIL** (it passes under the hydraulic row, ≤ 20.9). The design vector LH 20 × 12 stays **15 heads** (16.0 m² is under both limits).

**Liability note.** «فحص مسافات وأعداد فقط — ليست حسابات هيدروليكية وفق NFPA 13 الفصل 28؛ تصنيف الخطورة النهائي والتصميم لمهندس مرخّص واعتماد الحماية المدنية.» In English: a check of spacings and counts only, not a hydraulic calculation under NFPA 13 chapter 28. The final hazard classification and the design belong to a licensed engineer and need Civil Defence approval.

---

### 3.11 `cableCheck`: الكابل وهبوط الجهد (Cable & voltage-drop check)

**Purpose.** A per-circuit check that produces a cable schedule. For each circuit it computes:
- Ib and the breaker coordination (Ib ≤ In ≤ Iz);
- derating;
- the cable size;
- the voltage drop and maximum length;
- the adiabatic short-circuit check.

The voltage-drop and adiabatic maths are [H]. The ampacity table is a transcription that still needs checking ([M] ⚑). So every circuit lets the member choose **«من الجدول (تحقق)»** (the bundled dataset, banner shown) or **«من كتالوج المصنّع»** (they type It from the cable maker's datasheet, which is then printed as the source). The two bases are never mixed.

**Screen flow.**
- **Header:** supply (220/380 V, 50 Hz [M]; or 230/400), limits (IEC: 3 % lighting / 5 % other on public supply; 6 / 8 % on a private substation [H]).
- **Circuit rows:** tag, from → to, single- or three-phase, load as «kW input» or «motor kW out» (with efficiency η) and cosφ, or Ib directly; conductor (Cu/Al), insulation (PVC/XLPE), method (C, E, F, D1, D2), air °C (methods in air) or ground °C (D1/D2), number of grouped circuits and their arrangement, soil ρ (for D), protective device (breaker IEC 60898 / 60947-2, or gG fuse) and In, Isc and t, length.
- **Live outputs:** Ib, Πk, required It, size, Iz, Δu %, L_max, S_min, PASS / FAIL.

**Formulas** [H unless marked].
- Ib = P/(√3·U·cosφ·η) for three-phase; P/(U₀·cosφ·η) for single-phase. η = 1 for «kW input»; for «motor kW out» the nameplate kW is shaft output, so η is required.
- Coordination: breakers (IEC 60898 / 60947-2) need In ≤ Iz; **gG fuses need In ≤ 0.906·Iz** (exactly 1.45/1.6), because I₂ = 1.6·In must not exceed 1.45·Iz.
- Iz = It·k_temp·k_group·k_soil. Choose the smallest S with It(S) ≥ In/Πk.
- Adiabatic: S ≥ I·√t/k, with k = 115 / 143 / 76 / 94 for Cu-PVC / Cu-XLPE / Al-PVC / Al-XLPE, valid for 0.1 s ≤ t ≤ 5 s. Below 0.1 s the engine refuses the formula and asks for the device's let-through energy from the maker: k²S² ≥ I²t.
- Voltage drop: u = b·(ρ₁·L/S·cosφ + λ·L·sinφ)·Ib, with b = 1 for three-phase (measured against U₀, line value √3·u) or 2 for single-phase.
  - ρ₁ = 0.0225 Ω·mm²/m (Cu) or 0.036 (Al); λ = 0.08 mΩ/m.
- L_max = (Δu%·U₀/100) / (b·Ib·(ρ₁·cosφ/S + λ·sinφ)).

**Factor tables** (`iec60364-2009@1`):

| Table | Values | Confidence |
|---|---|---|
| B.52.14, air | 40 °C → PVC 0.87 / XLPE 0.91 | [H] |
| B.52.14, air, other temperatures | — | [M] |
| B.52.15, ground (reference 20 °C) | PVC / XLPE: 25 °C 0.95 / 0.96 · 30 °C 0.89 / 0.93 · 35 °C 0.84 / 0.89 · 40 °C 0.77 / 0.85 | [M ⚑] |
| B.52.16, soil | — | [H reproduction] |
| B.52.17, grouping | — | [M] |
| Method E ampacity | — | [M recall ⚑] |

The temperature table follows the method: **B.52.15 (ground, θref 20 °C) for D1 / D2, B.52.14 (air, θref 30 °C) for every other method**. Reading B.52.14 for a buried circuit at 30 °C would give 1.00 instead of 0.93 / 0.89 and overstate Iz by 7.5 % (XLPE) or 12.4 % (PVC). The formula √((θmax − θa)/(θmax − θref)) runs as a self-test only (30 °C ground: 0.9258 XLPE, 0.8944 PVC).

**Defaults:** air 40 °C [L], ground 30 °C [L], soil 2.5 K·m/W [M], with the D1 (duct) row as the default [M].

**Engine API** (`src/domain/tools/cable-calc.ts`, prefix `cab`).
```ts
export const CAB_ENGINE = "cab@1.0.0";
export function cabIb(i: { phases: 1 | 3; kw: number; cosphi: number; uV: number; eta?: number /* 1 for kW input */ }): number;
export function cabDerate(i: { insul: "pvc" | "xlpe"; method: CabMethod; airC: number; groundC: number; groupN: number; groupArr: CabArr; soilRho?: number }, ds: CabDataset):
  { kTemp: number; kGroup: number; kSoil: number; k: number; tempTable: "B.52.14" | "B.52.15" };
export function cabCoord(device: "breaker" | "gG", inA: number, izA: number): { ok: boolean; limitA: number };   // gG: In ≤ (1.45/1.6)·Iz
export function cabSelect(inA: number, k: number, ampacity: { s: number; it: number }[]): { s: number; it: number; iz: number } | { parallel: true };
export function cabVd(i: { phases: 1 | 3; sMm2: number; lenM: number; ibA: number; cosphi: number; mat: "cu" | "al"; u0V: number }): { uV: number; pct: number; lineV?: number; linePct?: number };
export function cabLmax(i: { phases: 1 | 3; sMm2: number; ibA: number; cosphi: number; mat: "cu" | "al"; u0V: number; limitPct: number }): number;
export function cabAdiabatic(iscA: number, tS: number, k: number): { sMinMm2: number } | { refused: "tBelow0.1s" | "tAbove5s" };
```

**Saved document.** `CableSchedBody = { supply, limits, dataset: "iec-table" | "maker", circuits: CabCircuit[] /* ≤ 300 */ }`. Profile snapshot: the factor rows used, k values, ρ₁ and λ, and the dataset version with its `verified` flag.

**PDF «جدول الكابلات · Cable schedule» (CBL, landscape).**
- Design basis: code edition, dataset (IEC transcription, unverified, or maker plus catalogue reference), temperatures, soil ρ.
- One row per circuit: tag · from → to · kW · cosφ · Ib · device (type / In / Icu) · method · k1 / k2 / k3 · It · Iz · size (cores × mm² + PE) · Δu % · L_max · Isc · S_min · PASS / FAIL.
- Assumptions and the disclaimer.
- Signatures: prepared · checked · approved, with the Syndicate number.

**Test vectors.**
1. **Three-phase feeder.** 90 kW, 380 V, cosφ 0.85 → Ib **160.87 A**, In 200.
   - Cu/XLPE, method E, 40 °C (0.91), 3 on a perforated tray (0.82) → Πk **0.7462**, It required **268.02 A** → **95 mm²** (298 A), Iz **222.37 A**.
   - Adiabatic at 13.206 kA, 0.1 s → S_min **29.20 mm²**.
   - Voltage drop at 60 m → u **2.350 V**, line **4.070 V = 1.071 %**, PASS.
2. **Single-phase lighting.** 220 V, 1.5 mm², 25 m, 8 A, cosφ 0.9 → **5.414 V = 2.461 %**, PASS at 3 %. L_max **30.48 m**.
3. **Socket circuit.** 220 V, 4 mm² Cu, 40 m, 32 A, cosφ 0.95 → **13.744 V = 6.247 %**, **FAIL** at 5 %. L_max **32.01 m**.
4. **Buried feeder.** Cu/XLPE, D1, ground 30 °C, soil 2.5 K·m/W, 1 circuit → kTemp **0.93** (B.52.15), kSoil **1.00**, kGroup **1.00**, Πk **0.93**; In 100 A → It required **107.53 A**.
5. **Motor and devices.** 90 kW motor output, η 0.95, 380 V, cosφ 0.85 → Ib **169.34 A** (against 160.87 A for 90 kW input). A gG fuse with Iz 222.37 A allows In ≤ 1.45/1.6 × 222.37 = **201.52 A**. Adiabatic at t 0.05 s → refused, «أدخل I²t من المصنّع».

**Results on an unverified dataset.** While the IEC transcription is `verified: false`, a passing row prints «ضمن الحد ⚑» (within the limit, unverified), never «مطابق», and issuing needs one confirming tap. Rows computed from «من كتالوج المصنّع» print «مطابق» with the catalogue reference.

**Liability note.** The electrical disclaimer from the brief, in Arabic and English, plus «وفق IEC 60364-5-52 (2009)؛ لا يقرر المطابقة للكود المصري» (per IEC 60364-5-52 (2009); it does not decide compliance with the Egyptian code), the dataset version and «ليس للتنفيذ دون توقيع» (not for construction unless signed).

---

### 3.12 `units`: kept and extended

Today's converters (length, area with feddan / qirat / sahm, volume, force, stress) stay. Wave 1 adds:
- **Slope:** % ↔ 1:n ↔ degrees.
- **HVAC:** TR ↔ kW ↔ Btu/h; cfm ↔ L/s ↔ m³/h.
- **Pressure and head:** bar ↔ m of water ↔ psi ↔ kPa.
- **Shapes:** areas and volumes of a rectangle, a triangle from three sides (Heron), a trapezoid, a circle and a ring.
- **Land:** m² → «2 فدان 9 قيراط 3.16 سهم».

The new exports use the prefix `unitx` so they cannot shadow `CONVERT` / `convert` in the test harness.

**Vectors.**
1. 2 % = **1:50 = 1.1458°**; 1:1.5 = **66.67 % = 33.690°**.
2. 1 TR = **3.516853 kW = 12,000 Btu/h**.
3. 10,000 m² = **2 F 9 Q 3.16 S** with feddan 4200.833 [H/M]. The profile setting for a 4200 m² feddan gives 2 F 9 Q 3.43 S.

There are no documents and no PDF.

### 3.13 `checklists` (QA/QC): kept, moved onto the kit

Templates, the builder and the inspection flow stay as they are; the template content in `data/checklists.ts` does not change. Four things change:

1. **Report.** `inspectionPdf` becomes `qcReportSpec(inspection, project) → DocSpec`, rendered by the document kit (§5a) as its first consumer.
   - The issuer's title block replaces the EngSpace letterhead band. Parties come from the project profile (§5b); the inspection's own project / contractor / consultant text fields stay as overrides for inspections without a project.
   - The signature row gains the 40 × 40 mm stamp box. `REPORT_PROMO` is replaced by the §5a footer line.
   - The repeated table header, verdict box, figure cards and photo appendix keep their content.
2. **Storage.** Inspections and user checklists move into the tool document store (§5c) as kinds `inspection` and `qcTemplate`, which gives them tombstones. This fixes the resurrection bug: a deleted inspection came back from a second phone and pointed at photos already removed from Storage.
   - The import is **idempotent and runs on every hydrate** while the old keys exist: it reads the old `inspections` / `qcTemplates` member_state keys (and, on first launch, this device's localStorage copies) and merges them into the store by id, newest `at` wins, and an existing tombstone wins over an older copy. A second run changes nothing.
   - The «already imported» flag is **per device** (`storeDevice("toolMigrated", pid, { qc: 1 })`), never in synced `toolPrefs`: during the staged preview → production rollout a phone still on the old bundle keeps writing the old key, and a synced flag would make the updated phone skip that phone's inspections.
   - The old keys stay for two releases, so a phone still on the previous bundle loses nothing. They are deleted only in the release that removes the import, which frees two of the 40 keys. Until then `inspections` stays in `PANE_KEYS`; that release replaces it with `toolIndex` and updates the `tests/navigation.test.ts:20` pin in the same commit.
   - The silent `.slice(0,100)` / `.slice(0,60)` become the store caps of §5c, with a warning instead of a drop.
3. **Links.** Inspections dated today feed the diary (§3.5). A pour plan links its «ما قبل صب الخرسانة» inspection. A failed inspection offers «افتح تقرير عدم مطابقة» once `ncr` ships (wave 3).
4. **Delete** asks first (already on the branch) and gains the 6 s undo toast (§5d).

**Engine:** none new; the tally helpers stay in `data/checklists.ts`.

**Tests** (all updated in the same commit as `qcReportSpec`).
- `e2e/checklists.spec.ts`: the raster pages are `/Indexed` Flate images, not JPEGs, so `jpegsOf(pdf).length` (lines 23, 41, 92, 95) becomes `pdfFacts(buf).numPages` (pdfjs-dist legacy build in Node) plus a per-page `/Indexed` image count. The hooks `data-qc-new`, `data-qc-builder`, `data-qc-inspection` and `data-qc-export` stay on the QA/QC screens and on the kit `ExportBar`, so the existing flows keep their selectors.
- `tests/qc-builder.test.ts:50-55`: the `REPORT_PROMO` wording pin, the `canvases.forEach … صفحة ${i + 1} من ${total}` regex and the `tableHead()` regex are rewritten against `qcReportSpec`: block kinds, signature parties, the stamp box and the new footer line.
- `tests/checklists.test.ts:4,34-37`: `pdfFromJpegs` stays exported from `src/lib/report-pdf.ts` as the JPEG fallback writer (§5a), so the test keeps passing; or it moves to `src/doc/pdf-writer` with the test.
- CLAUDE.md's `REPORT_PROMO` line is updated.
- New `tests/tools/qc-migrate.test.ts` pins the migration: old keys become kinds, a tombstone beats a stale copy, an old-bundle write after the import is merged on the next hydrate, and a second run changes nothing.

**Liability note:** unchanged («قائمة استرشادية…»), plus the §8.1 general disclaimer above the signatures.

### 3.14 `wallTakeoff`: حصر المباني والبياض (Masonry & plaster take-off, Phase 2)

**Purpose.** The multi-wall take-off the technical office prices and certifies: units, mortar converted to cement and sand by the Egyptian kg-per-m³-of-sand convention, automatic lintels, and plaster per face with corner beads and mesh. It reuses `tradeMasonry` and `tradePlaster` (§3.1); the trade-kit «المباني» tile stays the quick single-wall mode. `finishTakeoff` later reads the same `walls[]`.

**Screen flow.**
1. **Unit chips:** طوب أحمر 25×12×6 · طفلي 24×11×6 · طفلي دبل 24×11×12 · طفلي 19×9×6 · بلوك 40×20×10 / 12 / 15 / 20 / 25 · AAC 60×20×t · مخصّص (L × W × H in cm).
2. **Walls** (cards): label, unit, bond (نصف طوبة / طوبة / طوبة ونصف / طوبتين), L, H, count; position (فوق منسوب الأرض / تحت منسوب الأرض / دروة), which picks the mortar mix; openings [w × h × n]; plaster faces (none / داخلي / خارجي / تحت التكسيات) with `areaFactor` 1 or 2.
3. **Summary:** units with waste, mortar m³, cement bags, sand m³, lintel concrete, plaster by face kind, corner beads (m) and junction mesh (m²).

**Rules** [H geometry, M conventions].
- Units and mortar as `tradeMasonry` (½ / 1 / 1½ / 2 leaves, hollow block, AAC thin bed).
- Mortar mix by position: above ground 250, below ground 350, parapet 400 kg per m³ of sand [M].
- **Lintels:** every opening ≥ 1.0 m wide gets a lintel (w + 2 × 0.20) × 0.20 × t [M]; its face is deducted from the masonry and its concrete is listed.
- **Deduction rule:** all / > 0.5 m² / > 1 m² / contract (project setting) [M].
- Plaster as `tradePlaster`, per face × areaFactor. Corner beads Σ(2h + w) per opening plus external corners; mesh = junction length × 0.30 × 1.10 [M].
- Validation: Σ openings < gross area (error); L 0.1–100 m; H 0.1–12 m; joint 0.5–2 cm.

**Engine API** (`src/domain/tools/wall-calc.ts`, prefix `wall`): `WALL_ENGINE`, `wallUnitsPerM2`, `wallMortarPerM2`, `wallLintels`, `wallPlaster`, `wallLine`, `wallTakeoff`; each returns `checks` and `trace`.

**Saved document.** `WallBody = { units: WallUnit[]; jointCm: number; deductRule: "all" | "gt05" | "gt1" | "custom"; deductMinM2?: number; mixes: { above: number; below: number; parapet: number }; walls: WallIn[] /* ≤ 400 */ }`.

**PDF «كشف حصر المباني والبياض · Masonry & plaster take-off» (WT, portrait).** Wall table: # · wall / location · unit · bond · L × H · n · gross m² · openings m² · lintels m² · net m² · units · mortar m³; summary by unit and mix; plaster by face kind; material totals; accessories; the basis block; signatures أعدّه · راجعه · الاستشاري and a stamp.

**Test vectors** (`tests/tools/wall-calc.test.ts`).
1. **M1.** ½-brick 25×12×6, j 1 cm, wall 10 × 3 m, door 0.90 × 2.10 (no lintel) → net **28.110 m²**; 54.9451 /m² → 1,544.5 → +5 % **1,622 units**; mortar **0.5931 m³**; sand **0.7414 m³**; cement @250 = 185.34 kg → **4 bags**.
2. **M2.** Block 40×20×20 hollow, 20 m² net, 4 % waste → 232.29 → **242 blocks**; mortar 0.280 m³ → sand **0.350 m³** → 87.5 kg → **2 bags**.
3. **M3.** ½-brick wall 6 × 3 m, window 1.20 × 1.00 → lintel 1.60 × 0.20 (face 0.320 m², concrete **0.0384 m³** at t 0.12); masonry face **16.480 m²** → **951 units**.
4. **M4.** Internal plaster 40 m² (dash 4 mm @450 + base 20 mm @300, waste 20 %) → **9.36 kg/m²** → 374.4 kg → **8 bags**; sand **1.152 m³** (equal to §3.1 vector 3).

**Liability note.** «المعدلات والخلطات والهالك قيم عُرفية قابلة للتعديل، ومقاسات الطوب الفعلية تختلف عن الاسمية؛ طابق الحصر بالمواصفات وقواعد القياس في العقد.» In English: rates, mixes and waste are customary values you can change, and real brick sizes differ from nominal ones. Check the take-off against the specification and the contract's measurement rules.

### 3.15 `takeoffSheet`: كشف الحصر (Measurement sheet, Phase 2)

**Purpose.** The dimension sheet behind every certified quantity: timesing × dimensions, add and deduct rows, grouped under BOQ items. Concrete, wall and BBS quantities end up here, and it backs every IPC line. It has no rates and is open to supervisors.

**Screen flow.** Items (BOQ ref · description · unit · decimals). Each item opens its rows as cards: description / location; timesing chips («3 × 4»); only as many dimensions as the unit needs; a sign («يخصم»). «＋ سطر», «＋ خصم», «استيراد من مستند» (pour plans, concrete take-offs, `wallTakeoff`, BBS summaries) and «لصق من Excel» (§5d). Imported rows keep `src { docId, lineId }`. «أرسل للمستخلص» appears only for members with money access.

**Engine API** (`src/domain/tools/tko-calc.ts`, prefix `tko`).
```ts
export type TkoRow = { id: string; desc: string; times: number[]; dims: number[]; sign: 1 | -1; src?: { docId: string; lineId: string } };
export type TkoItem = { id: string; ref: string; desc: string; unit: "m3" | "m2" | "m" | "no" | "t" | "kg" | "ls"; decimals: 2 | 3; rows: TkoRow[] };
export function tkoRowQty(r: TkoRow): number;   // sign × Πtimes × Πdims, full precision
export function tkoItemQty(i: TkoItem): { gross: number; deduct: number; net: number; checks: Check[] };
```

**Rules.** The number of dimensions must fit the unit (m³ 3, m² 2, m 1, «عدد» 0); a mismatch is the warning `tko.dimCount`, because a factor can stand in for a dimension. A negative net is an error. Item totals are rounded only for display and transfer. `joint: true` prints «حصر مشترك» and adds the consultant's signature box. Limits: ≤ 300 items, ≤ 3,000 rows.

**PDF «كشف حصر الكميات · Measurement sheet» (TS, portrait).** Columns (mm): # 8 · description / location 70 · times 18 · L 18 · W 18 · H 18 · quantity 24. Deductions print in parentheses with «يخصم»; item subtotals carry forward across pages; an item summary; signatures أعدّه (contractor QS) · راجعه (consultant QS).

**Test vectors** (`tests/tools/tko-calc.test.ts`).
1. **T1.** «خرسانة أعمدة»: 12 × 0.30 × 0.60 × 3.00 (m³) → **6.480 m³**.
2. **T2.** «بياض داخلي» (m²): 2 × 7.50 × 2.80, deduct 0.90 × 2.10 and 1.50 × 1.20 → gross 42.000, deduct 3.690 → **38.310 m²** (the `finishTakeoff` pin).
3. **T3.** m² item: times [3, 4] × 2.00 × 1.50 → **36.000 m²**; the same row with 3 dimensions → warning `tko.dimCount`.
4. **Import parity.** Importing the §3.2 slab pour plan reproduces its net m³ exactly (120.000).

**Liability note.** «الكشف يجمع الأبعاد المُدخلة فقط؛ صحة الأبعاد وتفسير طريقة القياس مسؤولية المُعِدّ والمراجع.» In English: the sheet only adds up the dimensions entered; whether they are right, and how the method of measurement is read, is the responsibility of whoever prepares and checks it.

---

## 4. Wave-2 and wave-3 tools

Every tool below reuses the wave-1 conventions (§3.0): a pushed screen, a `ToolDoc` envelope, a code-profile snapshot, «طريقة الحساب» on every result, and the document kit for its PDF. Confidence tags are carried over from the briefs; every [L] value ships as an editable default with «⚑ تحقق». Money tools are marked 💲 and are registered with `money: true`, which removes them from supervisor accounts at the registry level (§5e).

**Test pins need inputs.** A bold number below is a summary, not yet a test. Before Phase 5 starts, each brief's worked example is copied into `tests/tools/fixtures/<tool>.json` as `{ inputs, expected, tolerance, source: "brief §…" }`, and a registry test fails when a tool whose `status` is not `soon` has no fixture. This covers the pins that print outputs only (earthworks 867.5 m³, trench 1,335 m³, liftPlan 1,154.7 kg/leg, panelSchedule 7.14 %, lighting K 2.020, areaSchedule FAR 3.525, egress 82 + 43 …) and the tools with no pin yet (see `delayPenalty`, `voRegister`, `rateAnalysis`, `snagList`).

### 4.1 Wave 2

**`takeoffSheet`** moved to wave 1 (Phase 2): see §3.15. **`wallTakeoff`** is §3.14.

Three tools below ship early, in **Phase 4** (wave 1), so that architecture, infrastructure and HVAC each have a live tool at the W1 gate: `finishTakeoff`, `fieldDensity` and the quick mode of `coolingLoad`. Their specs stay here with the rest of the family.

**`finishTakeoff` · حصر التشطيبات · Room-based finishes take-off (PDF yes; Phase 4).**
- **Room register.** L × W × H or polygon area and perimeter, openings with reveals, a finish code per surface. The register is shared later with `openings`.
- **Formulas** (architecture and masonry briefs):
  - floor = L·W; wall gross = perimeter·H; wall net = gross − Σ openings above the deduction rule;
  - skirting = perimeter − Σ door widths;
  - tiles, grout and paint as in §3.1;
  - gypsum boards = ceil(A(1 + w)/2.88);
  - ceiling metals: main channel 1.0–1.2 m/m², furring 2.5 m/m², hangers 1.0–1.3 /m² [M]; T-grid 0.83 + 1.67 + 0.83 m/m² [H];
  - adhesive by notch: 6 mm 2.0, 8 mm 2.7, 10 mm 3.3 kg/m² [H];
  - membranes: rolls = ceil((A + upturns)·layers·(1 + w)/8.865) [H laps];
  - screed: cement = A·t·1.1·C [M];
  - walls and lintels come from `wallTakeoff` (§3.14): a room's walls can link to its `walls[]`, so masonry and plaster are never measured twice.
- **Opening deduction rule.** A project setting: all / above 0.5 m² / custom [M].
- **Test pin** (architecture brief, inputs stated because they differ from the §3.1 defaults): room 4.00 × 3.50 × 2.80 m, door 0.9 × 2.1, window 1.5 × 1.2; tiles 600 × 600, joint 2 mm, **waste 7 %**, box 1.44 → **42 tiles** (41.34), **11 boxes** (10.40); net wall **38.31 m²**; paint 2 coats @ 10 m²/L, **η = 1** (sheet value already practical), waste 10 % → **11.5082 L**; boards 1.2 × 2.4, waste 10 % → **6** (5.347).
  - With the §3.1 defaults (straight pattern 10 %, η 0.75) the same room gives **43 tiles** and **15.344 L**.
- **PDF «جدول التشطيبات وحصر الكميات».** Room table, totals by material, an assumptions block and BOQ item references. No prices, ever.

**`snagList` · قائمة الملاحظات · Snag / punch list (PDF yes).**
- **Each item:** location (building / level / room), trade, up to 3 stamped photos, priority, responsible subcontractor, due date.
- **Status chain:** open → fixed → verified → closed. A verifier's tap stamps the time.
- **Arithmetic:** ageing days and open-count per trade. Pin: three items opened 2026-10-01, 2026-10-05 and 2026-10-09; the first was closed on 2026-10-08. As of 2026-10-10 → open ages **5 and 1 days**, the closed item aged **7 days**, open count **2**.
- **PDF.** Grouped by subcontractor, so each one receives only their page set. Photo appendix and a closing signature row (contractor · consultant).

**`fieldDensity` · الكثافة الحقلية · Field density and compaction QC (PDF yes; Phase 4).**
- **Methods:** sand cone (ASTM D1556) or nuclear gauge (ASTM D6938) [H].
- **Formulas [H]:**
  - M_hole = M_before − M_after − M_cone; V = M_hole/ρs; ρ_wet = M_soil/V;
  - w = (M_wet − M_dry)/M_dry; ρ_d = ρ_wet/(1 + w); RC = 100·ρ_d/MDD;
  - zero-air-voids validity ρ_zav = Gs·ρw/(1 + w·Gs): above it the test is invalid and never "accepted";
  - ASTM D4718 oversize correction.
- **RC defaults:** subgrade 95 %, sub-base 98–100 %, base 100 % of Modified Proctor [M/L ⚑]; moisture OMC ± 2 % [M].
- **Test pin** (infrastructure brief): ρs 1.450; before 6,500 g; after 2,940 g; cone 1,580 g; soil 2,850 g; moisture wet 250.0 g, dry 232.0 g; MDD 2.020; OMC 8.5 %; Gs 2.65 → M_hole **1,980 g**, V **1,365.517 cm³**, ρ_wet **2.0871**, w **7.759 %**, ρ_d **1.9368**, **RC 95.88 %** (PASS at 95, FAIL at 100). Oversize correction **MDD_c 2.1208, OMC_c 7.00 %** (inputs copied into the fixture from the same brief section).
- **PDF «تقرير اختبار الكثافة الحقلية».** One row per test, retests linked to their original, a summary (% passing, lowest RC), and signatures (lab technician · contractor QC · consultant).

**`heatStress` · الإجهاد الحراري وحظر الظهيرة · Heat index and midday-ban planner (no PDF).**
- **Heat index:** the NWS Rothfusz regression from air temperature and RH, with the NWS low-RH and high-RH adjustments [H].
- **Bands:** caution 80–90 °F (27–32 °C), extreme caution 90–103 °F (32–39 °C), danger 103–124 °F (39–51 °C), extreme danger ≥ 125 °F [H].
- **Work/rest and water guidance** per band [M]. Gulf midday bans as dated, editable presets [M]:
  - UAE 12:30–15:00, 15 Jun–15 Sep;
  - KSA 12:00–15:00, 15 Jun–15 Sep;
  - Qatar 10:00–15:30, 1 Jun–15 Sep.
  - Egypt has no national ban [L].
- **Test pin:** 35 °C at 50 % RH → **HI 105.2 °F = 40.7 °C, «خطر»**.
- **Links.** The band feeds the toolbox talk topic suggestion and the pour planner's hot-weather check.

**`crewPlanner` · تخطيط العمالة والمدة · Crew size and duration planner (saves documents, no PDF).**
- **Formulas:** days = Q/(outputPerDay·crew·η); crew = ceil(Q/(outputPerDay·η·days)); η 0.6–0.9 [M]. The productivity field is `outputPerDay` (never `rate`, §6 rule 4).
- **Productivity table:** the masonry and HSE briefs' ranges [L ⚑].
- **Learning from diaries.** The table recalibrates from the member's own diaries (quantity executed ÷ man-days per trade). Each learned rate is shown with its sample size.
- **Test pin:** 1,200 m² plaster at 20 m²/day, 4 plasterers, η 0.85 → **17.65 → 18 days**; a 12-day deadline needs **6 plasterers**.
- **No money.** Days and heads only.

**`cubeLog` · سجل مكعبات الخرسانة · Cube register (PDF yes).**
- **Set planning.** Sets are created from a pour plan's cube plan, with cast date and cube size (150 mm, 158 mm, or 100 mm with the 0.97 factor) [L ⚑].
- **Results:** f = P/A per cube (A = 22,500 mm² for 150 mm), set mean, and the 7-day ratio as an early warning only (65–70 % of 28-day for OPC [M]).
- **No verdict.** There is no acceptance verdict while ECP's two criteria are unverified [M]. The acceptance rule is a disabled profile block until the owner supplies the clause.
- **Reminders.** Due test dates appear in «اليوم في الموقع». There are no OS notifications, which would need a native plugin.
- **PDF.** Register table plus a signature row (lab · contractor QC · consultant).

**`hotConcrete` · حرارة الخرسانة صيفًا · Fresh-concrete temperature and cooling planner (no PDF).**
- **Heat balance [M, ACI 305R form; verify against the edition]:**
  T = [0.22(T_a·M_a + T_c·M_c) + T_w·M_w + T_a·M_wa − 80·M_i] / [0.22(M_a + M_c) + M_w + M_i + M_wa] (°C, kg).
- **Test pin:** aggregates 1,800 kg at 35 °C, cement 350 at 45 °C, water 175 at 25 °C, free water 36 → **33.57 °C**. Chilled water at 5 °C → **28.45 °C**. 50 kg ice replacing 50 kg of the chilled water → **22.24 °C**.
- **Warnings:** above the profile limit (35 °C at delivery [L ⚑]) and when the discharge time exceeds 60 min above 32 °C air [L].

**`lapLength` · التماسك والوصلات · Development and lap length (no PDF).**
- **ECP profile:** the standalone view of `bbsLd` (§3.3): Ld = α·β·η·(fy/γs)·Φ/(4·fbu), fbu = 0.30√(fcu/γc) [H]. Lap = Ld when ≤ 50 % is spliced and staggered by ≥ 1.3 Ld, otherwise 1.3 Ld [M]. Minimum 300 mm deformed / 400 mm smooth [M].
- **ACI profile:** hook extensions and bend diameters (12 db, max(4db, 65 mm), 6db / 8db / 10db) [H], and development length per ACI 318-19 Table 25.4.2.3 (SI, clear spacing and cover ≥ db): ld = fy·ψt·ψe·ψg / (2.1·λ·√f'c)·db for db ≤ 19 mm and / (1.7·λ·√f'c) for db ≥ 22 mm, ψt 1.3 for top bars, ψg 1.0 (Grade 420) / 1.15 (Grade 550), ld ≥ 300 mm, Class B lap = 1.3·ld [M ⚑ until checked against the printed code]. Vector: fy 420, f'c 28, Ø16 bottom → ld **604.7 → 625 mm** (up to 25 mm); Class B **786.2 → 800 mm**. Once this ships, the BBS uses it under `aci318-19@1` instead of a typed lap.
- **Cover:** the ECP table by exposure, 20/25 · 25/30 · 30/35 · 40/45 mm [L ⚑].

**`earthworks` · الحفر والردم والنقل · Earthworks (PDF yes).**
- **Grid method:** V = (A/4)(Σh₁ + 2Σh₂ + 3Σh₃ + 4Σh₄), with node weights computed from the cells that touch each node, so L-shaped plots work [H].
- **Mixed cells:** V_cut = A(Σh₊)²/(4Σ|h|) [M].
- **Sections:** end-area and prismoidal (A_m measured, not averaged) [H].
- **Swell and shrinkage** with both definitions shown. Trips are governed by the smaller of heaped volume and payload ÷ loose density.
- **Ground levels** come from a `levelBook` grid, so they are typed once.
- **Test pins:** **867.5 m³** grid, **685.0 m³** L-shape, **352.5 m³** end-area, **690 vs 695 m³** prismoidal vs end-area, **160 trips** when payload governs, **1,764.71 m³** bank for 1,500 m³ compacted at 15 %.
- **PDF.** Section table with running totals, factors marked «مقاس» (measured) or «افتراضي», and haulage.

**`trench` · خنادق المواسير · Pipe trench, pipes, manholes and dewatering (PDF yes).**
- **Width:** B = OD + Δ (BS EN 1610 Table 1) [M].
- **Areas:** A_exc = H(B + s·H). The pipe zone, granular bedding, backfill and surplus follow, with swell and shrinkage.
- **Pipe count:** pipes = ceil(L_clear/l_lay).
- **Manhole concrete** as base + wall + cover rings.
- **Slopes:** the OSHA slope reference is shared with `workPermit`. A shoring warning appears from 1.5 m, and the tool switches off above 6.1 m.
- **Dewatering:** Sichardt + Dupuit in a box «تقدير أولي — ليس تصميماً» [M].
- **Test pins:** **V_exc 1,335 m³**, **granular 273.82 m³**, **17 trips**, **24 pipes**, manhole **2.5235 m³**, dewatering **2.17 L/s per 100 m**.
- **Links.** Reaches can be imported from a `drainRun`.

**`pavement` · كميات طبقات الرصف · Pavement layer quantities (PDF yes).**
- **Granular layers:** compacted volume, dry and wet mass from MDD·RC. Loose volume comes from densities, not a fixed factor; the implied factor is shown and warned outside 1.15–1.45 [L].
- **Water to add**, or «تحتاج تجفيف» when the delivered moisture is above OMC.
- **Asphalt:** tonnes = A·t·ρ_mix; bitumen by mix vs by aggregate.
- **Sprays:** prime and tack litres. The spray field is named `sprayLm2` (§6 naming rule).
- **Test pin:** **V_loose 1,927.06 m³, 121 trips, binder 1,151.5 t, wearing 822.5 t, prime 8,400 L, tack 2,100 L**.
- **PDF.** Station table, per-layer quantities, a cross-section sketch and assumptions with sources.

**`traverse` · المضلعات والإحداثيات · Bearings, traverse, area and feddan (PDF yes).**
- **Polar ↔ rectangular** with atan2(ΔE, ΔN) [H].
- **Closed traverse:** angular misclosure against C″√n, bearing propagation, Bowditch and transit adjustment, precision ratio. FGCC presets plus a project value [H/M].
- **Area:** shoelace area in m² and in feddan / qirat / sahm (4200.833 m² feddan, with a 4200 option) [H/M].
- **Coordinates are typed:** no GPS on line 2.
- **Test pins:** B **(5104.569, 3069.213)**; inverse **118.919 m, 142°30′29.09″**; misclosure **0.0131 m = 1:33,053**; Bowditch B **(1060.009, 2104.008)**; area **11,584.952 m² = 2 F 18 Q 4.48 S**.
- **PDF.** Observation table, adjustment table, coordinates, signatures (surveyor · consultant).

**`setOut` · التوقيع المساحي · Setting-out sheet (PDF yes).**
- **Inputs:** occupied station, backsight and a list of design points.
- **Outputs:** bearing, distance and clockwise angle from the backsight, plus a mandatory check shot to a second known point.
- **Scale:** the grid-to-ground combined factor k₀(1 + x²/2R²)·R/(R + h) is applied or explicitly declined, and the sheet states which [H].
- **Test pin:** **51°20′24.69″, 64.031 m, angle 290°52′30.39″**.
- **PDF.** «جدول التوقيع المساحي».

**`stairCheck` · السلالم والقائمات المنفذة · Stair design and as-built riser check (PDF yes).**
- **Design:** n = ceil(H/R_max); R = H/n; G = 630 − 2R rounded down to 5 mm; 2R + G within 600–640 [H].
- **Egress limits:** NFPA 101 / IBC [H]. The Egyptian residential stair values are a disabled profile [L ⚑].
- **Site mode:**
  - finished first riser = structural + tread finish − floor finish; last riser likewise;
  - tolerance 5 mm adjacent and 9.5 mm within a flight [H];
  - prints the structural correction.
- **Test pins:** 3,200 mm with **R_max 175 mm (project profile)** → **19 × 168.42 mm, G 290, 2R+G 626.84, 30.15°**. With the IBC / NFPA 101 limit R_max 177.8 mm → **18 × 177.78 mm**, G = 630 − 355.6 → **270**, below the 279 mm tread minimum → the engine raises a check and suggests 19 risers. Site mode → first **148.42 FAIL**, last **188.42 FAIL**.

**`liftPlan` · خطة الرفع المبسطة · Lift plan (PDF yes).**
- **Sling legs:** T = W/(n_eff·sin θ), with n_eff = 2 for 3- and 4-leg slings. Below 30° the plan is blocked [M/H].
- **Utilisation:** U = (load + hook + rigging + deductions)/capacity.
  - The capacity is **typed from the chart at the next larger radius**; charts are never stored or interpolated.
  - U > 100 % blocks the lift; above the company threshold (75–90 % [L/M]) it is flagged «رفعة حرجة».
  - Personnel platforms ≤ 50 % [H].
- **Outrigger mat:** area = F/q_allow, with q_allow from the geotechnical report.
- **Power lines:** reuses `ptwLineClearance`.
- **Test pins:** **1,154.7 kg/leg**; **73.5 % OK / 78.4 % critical**; mat **1.602 m², 1.3 × 1.3 m → 142.2 kPa**.
- **PDF.** BS 7121-1 style: appointed person · lift supervisor · operator · rigger.

**`scaffoldTags` · بطاقات السقالات والسلالم · Scaffold, ladder and harness tag register (PDF yes).**
- **Tags:** green / yellow / red [M]. Inspection each shift or ≤ 7 days and after bad weather [H].
- **Checklist:** OSHA 1926.451 items [H].
- **Tie check:** tie once h > 4 × base width; vertical spacing ≤ 6.1 m (≤ 0.91 m wide) or 7.9 m; horizontal ≤ 9.1 m; top tie ≤ 4 × width below the top [M/H].
- **Ladder geometry** from §3.7. **Harness:** competent-person inspection every 12 months [M].
- **Test pin:** 1.2 m wide, 20 m high, 30 m long → ties at **4.8 / 10.0 / 15.2 m, 5 per level, 15 ties**.
- **PDF.** Tag register with defect photos.

**`weeklyReport` · التقرير الأسبوعي والشهري · Weekly and monthly roll-up (PDF yes).**
- **Pure aggregation over issued diaries:**
  - man-days by trade × company;
  - equipment utilisation;
  - quantities by activity for the week vs cumulative, with an optional planned column typed by the user;
  - weather days lost;
  - IR statistics with first-time pass %;
  - materials, incidents and man-hours;
  - open instructions and RFIs;
  - the delay-event log for the extension-of-time file (FIDIC 4.21 / 6.10 [M]).
- **Same section renderers as the diary**, so the PDFs match. No money.

**`incident` · الحوادث ومؤشرات السلامة · Incident / near-miss report and KPIs (PDF yes).**
- **Fields:** OSHA 301 fields [H], classes with the 1904.7 recordable test [H], a 5-Why root cause, and corrective actions with owner and due date (ISO 45001 §10.2) [H].
- **Rates [H]:** TRIR = rec × 200,000/h; LTIFR = LTI × 10⁶/h; severity = lost days × 200,000/h.
- **Test pin:** 450,000 h, 3 recordables, 1 LTI, 12 lost days → **1.333 / 2.222 / 5.333**.
- **Privacy.** Health data is sensitive under PDPL 151/2020 [M] (§8.4).
  - An «نسخة مجهّلة» PDF replaces names with role and trade.
  - The diary receives only the count.
  - Nothing is ever pushed or posted.

**`extinguishers` · طفايات الحريق · Extinguisher count and register (PDF yes).**
- **Count:** NFPA 10 Table 6.2.1.1: a = min(rating × area per A, 1,045 m²); N = ceil(A/a). Travel ≤ 22.9 m is checked on the plan by the user [H].
- **Ratings.** Kilograms and EN 3 ratings are refused as "A" units. EN stock uses the BS/ECP profile.
- **Test pin:** 2,400 m² ordinary hazard → **4-A: 5 · 3-A: 6 · 2-A: 9**.
- **Register:** monthly and annual inspection log, reusing QA/QC items.

**`detectors` · توزيع الكواشف · Detector and call-point spacing (PDF yes).**
- **NFPA 72:** smoke S = 9.1 m (or every point within 0.7S); heat = listed spacing × the ceiling-height factor; manual call points within 1.5 m of exits and ≤ 61 m travel [H/M].
- **BS 5839-1:** radius 7.5 / 5.3 m [M–H].
- **Methods:** grid ⌈L/S⌉·⌈W/S⌉ and radius (smallest nx·ny with (L/2nx)² + (W/2ny)² ≤ R²).
- **Test pins** (20 × 12 m): NFPA smoke **6 grid / 4 radius**; BS smoke **3**, heat **6**; heat 15.24 m listed at 4.5 m → **11.73 m, grid 4 / radius 2**.

**`fireDemand` · الطلب المائي للحريق · Sprinkler demand and fire-tank volume, preliminary (PDF yes).**
- **Design point:** NFPA 13-2022 Table 19.2.3.1.1 density and area, plus hose allowance and duration [H].
- **Formulas:** N = ⌈A_d/A_s⌉; q_min = d·A_s; P = (q/K)² ≥ 0.5 bar; Q_spr = max(d·A_d, N·q_min); V = (Q_spr + Q_hose)·t; Hazen–Williams friction, C 120 wet [H].
- **Test pin** (OH1, A_s 12, K80): **N 12, q_min 73.2 L/min, P 0.8372 bar, Q_spr 878.4, Q_tot 1,824.4 L/min, V 109.464 m³ at 60 min**.
- **Banner:** «ليست حسابات هيدروليكية». The ECP minimum tank is a disabled profile [L].

**`coolingLoad` · حمل التبريد واختيار الوحدات · Cooling load and unit selection (PDF yes; quick mode and unit selection in Phase 4, detailed CLTD in wave 2).**
- **Quick mode:** returns a **range** from W/m² presets [L ⚑] (residential 120–170, office 130–180, retail 170–250, restaurant 250–350, mosque / hall 250–400), watermarked «تقدير مبدئي – لا يصلح للتوريد». Quick pin: residential 30 m² → **3.60–5.10 kW = 1.024–1.450 TR = 12,284–17,402 Btu/h**; the unit ladder suggests **18,000 Btu/h**, with the watermark.
- **Detailed mode:** CLTD/CLF hand method [M]:
  - CLTDc = (CLTD + LM)K + (25.5 − Ti) + (Tm − 29.4);
  - glass solar A·SC·SHGF·CLF;
  - people, lighting and equipment;
  - outdoor air Qs = 1.23·V·ΔT and Ql = 3010·V·ΔW [H].
  - The **dehumidification case is always run** and the larger latent load kept, because Cairo's peak-dry-bulb point is dry and gives a negative OA latent load. A test pins this sign.
- **Unit selection:** from the nominal ladder with manufacturer derating; both total and sensible must pass.
- **Climate presets:** NOAA Cairo and Alexandria [M], replaced by the Egyptian code table once transcribed.
- **Test pins:** **3,665.21 W → 4,031.73 W with 10 % = 1.1464 TR**; select **18,000 Btu/h**; supply air **243.6 L/s**.

**`ventilation` · التهوية والشفط · Outdoor air and exhaust (PDF yes).**
- **Outdoor air:** ASHRAE 62.1 VRP, Vbz = Rp·Pz + Ra·Az [H/M].
- **Exhaust:**
  - toilets 25 / 35 L/s per fixture;
  - car parks 3.7 L/s·m² or 6 / 10 ACH (BS 7346-7 smoke-clearance note);
  - kitchen canopies per metre by duty [M].
- **Multi-zone systems (Ev)** are flagged out of scope.
- **Test pins:** office **85 L/s**; toilets **210 L/s**; car park **31,200 m³/h**; canopy **1,393.5 L/s**.

**`ductSizer` · مقاسات الدكت · Duct sizer, equal friction (PDF yes).**
- **Friction:** Darcy with Altshul–Tsal f, solved for D by bisection [H].
- **Rectangular ducts:** Huebscher De = 1.30(ab)^0.625/(a + b)^0.25 [H].
- **Limits:** velocity and aspect ratio [M].
- **Fittings:** fitting losses and fan static pressure are an engineer input, because ASHRAE fitting data is licensed.
- **Test pins:** 1,000 L/s at 1.0 Pa/m → **D 441.2 mm**; Ø450 → **0.907 Pa/m**; 600 × 300 → **0.840 Pa/m**.

**`waterTank` · الطلب المائي والخزانات · Water demand and tank sizing (PDF yes).**
- **Formulas:** Qd = P·q/1000; domestic, roof and underground split; plus the fire reserve Q_f·t_f.
- **Inputs without defaults.** q comes from the committee ranges [M]. Storage days, roof share and freeboard are **required inputs with no default** [L].
- **Test pin:** **V_UG 28.023 m³, h 2.335 m**.

**`pumpSize` · المضخات · Transfer and booster pump sizing (PDF yes).**
- **Formulas:** H = static + friction + residual; P_h = Q·ρ·g·H/3.6×10⁶; P_s = P_h/η; the motor is the next IEC rating × margin [H].
- **Pressure check:** a static head above 56.2 m flags a PRV or pressure zone [M].
- **Test pin:** **2.132 kW → 3.554 kW → 4 kW**; with a 1.15 margin, **5.5 kW**.

**`panelSchedule` · جدول اللوحة · Panel / load schedule (PDF yes).**
- **Diversity:** ks from IEC 61439 by number of circuits [H]; demand = ks·Σku·P.
- **Imbalance** = (max − mean)/mean, target ≤ 10 % [L].
- **Main breaker** sized from the **heaviest phase** [M].
- **Test pin:** **imbalance 7.14 %, 13.07 kVA**; R phase 4,200 W / (220 × 0.9) = **21.21 A**; with a **25 % spare** margin → 26.52 A → **32 A**; with no spare → **25 A**. The spare % is a stated project input.
- **PDF.** The consultant layout: R / Y / B columns and a small single-line diagram.

**`lighting` · الإنارة · Lumen method (PDF yes).**
- **Formulas:** K = LW/(Hm(L + W)); N = ⌈E·A/(Φ·UF·MF)⌉ [H].
- **UF has no default:** it comes from the datasheet. MF defaults to 0.8 [M]. EN 12464-1 targets [H/M].
- **Test pin:** **K 2.020, 24 luminaires, 518.4 lx, 10.8 W/m²**.

**`earthing` · التأريض واختبار المقاومة · Earth-rod design and test record (PDF yes).**
- **Soil:** Wenner ρ = 2πaR [H].
- **Rods:** R₁ = ρ/(2πL)[ln(8L/d) − 1]; Rn = R₁(1 + λα)/n, α = ρ/(2π·R₁·s) [H]. **λ(n = 3) = 1.66 is confirmed**; λ(n = 2) = 1.00 and λ(4…10) = 2.15 … 3.81 are [L ⚑] and never extrapolated. The table is indexed by the number of rods, never by position.
- **Target:** typed by the user with its source.
- **Test pin** (ρ 100 Ω·m, L 3 m, d 16 mm, spacing 3 m): **R₁ 33.49 Ω**, α 0.1584; **2 rods 19.40 Ω** (λ 1.00); **3 rods 14.10 Ω** (λ 1.66); **10 rods 5.37 Ω**. The advice when the target is not met is printed.
- **PDF.** Includes the as-built test record (instrument serial).

**`rampAccess` · المنحدرات والإتاحة · Ramps and accessibility (PDF yes).**
- **ADA 2010 pack [H]:** 1:12, 760 mm rise per run, 1,525 mm landings, door 815 mm, WC compartment.
- **Egyptian accessibility code values** ship disabled until checked [L ⚑].
- **Test pins:** 450 mm → **5,400 mm, 8.33 %, 4.764°**; in 4,000 mm → **11.25 % FAIL**.

**`ipc` · المستخلص الجاري 💲 · Interim payment certificate (PDF yes, engineers and owners only; Phase 4b).**
- **BOQ import.** Nobody types 300 BOQ lines on a phone: the BOQ comes in from XLSX, CSV or pasted TSV (item, description, unit, quantity, rate) through a validation preview that flags missing units, non-numeric cells and duplicate item codes before anything is saved. Quantities can also come from `takeoffSheet` items («أرسل للمستخلص»).
- **Measured items:** A_cum = round2(Q_cum·R·k_cum), and **current = cumulative − previous**, so rounding never drifts.
  - Arithmetic is in integer piastres [H].
  - Every line keeps both **claimed** (المقدّم) and **certified** (المعتمد) quantities and amounts; the consultant's amendments show as the difference, «معدّل من الاستشاري».
  - Lump-sum items use % complete.
  - Overruns above 10 % (FIDIC 12.3) or 25 % (public, [L]) prompt a VO link.
- **Summary waterfall:** lines A…U of the billing brief (retention, advance, recovery, penalties, contra, VAT, withholding, social insurance, stamps).
- **Regime presets:** private / Law 182-2018 / FIDIC 1999 / FIDIC 2017 set defaults only.
- **Taxes and deductions** (profile `eg-tax@2026-10`; each rate is `{ value, source, asOf, conf }` and prints in the basis footnote):

| Key | Value | Source | As of | Conf |
|---|---|---|---|---|
| `vat.standard14` | 0.14 | Law 157/2025 amending VAT Law 67/2016, in force 18 Jul 2025 | 2026-10-10 | M–H |
| `vat.transitional36` | 0.14 × 0.36 = **0.0504** effective | Ministerial Decree 418/2025 (Al-Waqa'i al-Misriya no. 237, 23 Oct 2025); optional, only for contracts concluded before 18 Jul 2025 | 2026-10-10 | M |
| `vat.legacyTable5` | the pre-2025 table rate | before 18 Jul 2025 only | — | M |
| `wht.contracting` | 0.01 | Income Tax Law 91/2005 art. 59 and its Executive Regulation | 2026-10-10 | M ⚑ «تحقق من مصلحة الضرائب» (no 2023–2026 rate decree was found) |
| `stamp.engineering` | 0.003, **off by default** | a single practice source (mkawlat26, Apr 2025) | 2025-04 | L ⚑ |
| social insurance | modes with their numbers | billing brief | — | L ⚑ |

  - **VAT base** is a project setting `vatBase: "P" | "E−J" | "E"` (P = after retention and advance recovery; E − J = work value less advance recovery, when the advance invoice already carried VAT; E = certified work value). Withholding uses the same pre-VAT base. The default is «E−J» when the advance invoice carried VAT, otherwise «E». The chosen base prints in the basis footnote with ⚑ «راجع المستشار الضريبي».
- **Freezing.** A certified IPC is frozen (its outputs too, §3.0); amendments go into the next one.
- **Test pins** (integer piastres; contract 10,000,000; E cumulative 2,000,000, previous 1,200,000, so E_cur 800,000; retention 5 % of current = 40,000; advance 1,000,000 recovered pro-rata = 80,000; P = 680,000), all «under eg-tax@2026-10»:
  - standard14, WHT 1 %, vatBase **P** → VAT 95,200; WHT 6,800; **net payable 768,400 EGP**;
  - vatBase **E−J** (720,000) → VAT 100,800; WHT 7,200; **773,600 EGP**;
  - vatBase **E** (800,000) → VAT 112,000; WHT 8,000; **784,000 EGP**;
  - transitional36, vatBase P → VAT 0.0504 × 680,000 = 34,272 → **707,472 EGP**;
  - consultant amendment: claimed current 800,000, certified 760,000 → retention 38,000, recovery 76,000, P 646,000; vatBase P → VAT 90,440, WHT 6,460 → **729,980 EGP**, and the claimed column still prints 800,000.
- **PDF.** Summary sheet, detailed measurement sheet (landscape) with claimed and certified columns, advance and retention ledgers, a taxes sheet, the amount in words «فقط … لا غير», and four signature + stamp boxes. «تصدير Excel» gives the QS the same sheets.

**`voRegister` · سجل الأوامر التغييرية 💲 · Variation order register (PDF yes, engineers and owners only; Phase 4b).**
- **Columns:** as in the billing brief. Status chain Raised → Instructed → Proposal → Review → Approved / Rejected / Withdrawn.
- **New-rate test (FIDIC 12.3, 1999 [H]):** quantity change > 10 % **and** change × rate > 0.01 % of the accepted amount **and** unit-cost change > 1 % **and** not a fixed-rate item.
- **Roll-ups:** approved, pending exposure, and VO % of contract. Warnings at 15 % FIDIC and 25 % public [L ⚑].
- **Links.** Feeds IPC line B. The diary's «تعليمات» rows link here.
- **Test pins:** accepted amount 10,000,000; item rate 500, BOQ quantity 1,000. All four conditions pass: quantity 1,150 (+15 %), change 150 × 500 = 75,000 > 1,000 (0.01 %), unit-cost change 2 %, not fixed-rate → **new rate**. Then one case for each condition failing alone: quantity 1,080 (+8 %) → no; a small item (BOQ quantity 5 at rate 100, now 7: +40 %, but 2 × 100 = 200 < 1,000) → no; unit-cost change 0.5 % → no; fixed-rate item → no.

**`subStatement` · مستخلص مقاول الباطن 💲 · Subcontractor statement (PDF yes, engineers and owners only; Phase 4b).** The IPC engine run from the main contractor's side against a subcontract BOQ: the same cumulative − previous arithmetic, retention, advance and the main contractor's back-charges, claimed and certified columns, and a link to the main IPC period. Pin: the IPC pins with the subcontract's own retention rate.

**`irRegister` · سجل طلبات الاستلام · IR / WIR / MIR register (PDF yes).** Rows from QA/QC inspections (IR number, title, location, inspector, verdict A/B/C), manual WIR / MIR rows, re-inspections linked to their original, and the first-time pass % by trade and month. Open to supervisors. Pin: 20 IRs, 15 passed first time → **75.0 %**.

**`rfiLog` · سجل الاستفسارات والاعتمادات · RFI, submittal and transmittal register (PDF yes).** RFIs (question, drawing ref, raised / due / answered, answer), submittals with status A / B / C and revision, and transmittals (documents sent, copies, received by). Ageing and overdue counts; no money. Pin: an RFI raised 2026-10-01 with a 7-day answer period is overdue on 2026-10-09 by **1 day**.

**`meetingMinutes` · محضر اجتماع · Meeting minutes (PDF yes).** Attendees, agenda items, decisions, and actions with an owner and a due date; open actions carry forward to the next meeting's minutes. Pin: 5 actions, 2 closed → the next minutes open with **3** carried actions.

**`dayworkSheet` · يوميات الأعمال الإضافية · Daywork sheet (PDF yes).** Named labour and plant hours against an instruction number, in duplicate for the consultant's signature, with **no rates** (pricing happens in `voRegister` for members with money access). Pin: 4 labourers × 6.5 h + 1 loader × 3 h → **26 man-h, 3 plant-h**.

**`steelTakeoff` · حصر الحديد الإنشائي · Structural steel take-off (PDF yes).** Sections from IPE / HEA / HEB / UPN / L / RHS / CHS tables (kg/m and m²/m [H]), plates (L × W × t × 7,850 kg/m³), bolts by size and grade, and the paint area in m² per tonne. Pin: 12 × IPE 200 × 6.0 m → **1,612.8 kg**; a plate 400 × 300 × 20 mm → **18.84 kg**.

**`curveSetOut` · توقيع المنحنيات · Horizontal curve setting-out (PDF yes).** From R, Δ and the PI chainage: T = R·tan(Δ/2), L = R·Δ, E = R(sec(Δ/2) − 1), M = R(1 − cos(Δ/2)), TC and CT chainages, and deflection angles to each 20 m chord [H]. Pin: R 200 m, Δ 30°, PI at 1+000 → T **53.590 m**, L **104.720 m**, E **7.055 m**, TC **0+946.410**, CT **1+051.130**.

**`finalAccount` · الحساب الختامي 💲 · Final account (PDF yes, engineers and owners only; Phase 6).** The last IPC: final quantities, all VOs, price adjustment, penalties, the release of retention, and the reconciliation of every interim certificate.

### 4.2 Wave 3

**`bearingTest` · قراءة اختبارات التحمل · CBR / DCP / plate-load reader (PDF yes).**
- **Formulas:**
  - CBR = 100(P/A)/σ_std, with 6.9 / 10.3 MPa [H] or BS mode 13.2 / 20.0 kN [M];
  - DCP: CBR = 292/DPI^1.12 [H];
  - k = p(1.27 mm)/1.27 [H];
  - DIN 18134: Ev = 1.5·r·Δσ/Δs on the second-degree fit [H].
- **No allowable bearing.** The engine **refuses to output an allowable bearing pressure**. Plate-to-footing scaling appears only as an information panel.
- **Test pins:** **36 %** (35.95 / 34.62); DCP 12 mm/blow → **18.06 %**; **k 55.12 MPa/m**; **Ev1 25, Ev2 50, ratio 2.00**.
- **PDF** states «ليس تقييماً لقدرة تحمل الأساسات».

**`kerbs` · البردورات والإنترلوك · Kerbs and interlock (PDF yes, no saved documents).**
- **Formulas:** units = ceil(L/(l + j)·(1 + w)); sagitta e = R − √(R² − (l/2)²); pavers per m² = 1/((l + j)(w + j)) or the supplier's figure; bedding sand.
- **Test pins:** **238 / 243 kerbs, 5.21 mm offset, 26,250 pavers, 25 m³ sand**.
- **PDF:** an order sheet.

**`gridCheck` · أنظمة الإحداثيات المصرية · ETM / UTM belt detection and scale factors (no PDF).**
- **Belts:** the ETM parameters (EPSG 22991–22994) and UTM 35N–37N [H].
- **Detection:** belt guessed from northing magnitude, with an E/N swap warning [L].
- **Projection:** TM forward and inverse **within one datum** only. The app refuses any datum transformation for setting out and labels approximate positions ±5–10 m [H].
- **Scale:** point and elevation scale factors. Test pins: **k ≈ 1.00046 at 193 km**; **0.9999843 at h = 100 m**.

**`supplyPipe` · مواسير التغذية · WSFU supply pipe sizing (PDF yes; waits for the licensed ICC tables).**
- **Method:** WSFU (IPC E103.3(2)) → peak demand by interpolation (E103.3(3)) → d_req = √(4Q/πv) → catalogue ID → Hazen–Williams h_f [H formula, M tables].
- **Test pin:** 200 WSFU → **4.1009 L/s → 90 SDR6, 1.450 m/s, h_f 1.012 m (±0.5 %)**.

**`drainSize` · مقاسات الصرف والتهوية · DFU drainage and vent sizing (PDF yes; waits for the licensed tables).**
- **Tables:** IPC 709.1 DFU, 704.1 slopes, 710.1 capacities and 906.2 vents [H/M]. Fixture units are never converted to flows.
- **Test pins:** stack 100 DFU → **4″**; building drain 140 DFU → **4″**; vent **2½″**.

**`chwPipe` · مواسير المياه المثلجة · Chilled-water pipe sizing (PDF yes).**
- **Formulas:** V̇ = kW/(4.19ΔT); Colebrook iterated from a Swamee–Jain seed [H]. Limits 1.2 m/s ≤ 50 mm, 400 Pa/m above [M].
- **Test pin:** 175 kW at 5.5 K → **7.594 L/s → DN80, 338.5 Pa/m**.

**`firePump` · مضخة الحريق والجوكي · Standpipe demand, fire and jockey pump (PDF yes).**
- **Standpipe flows:** NFPA 14 [H].
- **Pump pressure:** outlet + 0.0979·Δz + friction − suction.
- **NFPA 20 checks:** ≥ 65 % pressure at 150 % flow; churn ≤ 140 % [H].
- **Jockey ladder:** stop / start / main start [M].
- **Test pins:** **11.8108 bar**; jockey **165 / 155 / 150 psi**.

**`emergencyLight` · إنارة الطوارئ والهروب · Emergency lighting and exit signs (PDF yes).**
- **Criteria:** NFPA 101 §7.9.2 lux and duration [H]; EN 1838 / BS 5266-1 [M–H]; signs every ≤ 30 m [H].
- **Luminaire count** comes **only** from the datasheet spacing. The app never computes lux.
- **Test pin:** 40 m corridor at 12 m spacing → **5**.

**`septicGrease` · خزان التحليل والجريز · Septic tank and grease interceptor (PDF yes, no saved documents).**
- **Formulas:**
  - septic V = P·q·HRT + P·N·S·F, with the UK check 180P + 2,000 L [M];
  - grease interceptor by PDI G-101 and EN 1825 NS [M].
- **Test pins:** **4.000 m³ vs 5,600 L**; **20 gpm**; **NS 4**.

**`rainwater` · صرف الأمطار · Roof rainwater (PDF yes, no saved documents).**
- **Formula:** Q = C·i·A/3600. Rainfall intensity i is **required with no default**, because the code's IDF equations are biased by region [H].
- **Test pin:** 400 m², 50 mm/h → **5.556 L/s**.

**`shortCircuit` · تيار القصر · Short-circuit at a panel (PDF yes).**
- **Method:** transformer and network impedance; cables at the 20 °C ρ; Isc = U₂₀/(√3·√(ΣR² + ΣX²)) [H]. The maximum symmetrical value only, stated on the PDF.
- **Test pins:** **28.87 kA** infinite source, **27.76 kA** at the terminals, **13.21 kA** at the sub-main board.

**`pfCorrection` · تحسين معامل القدرة · Power-factor correction (no PDF).**
- **Formula:** Qc = P(tan φ₁ − tan φ₂) [H]. Target 0.95; the tariff threshold is [M ⚑].
- **Test pin:** **221.29 kvar**.

**`genUps` · المولد والـ UPS · Generator and UPS sizing (PDF yes, no saved documents).**
- **Generator:** kVA = kW/0.8 [H]. Motor start S = m·P/(η·cosφ), with m 5–8 [L ⚑].
- **UPS:** Wh = P·t/η × 1.25 ageing × margin [H/M].
- **Test pins:** **225 kVA**; **227.5 kVA** at start; **2,659.6 → 3,324.5 Wh**.

**`lowCurrent` · التيار الخفيف · Low-current quick checks (no PDF).**
- **Fire-alarm battery:** Ah = (I_standby·T_standby + I_alarm·T_alarm) × 1.25. T values come from the profile: 24 h + 5 min (NFPA 72) or 24 h + 30 min (BS 5839-1) [M ⚑].
- **Cat 6 channel** ≤ 100 m (90 m link + 10 m cords) [H].
- **CCTV storage:** GB = Σ cameras × Mbps × 3600 × hours × days/8/1000 [H arithmetic]. Test pin: 16 cameras × 4 Mbps × 24 h × 30 d → **20,736 GB**.

**`areaSchedule` · جدول المساحات والاشتراطات · Area schedule, zoning and parking (PDF yes; engineers and owners). Moved to the first wave-2 batch (Phase 5), because the architecture brief rates it daily in offices.**
- **No hard-coded limits.** Every limit is typed from the permit with its reference number.
- **Formulas:** coverage; BUA and FAR; excess; height ≤ min(permit, k × street) with k 1.5 [L ⚑]; roof-room allowance 25 % [L ⚑]; loading factor; parking.
- **Test pins:** **FAR 3.525 FAIL, excess 315 m², loading 14.516 %, saleable 91.61 m², 26 spaces**.

**`openings` · جدول الفتحات والإضاءة والتهوية · Openings schedule and room register (PDF yes).**
- **Ratios:** light = Σ glazed/floor; ventilation = Σ openable/floor. IBC 8 % / 4 % [H]; the Egyptian 10 % rule [L ⚑].
- **Shared room register** with `finishTakeoff`.
- **Test pins:** bedroom **12.0 % / 7.5 %**; kitchen **8.33 % / 11.1 %** (FAIL against a 10 % light rule).
- **PDF.** Door and window schedule plus one room data sheet per room.

**`egress` · حمل الإشغال والهروب · Occupant load and egress width (PDF yes; engineers and owners, high liability).**
- **NFPA 101 method [H]:** load factors by edition; capacity 7.6 mm/person on stairs and 5 mm elsewhere; exits by load; separation; the 50 % loss rule.
- **Test pins:** **82 + 43 = 125 persons; stair 950 → 1,120 governs**. The older 9.3 m² factor gives **166 persons and 1,261.6 mm, FAIL**, so the PDF stamps the edition prominently.
- **PDF** is labelled "supporting calculation for the civil-defence submission".

**`ncr` · تقرير عدم المطابقة · Non-conformance report (PDF yes).**
- **Contents:** the spec clause breached, description, photos, root cause, disposition (rework / repair / use as is / reject), corrective and preventive action, then verification and close-out.
- **Opening:** from a failed QA/QC inspection, prefilled.

**`rcSection` · مقاومة القطاعات الخرسانية · RC section check, ECP 203 (PDF yes; engineers and owners, high liability).**
- **Scope:** singly and doubly reinforced rectangular flexure and shear by the ECP limit-state method. γc = 1.5 and γs = 1.15 [H, as in the Ld derivation]; the stress-block and shear constants are [M].
- **Ships disabled («بانتظار المراجعة»)** until the owner supplies the ECP 203 text and a licensed structural engineer verifies every constant and signs the test vectors.
- **PDF:** «ليس للتنفيذ دون توقيع».

**`delayPenalty` · غرامات التأخير 💲 · Delay penalty (PDF yes, no saved documents; engineers and owners).**
- **Law 182/2018 art. 48 [M]:** a scaled % by delay share starting at 1 %; cap 10 % when the delay is ≤ 10 % of the duration, otherwise 15 %; the base is the late part if separable.
- **Other regimes:** the private contract's rate × days with its cap, or the FIDIC delay-damages rate with its maximum [H].
- **Output:** feeds IPC line K.
- **Test pins:** private contract 0.1 % per day × 30 days on 5,000,000 with a 10 % cap → **150,000**; 120 days → 12 % → capped at **500,000**. Law 182 cap choice: delay 8 % of the duration → cap **10 %**; 12 % → cap **15 %**. The scaled percentage between 1 % and the cap is [L ⚑] until the Executive Regulation text is supplied, and its worked case is reviewed by counsel before the tool leaves `soon`.

**`priceAdjust` · فروق الأسعار 💲 · Price adjustment (PDF yes; engineers and owners).**
- **Formula:** P₁ = P₀(a + Σkᵢ·Iᵢ₁/Iᵢ₀) with a + Σk = 1 [M]. Quarterly for public contracts ≥ 6 months [M].
- **Indices are typed with their source and month.** None are bundled.
- **Exclusions:** the part bought with the advance, and delays that are the contractor's fault.
- **Test pin:** a 0.15 fixed share with cement 0.20 (1.25), steel 0.35 (1.10), labour 0.20 (1.30) and fuel 0.10 (1.40) → **factor 1.185, +185,000 on 1,000,000**.

**`rateAnalysis` · تحليل سعر البند 💲 · Unit-rate build-up (PDF yes; engineers and owners).**
- **Build-up:** materials (quantity × price × waste) + labour (crew-hours from the productivity table) + equipment + overhead % + profit %.
- **Taxes:** per the IPC regime settings.
- **Links:** reuses the trade-kit consumptions, so the material lines are the same numbers the site orders with.
- **Test pin:** direct cost 1,500 (materials 1,000 + labour 300 + equipment 200) → overhead 10 % = 150 → 1,650 → profit 8 % on cost + overhead = 132 → **1,782.00 EGP per unit**, in integer piastres.

**`siteBook` · دفتر الموقع · Site instruction book [L ⚑] (PDF yes).** The Egyptian site instruction book the consultant writes in: numbered, dated instructions and observations with the contractor's acknowledgement, never edited after issue (corrections are new entries). Its legal standing and format are [L] until the owner supplies a sample; it ships `soon` until then.

The salary and offer tools (`offer` `net` `compare` `script` `raise` `path` `contract` `move` `inflation`) and `cvreview` keep their current screens and behaviour; only their registry entries change (§5e).

---

## 5. Shared foundation

### 5a. Document system (`src/doc/`)

**Decisions.**
1. **One document model, several backends.** A tool builds a `DocSpec`, which is pure data with no DOM. `docLayout()` turns it into a paginated display list, measuring text through a `Measurer`. Backends only draw that list. The page count is known before anything is drawn, so every page is drawn, encoded and released in a single pass, with no second footer pass.
2. **Wave 1 (line 2, over the air): the `raster` backend.**
   - Each page is drawn on a 240 dpi canvas.
   - The page is stored **losslessly** as a 4-bit indexed image, compressed with Flate. The page theme is greyscale plus one accent by design, so 16 inks are exact for rules and fills and within one grey step on anti-aliased text edges. There is no JPEG smudge.
   - Photos and logos are separate JPEG images placed over their frames at their own resolution.
   - The PDF carries real metadata: Title, Author = issuer, Creator, `/Lang`, and right-to-left viewer preference.
   - The on-screen preview draws the same display list.
3. **Phase 5 (still over the air, line 2): the `vector` backend.**
   - harfbuzz (wasm) shapes the text, bidi-js orders it, hb-subset embeds the fonts, and our own PDF writer assembles the file.
   - Text is selectable and searchable, and pages are tens of KB.
   - It becomes the default once the golden tests of §7 pass. Raster stays as the automatic fallback.
4. **No native print plugin («EngPdf») is built.**
   - It would need line 3 and a different code path on each platform (Android print adapter, iOS `UIPrintPageRenderer`).
   - The vector backend gives vector output on line 2, on the web and in Node tests, from one deterministic code path.
   - Line 3 carries only optional extras (§7, Phase L3).

**API.**
```ts
// src/doc/model.ts — what a tool produces (pure data)
export type DocLang = "ar" | "en";
export type DocStatus = "draft" | "issued" | "superseded" | "void";
export type DocSpec = { meta: DocMeta; title: TitleBlockData; revisions: RevRow[]; sections: DocSection[]; colophon: ColophonData };
export type DocMeta = {
  docType: string;            // "PP", "BBS", "LB", "DR", "TBT", "PTW", "MR", "IR", …
  docTypeName: string;        // «خطة صب · Pour plan»
  docNo: string | null;       // null → «مسودة» watermark band
  rev: string; status: DocStatus; dateIso: string; lang: DocLang;   // lang = the issued copy's language, recorded on the ToolDoc
  issuer: string;             // the issuing party's name (PDF Author), never "EngSpace"
  issuerRole: "client" | "consultant" | "contractor" | "subcontractor";
  appVersion: string; profileLabel: string; engines: string[]; hash: string;
  qr?: string;                // Phase 4b onward, with doc_receipts; wave 1 prints the fingerprint only
};
export type DocSection = { orientation: "portrait" | "landscape"; blocks: DocBlock[] };   // a switch starts a new page
export type DocText = string | { spans: { t: string; dir?: "ltr" | "rtl" | "auto"; w?: 450 | 600 | 700 }[] };
export type DocBlock =
  | { k: "heading"; num?: string; text: string }                                   // always kept with the next block
  | { k: "kv"; cols: 2 | 3; rows: { label: string; value: DocText; wide?: boolean }[] }
  | { k: "kpis"; items: { label: string; value: string; unit?: string; mark?: "ok" | "fail" | "warn" }[] }   // ≤ 5 per row
  | { k: "table"; id: string; caption: string; cols: DocCol[]; rows: DocRow[]; carry?: { sumCols: string[] };
      totals?: DocRow; grid?: boolean; zebra?: boolean; minRowsBeforeBreak?: number }
  | { k: "checks"; rows: { label: string; value: string; limit: string; clause: string; ok: boolean | null; unverified?: boolean }[] }
  | { k: "notes"; title?: string; text: DocText }
  | { k: "sketch"; wMm: number; hMm: number; paths: VPath[]; caption?: string }    // shape codes, cut bars, profiles, grids
  | { k: "signatures"; parties: SignParty[]; stamp: boolean; statusBox?: "ABC" }
  | { k: "photos"; items: { ref: PhotoRef; caption: string }[]; grid: "2x3" | "2x2" }
  | { k: "disclaimer"; text: string }                                             // printed at 8/12 directly above the signatures
  | { k: "basis"; rows: { key: string; label: string; value: string; unit?: string; source: string; clause?: string;
      conf: "H" | "M" | "L"; flagged: boolean; override?: { value: string; reason: string } }[]; formulas: TraceStep[] }
  | { k: "pageBreak" };
export type DocCol = { key: string; label: string; unit?: string; wMm: number; align: "start" | "end" | "center";
  num?: { dp: number }; mark?: boolean; sketch?: boolean };
export type TitleBlockData = {
  parties: { role: "client" | "project" | "consultant" | "contractor" | "subcontractor"; name: string; nameEn?: string; logo?: LogoRef; issuer?: boolean }[];
  title: string; discipline: string; location: string; reference: string; scale?: string;   // docNo / rev / status / date come from meta
};
export type RevRow = { rev: string; dateIso: string; desc: string; prepared: string; checked: string; approved: string };
export type ColophonData = { generatedAt: string; appVersion: string; backend: string; profiles: string[];
  unverified: number; overridden: string[]; hash: string; disclaimer: string };
export type DocRow = { cells: Record<string, DocText | number | null>; kind?: "item" | "section" | "subtotal" | "total";
  mark?: "ok" | "fail" | "na"; sketch?: VPath[] };
export type SignParty = { role: string; name?: string; title?: string; syndicateNo?: string };
export type VPath = { d: string /* SVG path syntax, local mm */; fill?: boolean; dash?: number[]; label?: { x: number; y: number; t: string } };
export type Ink = "ink" | "ink80" | "ink60" | "rule" | "hair" | "fill" | "wash" | "accent" | "accentTint" | "white";

// src/doc/layout.ts — pure; coordinates are physical mm from the page's top-left
export interface Measurer { width(text: string, f: DocFont): number; ascent(f: DocFont): number; descent(f: DocFont): number }
export type DocFont = { w: 450 | 600 | 700; pt: number };
export type DrawOp =
  | { op: "text"; x: number; y: number; f: DocFont; ink: Ink; dir: "rtl" | "ltr"; text: string }
  | { op: "rule"; x1: number; y1: number; x2: number; y2: number; pt: number; ink: Ink }
  | { op: "rect"; x: number; y: number; w: number; h: number; fill?: Ink; stroke?: Ink; pt?: number }
  | { op: "image"; ref: PhotoRef | LogoRef; x: number; y: number; w: number; h: number }      // fitted, never cropped
  | { op: "path"; x: number; y: number; scale: number; d: VPath[]; ink: Ink; pt: number }
  | { op: "qr"; x: number; y: number; mm: number; data: string };
export type DrawPage = { n: number; of: number; orientation: "portrait" | "landscape"; ops: DrawOp[] };
export function docLayout(spec: DocSpec, m: Measurer, theme?: DocTheme): { pages: DrawPage[]; warnings: string[] };

// src/doc/render/index.ts
export interface DocBackend { id: "raster" | "vector"; begin(meta: DocMeta): Promise<void>; page(p: DrawPage): Promise<void>; end(): Promise<Blob>; abort(): void }
export async function renderDoc(spec: DocSpec, o?: { backend?: "raster" | "vector"; signal?: AbortSignal;
  onPage?: (n: number, of: number) => void }): Promise<{ status: "ok"; pdf: Blob; pages: number } | { status: "cancelled" } | { status: "failed"; error: string }>;
// renderDoc, deliverPdf, shareSummary and every public tool-store function resolve; they never reject (the smoke crawl fires every handler)
```
- **Reading direction.** Only the layout pass knows it. It places blocks through a `fromStart(offset, w)` helper, which generalises `X()` / `L()` in today's `report-pdf.ts`.
- **Errors.** Layout never throws on content. Overlong words break at grapheme boundaries. Column widths that exceed the text block are scaled down proportionally and reported in `warnings`; in development they throw.

**Page geometry.** A4 portrait is 210 × 297 mm; landscape is 297 × 210 mm.

| Item | Value |
|---|---|
| Margins | top 14, bottom 16, sides 18 mm |
| Text block, portrait | 174 × 267 mm |
| Text block, landscape | 261 × 180 mm |
| Grid | 12 columns of 10.83 mm with 4 mm gutters |
| Vertical unit | 3 pt (1.06 mm); spacing 6 / 9 / 12 / 18 / 24 pt |
| Body area, page 1 | from the bottom of the title block (or revision table) to y 281 |
| Body area, page 2 on | y 26 → 281 |

**Title block (خرطوشة), page 1, portrait.** It spans x 18 → 192 and y 14 → 78 (64 mm). Landscape uses the same rows across 261 mm. Every label is bilingual, 7.5 pt SemiBold ink-60, on a 3.5 mm `fill` band at the top of its cell, for example «المشروع · Project». Values are 9 pt Text ink. The outer frame is a 0.75 pt `rule`; inner cells use 0.35 pt `hair`.

| Row | y (mm) | Cells, from the reading start (width, mm) |
|---|---|---|
| Accent rule | 14.0–14.7 | full width, 2 pt, accent |
| A: parties | 14.7–40.0 | Four cells of 43.5 mm, chosen by the issuer. Default: المالك · Client · المشروع · Project · الاستشاري · Consultant · المقاول · Contractor. When the issuer is a subcontractor (the usual issuer of cable, AC and sprinkler documents): المالك · الاستشاري · المقاول الرئيسي · مقاول الباطن, and the project name moves to row B ahead of the title. Each cell holds a label band, a logo slot of 34 × 11 mm (contain), and the name at 9 pt in at most 2 lines. The issuing party's cell carries a 0.75 pt accent underline, and that party is the PDF Author. |
| B: title | 40–52 | عنوان المستند · Title 116 (13 pt Bold, at most 2 lines, otherwise 11 pt) · نوع المستند · Type 58 (code + name) |
| C: control | 52–65 | رقم المستند 40 · المراجعة 15 · الحالة 25 · تاريخ الإصدار 25 · التخصص 20 · الموقع / المنسوب 25 (150 mm in all) |
| D: basis | 65–78 | المرجع (drawing / spec) 50 · ملف الكود 50 · مقياس الرسم 20 · الصفحة x/y 30 (150 mm in all) |
| Fingerprint cell | 52–78, 24 mm wide at the end side | **Wave 1:** «بصمة المستند» at 7 pt and the first 16 hex of the hash in four groups (`7F3A 91C2 0B5E 44D1`), with the document number and revision. **From Phase 4b** (with `doc_receipts`): an 18 × 18 mm QR code (vector, error correction M, quiet zone ≥ 4 modules) and «امسح للتحقق» replace the label; the 16 hex stay under the code. |

- **Revision table.** It is printed only when a document has revisions. It sits at y 80 with a 5 mm header and shows the latest 4 rows of 5 mm, newest first; with more, a fifth line reads «و n مراجعات سابقة — انظر ملحق المراجعات», and the full history prints as a revision appendix. Nothing is dropped silently. Columns: Rev 12 · التاريخ 22 · وصف التعديل 80 · أعدّ 20 · راجع 20 · اعتمد 20.
- **Drafts.** A draft prints a 6 mm ink-60 band «مسودة — غير صادرة · Draft — not issued» under the title block, and has no fingerprint or QR code.
- **Running header (page 2 onward).** A 9 mm band (y 14–23) at 7.5 pt holds the short title, the document number with its revision, and the issuer. A 0.5 pt rule sits at y 23.
- **Footer (every page).**
  - A 0.35 pt rule at y 282 and the baseline at y 288.
  - **Start side:** the E+S mark from `brand-mark.json`, 3.5 mm high in ink-60, then «أُعدّ باستخدام EngSpace · Prepared with EngSpace» at 7 pt.
  - **Centre:** the document number and revision.
  - **End side:** «صفحة x من y».
  - This one line is the only EngSpace attribution. «منصة المهندسين الرسمية» is removed.
- **Colophon (last page, 7 pt ink-60, at most 6 lines; technical data only):**
  - generated at (ISO 8601 with the UTC offset); app version; backend; engine versions;
  - code profiles with their editions; «قيم غير متحقق منها ⚑: n» (the values themselves are listed in the basis block); values changed from the profile, by key;
  - `SHA-256 7F3A91C2…` (first 16 hex).
  - The discipline disclaimer is **not** here: it prints at 8/12 above the signature block, where it is read, not in fine print.

**Blocks.**

| Block | Specification |
|---|---|
| Key-value grid | 2 or 3 pairs per row. The label cell fits the longest label within 24–40 mm, on a `fill` background. Values wrap to at most 3 lines. Row height ≥ 7.4 mm; 0.35 pt hairlines. |
| KPI strip | Up to 5 boxes per row. Each shows the value at 14 pt Bold with its unit at 9 pt, and the label at 7.5 pt. A status is shown with a word and a drawn mark. |
| Paged table | **Header:** `fill` background, 8.5/12 SemiBold, units in the header only («الحجم (م³)»). **Body:** 9/13.5 Text, minimum row height 7.4 mm, padding 3 pt vertical and 2 mm horizontal. **Rules:** 1 pt ink at the top and bottom, 0.5 pt under the header, 0.35 pt between rows. Vertical hairlines only with `grid: true` (level book, BBS); zebra striping only above 6 numeric columns. **Numbers:** physically right-aligned in every language, fixed decimals per column, tabular figures, U+2212 minus. **Page breaks:** a row is never split unless it is taller than 40 % of the page. At least 3 rows go before a break. The header repeats on every page. A broken page ends with «يُتبع» and a **«يُرحّل · c/f»** row summing `carry.sumCols`. The next page repeats the caption with «(تابع)» and opens with **«ما قبله · b/f»** carrying the same sums. **Totals row:** 0.75 pt rule above, SemiBold, «الإجمالي · Total». |
| Checks | Columns: البند · القيمة · الحد · المرجع · النتيجة. The result is a word plus a drawn mark: «مطابق ✓»; a white-on-ink chip «غير مطابق ✗»; an outlined «مشروط»; ink-60 «لا ينطبق». Rows with `unverified` add «⚑ تحقق». |
| Notes / disclaimer | A boxed paragraph at 10/15 (disclaimer 8/12), ragged edge, never justified. |
| Sketch | Vector paths in a local mm box: the BBS mini-sketch (18 mm in a table cell), cutting bars (12 m = 225 mm, landscape), the drain profile, the sprinkler grid. |
| Signatures | Up to 3 boxes per row, each 56 × 28 mm with 3 mm gutters. A box holds the role at 7.5 pt SemiBold, the typed name at 9 pt, a blank signing area ≥ 12 mm, and «التاريخ: ……». The **stamp box** is 40 × 40 mm, at the end side of its own row, with the optional A / B / C status squares beside it. The whole block is kept together and moves to the next page as one piece. |
| Photos | 2 × 3 frames of 85 × 64 mm (or 2 × 2 of 85 × 100 mm), 4 mm gutters. Photos are fitted, never cropped. Captions at 8/12, at most 2 lines. The time stamp is already burned into the photo (§3.5). |

**Typography.**
- **Family:** IBM Plex Sans Arabic, IBM's own build `@ibm/plex-sans-arabic@1.1.0`, which puts Arabic and Latin in one file and adds the Text weight and the `zero` feature.
- **Weights:** Text 450, SemiBold 600 and Bold 700.
- **Subsetting:** `scripts/fonts/subset.py` (fontTools) produces subsets once: Basic Latin + Latin-1, Arabic, Arabic Supplement, general punctuation and `✓ № ≤ ≥ ≈ ≠ √ − ← → Ø`. They are committed in `src/doc/fonts/` with the OFL licence: woff2 at about 55 KB per weight (about 163 KB in all) for canvas, and TTF for the Phase-5 vector backend. The build never runs Python.
- **Loading:** fonts load at preview or export only, through `FontFace` with a sample text «ءA1Ø» (the glyph-preload fix already on the branch).

| Role | Size / leading, weight |
|---|---|
| Document title | 18/24 Bold, at most 2 lines |
| Section heading (H1) | 12/18 SemiBold, number in accent; 18 pt before, 6 pt after |
| Subheading (H2) | 10.5/15 SemiBold |
| Body | 10/15 Text, ragged edge |
| Table cell | 9/13.5 Text |
| Table header | 8.5/12 SemiBold |
| Field label | 7.5/10.5 SemiBold, ink-60 |
| Caption | 8/12 Text, ink-80 |
| Footer, colophon | 7/9 Text, ink-60 (the floor) |

- **Arabic sizes and leading.** Arabic is never below 9 pt in tables or 10 pt in body text. Line height is ≥ 1.4.
- **Colours:** ink `#111111`, ink-80 `#3A3A3A`, ink-60 `#5C5C5C` (the lightest allowed for text), rule `#8A8A8A`, hair `#BDBDBD`, fill `#EBEBEB`, wash `#F5F5F5`.
- **Accent:** `#3F33A0`, used only for the title-block rule, the issuer underline and section numbers, never for status.
- **Numbers:**
  - Latin digits everywhere in reports. Every number, unit, code, date and document number is an LTR span.
  - A no-break space separates number and unit (`250 mm`, `Ø16 @ 150 mm`). Minus is U+2212 and ranges use an en dash.
  - Thousands separators start at 10,000. Dates are ISO in tables and the title block, long form in prose («9 أكتوبر 2026»).

**Raster backend (wave 1).**
- **Canvas size:** 240 dpi, so 1984 × 2806 px portrait (5.6 MP, about 22 MB of pixels).
- **What is drawn:** text, rules, fills, sketches and the QR code, on white. Photo and logo frames are left empty.
- **Encoding.**
  1. `getImageData()`; the page canvas is released at once (`width = height = 0`).
  2. The pixel buffer is **transferred** to `encode.worker`, which maps every pixel to a 16-entry palette (the 7 neutral tokens, a 7-step ink ramp, accent and accent tint) and packs 4 bits per pixel with the PNG "Up" row filter.
  3. fflate deflates the result (level 6), giving `/ColorSpace [/Indexed /DeviceRGB 15 <…>] /BitsPerComponent 4 /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 4 /Columns 1984 >>`.
  4. If the worker or the palette path fails, the page is encoded as JPEG q0.92 (today's method) and the export log notes the fallback.
- **Photos and logos.** `createImageBitmap(blob, { resizeWidth, resizeHeight, resizeQuality: "high" })` decodes each at frame size × 240 dpi (an 85 mm frame is 803 px). Each is re-encoded as JPEG q0.85 when it is WebP, placed as a `/DCTDecode` XObject, then closed. Only one is in memory at a time.
- **Writer.** `src/doc/pdf-writer.ts` grows from `pdfFromJpegs`.
  - It streams objects into a `Uint8Array[]` and computes xref offsets from byte lengths.
  - Info: `/Title`, `/Author` (issuer), `/Subject` (doc type), `/Creator EngSpace <version>`, `/Producer EngSpace doc kit 1`, `/CreationDate`. Catalog: `/Lang (ar)` and `/ViewerPreferences << /Direction /R2L >>` for Arabic documents.
- **Budgets** (acceptance gates in Phase 1): ≤ 300 KB per dense text page; ≤ 1.2 s per page on the Pixel 7 profile at 4× CPU throttle, measured against a production build (§7, `E2E_PERF=1`); and at most 2 live **page canvases** during an export. `liveCanvases` counts only page-sized canvases created through `doc/render`, not the 1 × 1 text measurer.

**Preview.**
- `DocPreview` draws the same `DrawPage`s with the same drawing code onto canvases sized to the screen (viewport width × devicePixelRatio). Only the visible page and its neighbours exist; others are released. **Starting an export from the preview releases the off-screen neighbours** and keeps only the visible page, so preview plus export stays within 2 page canvases.
- In dark mode the preview draws white pages on a neutral surround; PDFs are always light.
- A tap toggles 2× zoom with panning; the transform is written directly. App zoom stays locked.
- «تصدير PDF» reuses the **same layout object**, so the preview and the PDF paginate identically.
- Page 1 appears in under 300 ms; layout of a whole 30-page document is pure arithmetic.

**Vector backend (Phase 5).**
- **Components:** `harfbuzzjs@1.6.3` (`hb.wasm`, 178 KB gzip) for shaping; `bidi-js` for the levels; `hb-subset.wasm` (269 KB gzip) for subsetting each document; `fflate` for streams.
- **Loading wasm:** `const buf = await (await fetch(url)).arrayBuffer(); await WebAssembly.instantiate(buf, imports)`, never `instantiateStreaming`, because the Capacitor local server and the OTA bundle path may serve `.wasm` without `application/wasm` (the repo already ships Tesseract as `.wasm.js` for this reason).
- **Fonts:** Type0 / CIDFontType2 Identity-H with ToUnicode CMaps, so Arabic copies out in logical order.
- **Measuring:** the vector measurer is harfbuzz itself, so its line breaks equal its drawing. LRI / PDI marks are stripped before shaping.
- **Shared code:** images use the raster backend's XObject code.
- **Gate to become the default:**
  1. pdf.js text extraction of every e2e PDF returns the Arabic title, the document number and the totals.
  2. Page counts equal the raster backend's on the fixture set.
  3. A rendered-page diff against raster stays within threshold.
  4. Export is no slower.
  5. A device smoke run on the preview APK and the IPA exports a fixture with the vector backend.

**Memory rules** (code review and e2e enforce them):
1. Export keeps at most one page canvas alive; preview keeps at most three, and drops to one when an export starts (the budget above).
2. Every canvas is released with `width = height = 0` right after use, and every `ImageBitmap` is `close()`d.
3. No base64 or binary strings in the export path. Bytes stay `Uint8Array`, and the PDF is one `Blob` built from chunks. **One exemption:** the native file write, because Capacitor Filesystem takes binary data only as base64 strings. It encodes each chunk on its own, with a chunk size that is a multiple of 3 bytes (3 × 174,762 = 524,286), so no `=` padding ever lands mid-file, and never concatenates the strings.
4. Photos are decoded at frame resolution, one at a time.
5. The export yields to the event loop between pages, so the progress bar «صفحة 3 من 12» and the cancel button stay live.
6. Cancel, or popping the screen, aborts through `AbortSignal`, releases everything and resolves `{ status: "cancelled" }`.
7. A development hook `window.__engspaceDoc` exposes `liveCanvases` and `peakPixels` for the e2e memory assertion.
8. If the WebView renderer dies, `MainActivity.onRenderProcessGone` rebuilds the screen. The document is safe because it was already in IndexedDB.

**Delivery** (`src/doc/deliver.ts`).
```ts
export type DeliverResult = { status: "shared" | "saved" | "cancelled" | "failed"; error?: string };
export async function deliverPdf(pdf: Blob, fileName: string, o: { title: string; text?: string }): Promise<DeliverResult>;
export async function shareSummary(text: string): Promise<DeliverResult>;      // the WhatsApp summary alone
export function docXlsx(spec: DocSpec, lang: DocLang): Uint8Array;               // src/doc/xlsx.ts
export function docCsv(table: DocBlock & { k: "table" }, lang: DocLang): string;
```
- **Native:** the plugins are destructured from the awaited modules (`const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")])`), and every plugin call runs under `withTimeout`. The file is written to `Directory.Cache/engspace-pdf/` with `Filesystem.writeFile` for the first 524,286-byte chunk and `appendFile` for the rest (rule 3), so no giant string is ever built. Then `Share.share({ files: [uri], title, text: summary })`.
- **Cancel is not an error.** "Share canceled" resolves `cancelled`, with no error toast.
- **Cache sweep:** files older than 24 h are deleted at app start.
- **Web (`!NATIVE`):** «تصدير PDF» uses `<a download>` first (Blob URL revoked after 60 s), so e2e's `waitForEvent("download")` still fires; «مشاركة» uses `navigator.canShare({ files })` → `navigator.share`.
- **File names** are ASCII, for example `NAC-YA-PP-0012-R00.pdf` (a draft is `DRAFT-PP-<date>.pdf`). The Arabic title goes in the metadata.
- **PDF + summary together.** Every tool that saves documents has a required `summary(doc, lang)` in the registry (a test enforces it). Format: line 1 is type · number · Rev · status; then at most 4 KPIs; then «تقدير — راجع المستند الكامل». Latin and number runs are wrapped in U+2066 / U+2069 (LRI / PDI) so «120 م³ C30» survives any chat app. «مشاركة» sends the PDF and the summary together (`Share.share({ files, text })`); because some targets drop the text, the sheet also offers «انسخ الملخص». A deep link is added only when `VITE_PUBLIC_URL` is set and the project allows it, so there is no app promotion by default. Summary builders are unit-tested in both languages.
- **«مشاركة كصورة».** One-page documents (permit, pour plan, toolbox talk) can be shared as a PNG of page 1, drawn from the raster page.
- **Excel and CSV** (`src/doc/xlsx.ts`, target ≤ 6 KB gzip in the doc-kit chunk). A minimal XLSX writer on fflate `zipSync` writes one sheet per DocSpec `table` block: numeric cells as numbers with a fixed number format per column, `<sheetView rightToLeft="1"/>` for Arabic, and bilingual header rows. CSV is UTF-8 with a BOM. «تصدير Excel» sits in the overflow menu. Tests: an xlsx round trip through a tiny unzip parser (cells typed as numbers, Arabic headers intact).
- **Log.** Every export appends `{ at, what: "export", backend, pages, bytes }` to the document's `log`.

**Issue, numbering, hash and QR.**
1. «إصدار» runs the tool's validators. Errors block the issue; warnings need one confirming tap.
2. **Numbering.**
   - Default (simple) scheme: `<code>-<orig>-<TYPE>-<NNNN>`, where `<orig>` is the originator, taken from the member's initials and editable in the project. Two engineers on the same real project therefore never both issue `NAC-DR-0001`.
   - The next number for each type is editable in the ProjectEditor, so a project already part-way through starts at its next paper number.
   - A manual number can be typed at issue (to match the consultant's document-control register); it is checked for uniqueness across the account.
   - A document without a project uses the code `GEN`, and «إصدار» offers quick-create first.
   - The ISO 19650 scheme `<code>-<originator>-<zone>-<level>-<TYPE>-<discipline>-<NNNN>` is a project option.
   - Revisions run `00`, `01`… (printed «Rev 00»); under ISO 19650 they are `P01` / `C01` with status codes S0–S4 and A1–A3.
   - Two phones issuing offline can still collide. The merge detects it and flags «رقم مكرر» on both; the user re-issues one as a new revision with a fresh number.
3. The project snapshot, the profile snapshot and `frozen` (outputs, checks, trace) are written, with `engine`.
4. `hash` = SHA-256 over the canonical JSON (sorted keys) of `{ kind, v, body, profile, project, docNo, rev, engine, frozen.outputs }`. `docHash()` uses `crypto.subtle.digest` when present, else `sha256hex` from `src/domain/identity.ts`, because `crypto.subtle` is undefined on plain HTTP (the owner's LAN phone preview, `scripts/phone-server.mjs`). A unit test checks both give the same hex on 3 fixtures. `tests/tools/frozen-reprint.test.ts` issues a BBS, patches `bbsCutLength`, reprints, and expects an identical DocSpec and hash.
5. **Fingerprint, then QR.** Wave 1 prints no QR: a code labelled «امسح للتحقق» that can only verify on the issuer's own phone would fail the consultant who scans it, and would read as advertising to a non-member. The title block prints «بصمة المستند» (16 hex) instead.
   - **Phase 4b** adds the `doc_receipts` table ({ id, hash, issued_at } and nothing else; lookup only through a rate-limited security-definer function; pgTAP pins both) and the QR (`qrcode-generator`, MIT, about 12 KB gzip): `https://<VITE_PUBLIC_URL>/#app/v/<docId>` when the public URL is set, otherwise `app.engspace://open/v/<docId>`. It carries no names or personal data.
   - The verify page works signed out and shows only the number, revision, issue date and «مطابق / غير مطابق».
   - `src/lib/share.ts` gains `OPENABLE = [...SHAREABLE, "v"]`, and `parseOpenLink` checks `OPENABLE`, so a scanned `app.engspace://open/v/<id>` reaches `takePendingOpen` in the phone apps (`linkFor` keeps the `Shareable` type). `tests/share.test.ts` pins `open/v/dABCDEFGHIJKLMNOPQRST` → `{ type: "v" }` and `open/admin/1` → null.

### 5b. Projects: one profile for every title block

```ts
// src/data/tool-projects.ts — member_state key "toolProjects"
export type ToolParty = { name: string; nameEn?: string; rep?: string; logo?: LogoRef };
export type LogoRef = { id: string; path?: string /* private bucket, own folder */; local?: string /* IndexedDB blob key */; w: number; h: number };
export type ToolProject = {
  id: string; at: number; deleted?: true; archived?: boolean;
  code: string;                         // 2–8 chars [A-Z0-9], used in document numbers
  name: string; nameEn?: string;
  client: ToolParty; consultant: ToolParty; contractor: ToolParty; subcontractor?: ToolParty;
  issuerRole: "contractor" | "consultant" | "client" | "subcontractor";   // whose cell is underlined, whose name is the PDF Author
  location: { governorate?: string; city?: string; site: string; plot?: string };
  contractNo?: string; discipline?: string;
  signatories: { role: SignRole; name: string; title?: string; syndicateNo?: string }[];
  numbering: { scheme: "simple" | "iso19650"; originator: string /* member's initials, editable */; counters: Record<string, number> /* next number per type, editable */ };
  profiles: Record<string, string>;     // family → default profile id, e.g. { concrete: "ecp203-site@1", fire: "nfpa13-2022@1" }
  overrides: { key: string; value: number | string; reason: string; at: number }[];   // project-level constant overrides
  crewId?: string; remnantStoreId?: string;
};
export type ProjectSnap = Pick<ToolProject, "code" | "name" | "nameEn" | "client" | "consultant" | "contractor"
  | "subcontractor" | "issuerRole" | "location" | "contractNo" | "signatories"> & { at: number };   // frozen into a document at issue
```
- **No money field, by design.** Contract sums, rates and regimes live only in money-tool documents, so supervisors can create and edit projects freely.
- **Quick create.** A project needs only a name. The code is suggested from the Latin name or as `P01`, and everything else can be added later.
- **Project chip.** The chip in every tool hero switches the active project. The choice is **per device** (`toolDevice.activeProject`, §5c), so switching on one phone never changes another phone's default project, title block or numbering. The new-document screen always shows the chip with its code.
- **Moving and archiving.** A draft has «نقل لمشروع آخر», which renumbers nothing because drafts have no number yet. A project that still has documents can only be archived, never deleted.
- **Logos.**
  - At most 4 per project (one per title-block party cell), compressed on the phone to ≤ 512 px on the longest side.
  - Uploaded through `upload-media` with kind `inspection` (private bucket, own folder), so no new bucket is needed. They count toward the member's media limits (below).
  - Cached as Blobs in IndexedDB, so an offline export still prints them.
- **Media limits.** `media_register` (20261017000025_media_privacy.sql:60-69) allows 30 uploads per 10 minutes, 300 per day and **100 MB in all** per member, across every kind. Diary, QA/QC, permit and logo photos (about 200 KB each) would fill that within months, and an offline backlog of more than 30 photos would hit 54000 on reconnect.
  - The photo upload queue sends at most 25 uploads per rolling 10 minutes. On 54000 «media rate limited» it waits until the window clears instead of retrying on the 5 s / 30 s / 2 min ladder; on «media quota» it stops and shows «مساحة الصور ممتلئة».
  - The wave-1 migration adds `my_media_usage()` (security definer, `set search_path = ''`, `grant execute … to authenticated`, pgTAP 18 compliant), and Tools → «التخزين» shows used / limit.
  - The same migration raises the total for kind `inspection` to 500 MB; the 30 / 10 min and 300 / day rates stay.
- **Signatories** pre-fill the typed names in signature boxes. Nothing is ever signed digitally.
- **Snapshot on issue.** Issuing a document copies the project snapshot into it. Editing the project later never changes an issued PDF.
- **Caps:** 30 live projects. Tombstones are kept 45 days.
- **Today strip across projects.** Inspectors cover several sites, so the Today strip groups items by project with a filter chip, instead of showing only the active project.
- **Demo mode:** a fictional project «برج الواحة السكني — القاهرة الجديدة» with fictional parties and no real logos, so demo PDFs look complete without imitating any real firm.

### 5c. Tool document store

**The envelope.**
```ts
// src/data/tool-docs.ts (pure: types, merge, caps, fit, shard choice)
export type ToolKind = string;          // the tool id, or a sub-kind: "inspection" | "qcTemplate" | "crew" | "rebarStock" | "materialRequest"
export type ProfileSnap = { id: string; edition: string; values: Record<string, number | string>;
  overridden: string[]; unverified: string[] };                     // every constant the engines read, frozen
export type PhotoRef = { id: string; path?: string; local?: string; w: number; h: number; caption?: string; at: number };
export type ToolDoc<B = unknown> = {
  id: string;                           // "d" + 20 random base-32 characters
  kind: ToolKind; v: number;            // body schema version for that kind
  lang: "ar" | "en";                    // the language it is (or will be) issued in; summaries follow it
  engine: string;                       // "bbs@1.0.0" — the engine that computed the outputs
  frozen?: { outputs: unknown; checks: Check[]; trace: TraceStep[] };   // written at «إصدار»; reprints read it, never recompute
  signatories?: SignParty[];            // overrides the project defaults for this document
  at: number; createdAt: number;        // device time + measured server offset
  projectId: string | null; project?: ProjectSnap;     // the snapshot exists once issued
  title: string; dateIso: string;       // the document's working date (pour day, diary day…)
  docNo: string | null; rev: string; status: "draft" | "issued" | "superseded" | "void";
  issuedAt?: number; revOf?: string; supersededBy?: string; until?: string;   // until: permit expiry, for the Today strip
  profile: ProfileSnap; body: B;
  photos: Record<string, PhotoRef[]>;   // keyed by the line / unit / section they belong to
  hash?: string;
  log: { at: number; what: string; note?: string }[];                       // rolling, ≤ 50 (exports, opens)
  audit: { at: number; what: "issue" | "revision" | "conflict" | "edit" | "void"; path?: string; from?: string; to?: string; reason?: string }[];
                                        // never truncated; above 500 entries the tool asks for a new revision
};
export type ToolTomb = { id: string; kind: ToolKind; deleted: true; at: number };
export type ToolHeader = Pick<ToolDoc, "id" | "kind" | "projectId" | "title" | "dateIso" | "docNo" | "rev" | "status" | "at" | "until">
  & { shard: string; bytes: number; deleted?: true };
```
- **Local-only sync state** lives in its own IndexedDB store and is never uploaded: `{ id, base: number /* server at when editing began */, dirty: boolean, verify: boolean, at: number, bytes: number }`. `at`, `bytes` and the sync state stay here, out of the AppView store (see Write path).
- `src/data/tool-docs.ts` (commit d5aa97d) gains `lang`, `engine`, `frozen`, `signatories` and `audit` **before any tool is built on it**.

**Where the data lives.**
- **On the device: the primary copy.**
  - IndexedDB database `engspace-tools-v1-<pid>` (in demo mode `engspace-tools-v1-demo-<role>`, one per demo persona, so a demo engineer's money documents never appear for the demo supervisor), through a 60-line promise wrapper in `src/lib/tool-store.ts`, with no new dependency.
  - Object stores: `docs` (id → ToolDoc | ToolTomb), `meta` (headers, sync state, shard map, migrations), `blobs` (photos and logos not yet uploaded, the logo cache, demo photos) and `outbox`. **All four are created at version 1 and the version is never bumped**: an over-the-air rollback to an older bundle would otherwise fail `open(name, 1)` with VersionError and hide every document. Record shapes evolve through `meta.migrations`. `open()` calls `indexedDB.open(name)` without a version, creates stores only in `onupgradeneeded`, and treats VersionError as «open the existing version»; a fake-indexeddb test pins it.
  - The app calls `navigator.storage.persist?.()` once (guarded; WebViews do not guarantee it).
  - **Write-ahead journal (native).** WebKit can purge website data under storage pressure, so every dirty document and every photo not yet uploaded is also written to Filesystem `Directory.Data/tools-journal/` and replayed at boot when IndexedDB lacks it. Entries are removed once synced. A test wipes IndexedDB and replays the journal.
  - If IndexedDB is unavailable (a private window or a blocked origin), the store runs in memory and shows a fixed banner «الحفظ على الجهاز غير متاح — صدّر PDF قبل الإغلاق». Nothing is ever lost silently.
- **On the server: member_state, sharded.** Keys are letters only, at most 40 per member and 1 MB per value.

| Key(s) | Content | Count |
|---|---|---|
| existing: `saved` `follows` `roomFollows` `hidden` `salaryLog` | unchanged | 5 |
| `inspections` `qcTemplates` | read once for migration (§3.13), deleted two releases later | 2 → 0 |
| `toolProjects` | projects (§5b) | 1 |
| `toolPrefs` | synced across the member's phones: calibrations (bucket, barrow), acknowledged disclaimers, default profiles, number formats | 1 |
| `toolIndex` | `{ v: 1, items: Record<id, ToolHeader \| tombstone header> }`, about 250 B per document | 1 |
| `toolShelfA` … `toolShelfX` | `{ v: 1, docs: Record<id, ToolDoc \| ToolTomb> }`, target 700 KB, hard guard 900 KB | 24 |
| **Total** | 34 during migration, then 32; 6–8 keys stay free | |

**Per device, never synced** (`storeDevice("toolDevice", pid, …)` in `src/lib/device-store.ts`): the active project, field / sun / simple mode, the digit style, collapsed packs, «الأخيرة», `lastOpen`, and the migration flags. These would overwrite each other between phones and spend server writes if they lived in `toolPrefs`. `toolDevice` is not in `PANE_KEYS`; the tab reads it through its own `useState`.

**Shards.**
- A document is assigned to the first shard with room when it first syncs. The assignment is recorded in its header and stays stable.
- A document that outgrows its shard moves to another one. Merge treats a document found in two shards as one, newest `at` wins, and the old shard drops it on its next write.
- 24 shards × 700 KB give about **16.8 MB per member** of document bodies. Photos are separate Storage objects.

**Caps and size guards** (enforced in `tool-docs.ts`; above a cap, saving is refused with a reason, never sliced silently).

| Kind | Live documents | Body limit |
|---|---|---|
| `siteDiary`, `toolboxTalk`, `workPermit` | 450 each | 64 KB |
| `concrete` (pour plans), `materialRequest` | 300 each | 96 KB |
| `bbs`, `levelBook`, `cableCheck` | 150 each | 192 KB |
| `acInstall`, `drainRun`, `sprinklerCheck` | 100 each | 96 KB |
| `inspection` | 300 | 64 KB |
| `qcTemplate` | 60 | 32 KB |
| `crew`, `rebarStock` | one per project | 96 KB |
| **All kinds together** | 2,000 live documents; tombstones are not counted | index ≤ 900 KB |

- **Measuring size.** The server checks `octet_length(value::text) <= 1048576` (20261016000024_security_armor.sql:173), and jsonb's text form puts a space after every `:` and `,`, so a numeric-heavy shard (level book, BBS rows) measures 10–25 % more on the server than its `JSON.stringify` size. `jsonbBytes(v)` therefore measures the server form: UTF-8 byte length of `JSON.stringify(v)` plus one byte for every `:` and `,` outside strings. The 700 KB target, the 900 KB guard, the body limits and the index guard all use it. Tests: `jsonbBytes ≥ Blob size` on fixtures, and a cloud test that upserts a guard-maximum dense shard and succeeds. Text fields carry their own caps (600 characters for diary text, 300 for an item, 2,000 for notes).
- **Over the body limit,** the tool explains what to do: «قسّم الجدول — جدول جديد يحمل الرقم التالي».
- **Storage meter.** Tools → «التخزين» shows two meters: document bodies (used / 16.8 MB, per-kind breakdown) and photos (used / limit from `my_media_usage()`, §5b), plus the date of the last backup.
  - At 80 % it offers **«أرشفة على الجهاز»**: issued documents older than 180 days leave the cloud shards but stay in IndexedDB. Their header is flagged `archived: "device"` and a JSON backup is offered first.
  - The `tool_docs` table of Phase 4b removes this ceiling.

**Merge** (`toolMerge(local, remote)`, pure and exhaustively unit-tested).
1. A tombstone wins over any copy with an older `at`. A copy newer than the tombstone wins: an edit after a delete on another phone is kept, and the member is told.
2. If only one side changed since `base`, the newer `at` wins.
3. If **both** sides changed since `base`, the remote copy keeps the id. The local copy becomes a **conflict copy** with a new id, the title suffix «(نسخة متعارضة · <date>)» and a log entry. Nothing is overwritten.
4. Issued documents are frozen, so for them only status changes can conflict. If two phones issued the same draft, both versions survive as above, and the «رقم مكرر» check applies.
5. Unknown fields are preserved, so an older bundle never strips a newer bundle's data. A document with `v` above the bundle's known version opens read-only: «هذا المستند من إصدار أحدث — حدّث التطبيق».

**Write path** (offline-first; every step can fail without losing data).
1. An edit is written to IndexedDB (body writes debounced by about 300 ms, flushed on pop), and the sync state becomes `dirty`. The header in the AppView store (`toolIndex`) is replaced **only when a field the tab shows changes**: title, status, docNo, rev, dateIso, until, deleted, projectId. A body-only edit leaves `store.get("toolIndex")` referentially unchanged, so the Tools tab under the editor (still mounted, `covered`) never re-renders per keystroke; a unit test pins this.
2. Server writes are paced:
   - each shard key is debounced by 1.5 s, with at most one flush per key every 20 s while a tool screen is open, and an immediate flush on pop, `visibilitychange` → hidden and `pagehide`;
   - `toolIndex` is written only when a shown header field changes, at most once every 30 s;
   - a client token bucket mirrors the server budget with a margin: ≤ 120 tool-key writes per 10 minutes and ≤ 1,500 per day. When it is empty, writes wait and the chip says «بانتظار المزامنة»; nothing is dropped.
   - A scripted test runs an 8-hour level-book session (400 readings) plus a diary: ≤ 1,500 writes in the day and never more than 120 in any 10 minutes.
   - Sync runs only when `CLOUD && hydrated`.
3. Sync reads the shard row (one `select` by key), merges, applies the size guard and upserts.
4. On success the included documents get `base = at`, `dirty = false`, `verify = true`.
5. The next hydrate clears `verify` only if the server shard really contains that `at`. If it does not (a lost race with another phone), the document is queued again. This closes the whole-value last-writer-wins hole.
6. Failures retry after 5 s, 30 s and 2 min, then on the next foreground or online event. There is one quiet status chip in the Tools tab: «محفوظ على الجهاز · لم يُرفع بعد» / «تمت المزامنة 07:42». There are no repeated toasts.
7. **Photos** upload through `upload-media` (kind `inspection`, private) when online. Until then the `PhotoRef` carries `local`. The PDF reads `local` first, then a signed URL.

**Hydrate** (sign-in, return to the foreground, pull-to-refresh).
- `cloud.loadAll` (cloud.ts:200 today selects every member_state row) excludes the tool keys: `.select("key,value").not("key", "like", "tool%")`. Otherwise every hydrate (sign-in, every return to the foreground, every pull-to-refresh) would download all 24 shards, up to about 21 MB, and a large shard could stall the feed.
- Tool data loads **after** `loadAll`, in its own try/catch, so a tool failure never fails the feed hydrate:
  1. `cloud.toolStateStamps()` → `select("key,updated_at").like("key", "tool%")`;
  2. `cloud.toolStateRows(keys)` → `select("key,value,updated_at").in("key", keys)`, for `toolIndex`, `toolProjects`, `toolPrefs` and only the shards whose `updated_at` is newer than `meta.lastSeen[key]` in IndexedDB.
- The rows are merged into IndexedDB. Then **every local-only or dirty document is pushed explicitly**, which fixes today's gap where merged lists were not written back after a hydrate.

**Role filter.** Every store query (headers, search, the Today strip, the storage meter's per-kind labels, the JSON / zip backup, the verify screen) goes through `toolKindsForRole(roleKey(profile))` (§5e). Roles can change once every 30 days, so an engineer who becomes a supervisor keeps any IPC or VO documents stored but hidden, with the line «مستندات مالية مخفية لهذا النوع من الحسابات». An e2e test creates an IPC draft as an engineer, switches the role to supervisor, and finds no trace of it in any surface or in the backup file.

**Delete.** Every delete asks first (`ConfirmDialog`).
1. The tombstone is written at once.
2. A 6 s undo toast follows.
3. Only after the window closes **and** the tombstone has synced are the document's photos removed from Storage (`cloud.removeMedia`).
4. Tombstones are pruned after 45 days.

**Account deletion wipes the device too.** Today `deleteAccount` (AppView.tsx:497) only resets the in-memory store. `toolStore.destroy(pid)` closes the database, runs `indexedDB.deleteDatabase("engspace-tools-v1-" + pid)`, then imports Filesystem and removes `Cache/engspace-pdf/` and `Data/tools-journal/` (`rmdir`, recursive), each step in try/catch under `withTimeout`. It runs in both branches of `deleteAccount` and from the sign-out sheet's «احذف بيانات الأدوات من هذا الجهاز». A unit test covers it with the in-memory adapter.

**Demo mode.** Same store and same code paths, with no server adapter. Photos are Blobs in IndexedDB, not data URLs in localStorage, which ends the quota failures that were silently swallowed.

**Server changes in wave 1.** One migration:
- `create trigger member_state_b_rate before insert on public.member_state for each row execute function private.limit_writes('state', '600', '10 minutes', '8000')`. **Before insert only:** a PostgREST upsert (`INSERT … ON CONFLICT DO UPDATE`) fires the BEFORE INSERT and then the BEFORE UPDATE row triggers, and `rate_limit()` logs an event per call, so an insert-or-update trigger would count every upsert twice. A BEFORE INSERT trigger fires once per upsert. The existing keys (saved, follows…) share the bucket, which is why the budget is higher than the tools alone need.
- A plain `PATCH` (UPDATE without insert) would bypass that trigger, so a separate `before update` trigger calls the same limit unless the row was already counted by the insert trigger in the same statement (a transaction-local flag set with `set_config(…, true)`).
- `my_media_usage()` and the `inspection` media total (§5b).
- pgTAP: 100 consecutive upserts of one key pass; the 601st insert in 10 minutes fails with 54000; the 40-key trigger still holds; grants per pgTAP 18. A cloud test runs a simulated 10-minute level-book session under the limit.

**Phase 4b: the `tool_docs` table.** It arrives with the IPC, which needs history, capacity and later sharing between consultant and contractor. The migration deploys before the bundle that uses it, and the app tolerates its absence (it stays on shards).
- **Table:** `tool_docs(account_id, id, kind, header jsonb, body jsonb ≤ 256 KB, at, deleted)`, primary key `(account_id, id)`.
- **Access:** RLS «own», a `limit_writes` trigger, writes only through `save_tool_doc(id, kind, header, body, base_at)`. That function returns `conflict` instead of overwriting, so the merge moves to the server. pgTAP 18 covers the grants.
- **Switch-over:** the store's server adapter changes. A one-time SQL function copies each member's shards into rows. The copy is verified per member (document count and per-document hash parity) before any shard is touched, and the shard keys stay for 2 releases (read-only) so an older bundle loses nothing; only then are they deleted.
- **Account deletion** removes `tool_docs` and `doc_receipts` rows with the account (cloud test).

### 5d. UI kit additions (`src/ui/kit/`)

All of these components are multi-line, memoised, and use the tokens and performance rules in CLAUDE.md.

**Field, sun and dark.**
- **Field mode** (`html[data-field]`, per device in `toolDevice`) raises targets from 48 px to **56 px**; result values are ≥ 20 px and labels ≥ 14 px.
- **Sun mode** (`html[data-sun]`, per device) has a **one-tap toggle in every `ToolHero`**. It forces the light theme on tool screens (dark UIs wash out in direct sun), swaps ink-3 / ink-4 for ink-2, thickens borders to `line-3`, raises weights by one step and turns off decorative tints. Load-bearing text reaches **≥ 7:1 contrast** in sun mode; a unit test computes the contrast of every text token pair.
- **Dark mode** (the app's zinc-950 theme): pictograms and BBS sketches draw with `currentColor` tokens; cutting-plan strips use a palette defined for both themes plus mark labels and hatching, so colour is never the only cue; `DocPreview` shows white pages on a neutral surround. Sun mode overrides dark. Smoke-render has dark-mode setups for ToolsTab, ToolDocScreen, DocPreview and the trade-kit simple mode.
- **Keyboard.** The sticky check bar and the `.foot` bar stay above the on-screen keyboard through `visualViewport` (resize / scroll listeners write a CSS variable, never React state); an e2e test on the iPhone 15 profile pins it.
- **Digits.** A per-device preference shows Arabic-Indic digits (٠١٢) in simple-mode results and `ResultCard` only, for workers who read them more easily. Inputs accept both, and PDFs stay Latin, because Plex's Arabic-Indic digits are not tabular.

**Test-harness constraints** (the smoke crawl fires every onClick / onChange / onSubmit with a fake event):
- Every handler that starts a promise ends in `.catch((e) => app.toast(…))`, and the kit's async helpers resolve `{ status: "failed" }` instead of rejecting, so no unhandled rejection fails the Vitest run.
- Kit hooks stay within the stub React set (`useState`, `useEffect`, `useLayoutEffect`, `useRef`, `useMemo`, `useCallback`, `useContext`, `useSyncExternalStore`, `useId`, `forwardRef`, `memo`, `lazy`, `Suspense`). A component that needs `useReducer`, `useTransition`, `useDeferredValue`, `useImperativeHandle` or `useInsertionEffect` adds it to `tests/stubs/react.ts` in the same commit.
- Screen components are named functions inside `memo` (`export const ToolHome = memo(function ToolHome(p) { … })`), so the smoke `reaches` names match; lazy maps use `.then((m) => ({ default: m.X }))`, never `export default`.
- `navigator.storage?.persist?.()`, `indexedDB`, `FontFace` and `document.fonts` are touched only inside functions, never at module top level.

```ts
// NumField — type="text" inputMode="decimal" dir="ltr"; built on numInputNormalize / numInputParse / numInputProblem
export type NumFieldProps = {
  label: string; raw: string; onChange: (raw: string, value: number | null) => void;
  unit: string;                         // required: no default (today's Field defaults to «ج.م»)
  rule?: NumInputRule;                  // min, max, integer, allowNegative
  hint?: string; placeholder?: string; defaultChip?: boolean;            // shows «افتراضي» while the value is the profile default
  size?: "md" | "field"; enterKeyHint?: "next" | "done"; onEnter?: () => void; dataHook?: string;
};
// UnitField — NumField + unit switcher (m / cm / mm, m² / cm², L / m³ …); stores SI, converts only the shown text
export type UnitFieldProps = Omit<NumFieldProps, "unit" | "raw" | "onChange"> & { si: number | null; dim: "len" | "area" | "vol" | "mass";
  units: string[]; onChange: (si: number | null) => void };
// KitStepper — − value + ; long-press repeats at 8 Hz; a haptic tick through @capacitor/haptics (already in line 2)
// (named KitStepper because features/admin/kit.tsx already exports Stepper and the harness merges every export)
export type StepperProps = { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; unitWord?: string; picto?: string };
// RowEditor — windowed editable grid (ui/windowed.tsx), rows memoised by id + row version
export type RowCol<T> = { key: keyof T & string; label: string; kind: "num" | "text" | "chip" | "computed"; wPx: number;
  rule?: NumInputRule; unit?: string; options?: string[]; compute?: (row: T) => string };
export type RowEditorProps<T extends { id: string }> = { rows: T[]; cols: RowCol<T>[]; onRows: (rows: T[]) => void;
  newRow: () => T; totals?: (rows: T[]) => Record<string, string>; rowErrors?: (row: T) => string[];
  mode?: "cards" | "grid"; cursorWalk?: boolean; extraActions?: (row: T) => ReactNode; max: number };
// ResultCard — hero + pictograms + rows + «طريقة الحساب»
export type ResultCardProps = { hero: { value: string; unitWord: string }; exact?: string; picto?: { icon: string; n: number };
  rows?: { label: string; value: string; unit?: string; tone?: "good" | "warn" | "bad" }[];
  working?: { formula: string; inputs: [string, string][]; clause?: string; profile: string; conf: "H" | "M" | "L" }[];
  defaults?: string[] };
// src/ui/confirm.tsx (main chunk, not ui/kit: ui/feed.tsx and other main-chunk screens use it)
export function ConfirmDialog(p: { title: string; body: string; confirm: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }): JSX.Element;
export function DocList(p: { kind: ToolKind; projectId?: string; onOpen: (id: string) => void; onNew: () => void }): JSX.Element;
export function ExportBar(p: { onPreview: () => void; onExport: () => void; onShare: () => void; onSummary?: () => void;
  busy?: { page: number; of: number; cancel: () => void }; blocked?: string }): JSX.Element;
```
- **NumField.**
  - Accepts Arabic-Indic and Persian digits, «٫» or «,» as the decimal mark, and U+2212 or «-»; the raw text is kept as typed.
  - A visible **«±»** key appears when `allowNegative`, because the iOS decimal pad has no minus.
  - Select-on-focus; `aria-invalid` with a `FieldError` (`role="alert"`); `enterKeyHint` chaining.
  - An empty field gives `null`, and results show «—», never 0.
- **RowEditor.**
  - **Card mode** (the default everywhere, including BBS lines and level-book readings): one card per row, collapsible to a one-line summary, which fits a 360 px phone.
  - **Grid mode** (review and landscape): dense numeric rows; with `cursorWalk`, Enter moves to the next cell and the keypad stays up.
  - **«لصق من Excel»** parses tab-separated text from the clipboard through `numInputParse` into new rows, with a preview that marks cells it could not read.
  - Actions: add, duplicate, delete with undo, and reorder with ↑ ↓ buttons. There is no drag and no swipe.
  - The totals footer sits above the `.foot` bar. Row error badges link to the field.
  - Only the edited row re-renders.
- **ResultCard.**
  - The hero number is a 32 px `Num` with its unit word.
  - Up to 12 pictograms (bags, buckets, tiles, trucks); above 12 it shows «×N».
  - Every default used carries an «افتراضي» chip. «طريقة الحساب» lists the formula, inputs with units, clause, profile and confidence. [L] items carry «⚑ تحقق».
- **ConfirmDialog** (`src/ui/confirm.tsx`, main chunk) replaces the three inline copies, including `ui/feed.tsx:106`.
- **The toast action.** `app.toast` is today the bare setter `setMsg` (AppView.tsx:385), called with a string at about 60 sites. So a new store key `toastAction` (`{ label, run, until }`, not in `PANE_KEYS`) carries the button: `app.toast = (m, o) => { setMsg(m); setToastAction(o && o.action ? { ...o.action, until: Date.now() + 6000 } : null); }`. The toast renders the button while `until` is in the future and clears it on tap or on the next `setMsg`. Existing string calls are unchanged.
- **DocList.**
  - Windowed, filtered by project and status.
  - Each row shows the title, number / revision, a status chip (مسودة / صادر / مستبدل / ملغى), the date and a sync dot.
  - A «⋯» menu offers فتح · نسخ كمسودة · مراجعة جديدة · حذف.
- **ExportBar** is the sticky `.foot`: «معاينة» · «تصدير PDF» · «مشاركة», plus «ملخص واتساب» where a tool defines one. While exporting it shows page progress and «إلغاء». When issuing is blocked it shows the reason instead of a dead button.
- **Smaller pieces:**
  - `Section` (collapsible, count and error badges; replaces bare `<details>`);
  - `DateField` / `TimeField` (native inputs, ISO values);
  - `ProjectChip`;
  - `PhotoStrip` (uses `useImagePicker`, adds the stamp of §3.5);
  - `Picto` (own SVG drawings of ISO 7010-style PPE and hazard signs, plus trade pictograms, drawn in `currentColor`);
  - `ToolHero` (name, project chip, sun toggle, «طريقة الحساب»);
  - `DocHeader` and the autosave chip (§3.0);
  - `Disclaimer` (the first-use banner, acknowledged once per tool per account in `toolPrefs.ack`).
- **Shared helpers.** `FormField` / `FieldError` move from `auth.tsx` into `ui/`, and `f1` / `Note` / `Rows` move from `site-tools.tsx` into `ui/kit/`.

### 5e. Navigation and role gating

**The registry** (`src/tools/registry.ts`) is pure data with **no imports at all** (no React, no lucide, no `import.meta`), so taxonomy can import it without a cycle and Playwright's own TypeScript loader can import it to generate e2e tests. A test pins that the file has no `import` lines.
```ts
export type ToolPack = "structural" | "rebar" | "survey" | "quantities" | "office" | "contracts" | "mechanical" | "electrical"
  | "architecture" | "hse" | "workforce" | "money";   // office = «المكتب الفني» (no money); contracts = «العقود والمستخلصات» 💲; money = «الراتب والعروض» 💲
export type Role = "engineer" | "owner" | "supervisor" | "hr";
export type ToolDef = {
  id: string; pack: ToolPack; name: string; desc: string; icon: string; keywords: string;   // Arabic + English search words, old names included
  roles: Role[];                 // explicit allow-list; "hr" appears only on cvreview
  money: boolean;                // true ⇒ never "supervisor" (a test enforces it)
  surface: "screen" | "sheet";   // the salary tools stay sheets; everything new is a pushed screen
  wave: 1 | 2 | 3; status: "live" | "beta" | "soon";
  quick?: boolean;               // has a «حساب سريع» with numeric inputs (the generated e2e asserts a result)
  docKinds?: string[]; aliases?: string[];   // rebar → bbs, masonry → tradeKit (mode masonry)
  disciplines?: string[];        // floats the pack up for members of that discipline
};
export const TOOL_REGISTRY: readonly ToolDef[];
export const toolById: (id: string) => ToolDef | undefined;          // resolves aliases
export const toolsForRole: (role: Role) => ToolDef[];
```
- **Icons** are names in the registry and are mapped in `src/features/tools/tab/icons.ts`, which imports each lucide icon by name (`import { Cylinder, Spline, … } from "lucide-react"; export const TOOL_ICONS: Record<string, LucideIcon> = { Cylinder, Spline, … }`). The vitest lucide stub only stubs names it finds in `import { … } from "lucide-react"`, and a dynamic `icons[name]` lookup would pull the whole icon set into the main chunk. A unit test checks that every registry `icon` is a key of `TOOL_ICONS`, and a source pin forbids `import { icons }` and `import * as` from lucide-react. Home uses the same map.
- **Summaries.** Each tool module that saves documents registers `summary(doc, lang)` with `ToolHost`; a test walks the registry's `docKinds` and fails on a missing one.

**The gate** (`src/tools/gate.ts`) replaces the deny-list hole.
```ts
// a null profile, a legacy role ("surveyor") or a company account without a tools role is treated as an engineer, as blockedFor does today
export const roleKey = (p?: { role?: string } | null): Role =>
  p && ["supervisor", "hr", "owner"].includes(p.role as string) ? (p.role as Role) : "engineer";
export const toolAllowed = (role: Role, id: string) => {
  const t = toolById(id);
  return !!t && t.roles.includes(role) && !(t.money && role === "supervisor");
};
export const toolOfStack = (e: { type: string; id?: string }): string | null =>
  e.type === "tool" ? e.id ?? null
  : e.type === "tooldoc" ? (e.id ?? "").split(":")[0]
  : ["checklists", "inspection", "qcbuilder"].includes(e.type) ? "checklists"
  : e.type === "cvreview" ? "cvreview"
  : e.type === "toolprojects" ? "_projects"      // pseudo-tools: roles E O S
  : e.type === "toolstorage" ? "_storage"        // roles E O S
  : e.type === "v" ? "_verify"                   // every role, read-only
  : null;
export const stackAllowed = (role: Role, blocked: Blocks, e: StackEntry) => {
  const t = toolOfStack(e);
  if (t) return toolAllowed(role, t);
  // the room clause stays: supervisors must never reach the negotiation room «nego»
  return !blocked.stack.includes(e.type) && !(e.type === "room" && blocked.rooms.includes(e.id));
};
export const toolKindsForRole = (role: Role): Set<string>;   // document kinds whose tool the role may open; the store filters every query by it
```
- **One gate, six call sites.** `push`, the render switch, `AppHeader`, `openSheet("tool")`, the sheet's `toolMeta` lookup (AppView.tsx:536) and `takePendingOpen` (AppView.tsx:271) each call `stackAllowed` / `toolAllowed(roleKey(profile), …)`. A source pin lists all six.
- **`parseHash` stays syntactic.** It runs in `App` before any persona or profile exists (App.tsx:26), and the role can change after hydrate, so it only checks that the type is in `STACK_TYPES` and the id matches `^[A-Za-z_][A-Za-z0-9]*(:[\w.-]{1,80})?$`. The gate decides when the screen renders.
- **Unknown versus closed.** `toolById(id)` undefined (a typo, or a stale link to a tool that no longer exists) → `<Empty title="غير موجود" body="هذه الأداة غير متاحة في هذا الإصدار"/>` for every role. A known tool the role may not open → `closedTitleFor(profile)`. Both cases are in `tools-gating.spec.ts`.
- **One opener.** `app.openTool(id, payload?)` resolves aliases with `toolById`, checks `toolAllowed(roleKey(profile), t.id)`, then routes by surface: `t.surface === "sheet"` → `openSheet("tool", { id: t.id, ...payload })`; otherwise `push({ type: t.id === "cvreview" ? "cvreview" : "tool", id: t.id })`. `openSheet("tool", { id })` redirects screen tools to `openTool`, so no caller can open an empty sheet once the site tools leave `TOOL_VIEWS`. Home's goal card (tabs.tsx:35-36, :69), the ToolsTab grid (tabs.tsx:299, :302) and deep links all call `openTool`; HR's `cvreview` keeps working because it is a screen, not a sheet.
- **Derived lists.** `SITE_TOOLS = toolsForRole("supervisor").flatMap((t) => [t.id, ...(t.aliases || [])])`, so `rebar` and `masonry` stay open to supervisors through `toolOpen`. HR's `toolsOnly` stays `[]`. `TOOLS` (`data/tools.ts`) and `toolOpen` stay exported until `tests/v18.test.ts` is rewritten, and that rewrite updates lines 7 and 21–29 in the same commit.
- **The profile screen keeps its branch.** Today `ProfileScreen` is only the render switch's final else (AppView.tsx:533), reached by three `push({ type: "profile" })` calls and `#app/profile`. An explicit `top.type === "profile" ? <ProfileScreen app={app} />` branch is added **before** the default becomes `<Empty title="غير موجود" …/>`. A source pin checks that every `PLAIN_TYPES` / `STACK_TYPES` entry has its own branch, and smoke-render gains `["profile deep link", "#app/profile", () => signIn("ar"), "ProfileScreen"]`.
- **Routes:**
  - `#app/tool/<id>` (tool home: hero, project chip, «جديد», `DocList`, «حساب سريع»);
  - `#app/tooldoc/<id>:<docId|new>` (ids never contain «/»);
  - `#app/toolprojects` (ProjectEditor), `#app/toolstorage` (ToolStorage);
  - `#app/v/<docId>` (verify; the QR that points here arrives in Phase 4b).
  - `tool`, `tooldoc`, `toolprojects`, `toolstorage` and `v` join `STACK_TYPES`. `rebar` and `masonry` resolve through aliases.
  - **`app.replaceTop(e)`** (`setDir("none"); setStack((st) => [...st.slice(0, -1), e])`, no animation, gated by `stackAllowed`) lets a new document swap `tooldoc/<id>:new` for its real id on the first save; the hash writer (AppView.tsx:191) then records the real id. An e2e test: «جديد» → type → reload → the same document id.
- **Header titles** come from the registry, not a hand-kept map in `chrome.tsx:80`.
- **E2E hooks, not Arabic names.** In the same commit as each rename, `e2e/demo.spec.ts:29` and `:45` and `e2e/live.spec.ts:25` switch to `[data-tool="<id>"]` selectors generated from the registry; «حصر الخرسانة» is not a substring of «حصر وصب الخرسانة».

**Tools tab** (`src/features/tools/tab/ToolsTab.tsx`, extracted from `tabs.tsx`).
1. **«اليوم في الموقع»**, for every role except HR. It is built from `toolIndex` headers only, so it loads no tool chunk:
   - today's diary status (missing / draft / issued);
   - whether the toolbox talk is done;
   - permits valid now, with a countdown chip (from `until`);
   - today's pours;
   - the last cutting list;
   - cube tests due (wave 2).
   Each item is one tap to its document.
2. **Search** across name, description and `keywords` in both languages, and a **«الأخيرة»** row with the last 4 tools used.
3. **Packs**, each a section with a 2-column grid of 64 px pictogram tiles. Collapsed packs are remembered.
   - Order follows the role and discipline. The supervisor default: workforce, structural, rebar, survey, quantities, HSE, mechanical, electrical, architecture. A member's discipline pack floats to the top.
   - The office and money packs («المكتب الفني والعقود», «الراتب والعروض») render **only** when `moneyAccess(p) !== "none"`, and their entries carry `money: true`.
   - The trap is fixed: grouping uses `t.pack`, and the Home goal card uses `t.pack === "money"`, never "not site".
4. **HR** sees only the CV review card, as today.
5. **Methodology** stays at the end for engineers and owners.

**Store keys.** `PANE_KEYS` gains `toolIndex`, `toolProjects` and `toolPrefs`, because the tab renders them; `tests/navigation.test.ts` pins this.

**Invariant tests** (they replace `tests/v18.test.ts:23-29`):
- every `money: true` entry excludes `supervisor`;
- HR opens nothing but `cvreview`;
- every supervisor-allowed tool's body schema has no key matching `/price|rate|cost|amount|egp/i` (§3.0, §6 naming rule);
- every `STACK_TYPES` entry that maps to a tool goes through `stackAllowed`, checked with a source pin.

### 5f. Lazy loading

| Chunk | Contents | Loaded when | Budget (gzip) |
|---|---|---|---|
| main (existing) | registry, gate, Tools tab, Today strip, `tool-store` and `tool-docs`, ToolHost | start | +40 KB at most |
| `kit` | `ui/kit` (NumField … ExportBar) | first tool screen | 25 KB |
| `tools-field` | tradeKit, units | the tool opens | 60 KB |
| `tools-concrete` | concrete (+ cubeLog, hotConcrete in wave 2) | the tool opens | 60 KB |
| `tools-rebar` | bbs; `cut.worker` is its own chunk | the tool opens; the worker only on «احسب خطة القص» | 70 KB + 15 KB |
| `tools-survey` | levelBook (+ traverse, setOut, earthworks) | the tool opens | 60 KB |
| `tools-site` | siteDiary, toolboxTalk, workPermit, crew roster (+ snagList, incident, weeklyReport) | the tool opens | 90 KB |
| `tools-mep` | acInstall, drainRun, sprinklerCheck | the tool opens | 60 KB |
| `tools-elec` | cableCheck (+ the wave-2 electrical tools) | the tool opens | 50 KB |
| `tools-office` 💲 | ipc, voRegister, … | the tool opens; **never requested for supervisors**, because the import sits behind the gate | 90 KB |
| `doc-kit` | layout, blocks, raster backend, pdf-writer, QR, deliver | preview or export | 60 KB |
| `encode.worker` | palette + fflate | export | 12 KB |
| report fonts | 3 × woff2 subsets | preview or export (`?url` + FontFace) | 163 KB |
| `doc-vector` (Phase 5) | harfbuzz + hb-subset wasm, bidi-js, TTF subsets | export with the vector backend | about 600 KB |
| profiles | JSON per family (`src/tools/profiles/*.json`) | with its family chunk | 5–15 KB each |

- **Site tools leave the main chunk.** `TOOL_VIEWS` in `sheets.tsx` stops importing the four site tools, which leave the main chunk. Only the salary sheets stay there.
- **Tests still reach lazy screens:** `tests/smoke-render.test.ts` reaches them through `__preloadLazy`.
- **Budget gate.** `scripts/bundle-budget.mjs` fails CI when a chunk exceeds its budget by more than 10 %.

### 5g. i18n plan

- **Arabic in code, English in TSV files.** All tool strings are written in Arabic. English goes in one TSV per family, numbered after the existing `51_camera.tsv`:
  - `52_tools_core.tsv` (tab, registry, gate, kit, store, projects)
  - `53_doc_kit.tsv`
  - `54_trade_kit.tsv`
  - `55_concrete.tsv`
  - `56_bbs.tsv`
  - `57_level_book.tsv`
  - `58_site_diary.tsv`
  - `59_toolbox_permits.tsv`
  - `60_mep_site.tsv`
  - `61_cable.tsv`
  - wave-2 and wave-3 families continue from `62_`.
- **Complete English is enforced.** `tests/tools/i18n-complete.test.ts` reads `i18n/keys.json` and fails if any key whose source path (`p`) is under `tools/`, `doc/` or `ui/kit/` has no English. This closes the gap that CI does not catch today.
- **PDF text** is produced outside the DOM pass, so it goes through `tr()`. Title-block and table-header labels are always bilingual («المشروع · Project»). Body text follows the export language picked in the export sheet (Arabic by default).
- **Member text is never translated:** names, notes and item descriptions use `{...UGC}` on screen and are printed as typed.
- **Colloquial strings** in the trade kit («الحيطة طولها كام؟») are ordinary keys with plain English translations. A glossary file `i18n/glossary-tools.md` fixes the terms: شيكارة = bag (50 kg), جردل = bucket, عربية = wheelbarrow, خرطوشة = title block, مستخلص = interim payment certificate, رفع مشترك = joint survey.
- **Units and numbers.** Unit words come from one table, `unitWord(u, lang)` (م، م²، م³، كجم، طن، شيكارة، جردل). Numbers are Latin digits through `Num` and `bidi()`.
- **Dictionary split.** The English dictionary is statically imported into the main chunk today, and hundreds of tool strings would grow it. The build therefore emits `src/i18n/en.tools.generated.json` for keys whose paths are under `tools/`, `doc/` and `ui/kit/`. `ToolHost` registers it with `registerDictionary()` on the first tool open in English mode. A test pins that the main dictionary contains no tool-only keys.
- **Later languages.** Urdu, Hindi, Bengali and Nepali versions of the toolbox-talk topic cards (for Gulf crews) are **data**, not UI i18n, and ship in wave 3 after HSE review.

---

## 6. File and module layout, naming conventions

```
src/
  tools/
    registry.ts                 TOOL_REGISTRY, toolById, toolsForRole (pure data)
    gate.ts                     toolAllowed, toolOfStack, stackAllowed
    profiles/
      index.ts                  profileGet(id), profileSnap(id, overrides) → ProfileSnap, profileDiff(a, b)
      ecp203-site@1.json        concrete: waste, cubes, striking/curing, hourdi limits, logistics defaults
      ecp203-2020-bbs@1.json    rebar: radius rule, rounding, kg/m table, Ld factors, cover, L_min, kerf
      bs8666-2020@1.json · aci318-19@1.json
      eg-site@1.json            trade kit: mixes, waste table, hollow-block mortar, sheet size, loose densities
      survey-eng@1.json         allowance presets, two-peg limit
      hse-intl@1.json           OSHA / HSE / EN thresholds, gas limits, power-line table
      ac-site@1.json · drain-metric@1.json · drain-ipc@1.json · nfpa13-2022@1.json · ecp-fire@0.json (disabled)
      iec60364-2009@1.json      factor tables with a verified flag per table
  domain/tools/                 pure engines, no React, no DOM, no top-level side effects
    trade-calc.ts  concrete-calc.ts  bbs-calc.ts  bbs-optimise.ts  level-calc.ts  diary-calc.ts
    toolbox-calc.ts  permit-calc.ts  ac-calc.ts  drain-calc.ts  sprinkler-calc.ts  cable-calc.ts  units-calc.ts
  data/
    tool-docs.ts                ToolDoc / ToolTomb / ToolHeader, toolMerge, toolCaps, docBytes, shardFor
    tool-projects.ts            ToolProject, projectClean, projectNumber, projectSnap
    checklists.ts               unchanged templates; migrates storage to the store
  lib/
    tool-store.ts               IndexedDB wrapper, outbox, sync loop, hydrate, migration runner
    num-input.ts                (exists) numInputNormalize / Parse / Problem / Show
  doc/
    model.ts  layout.ts  theme.ts  measure-canvas.ts  pdf-writer.ts  deliver.ts  fonts.ts  qr.ts  hash.ts
    blocks/   title-block.ts  kv.ts  kpis.ts  table.ts  checks.ts  signatures.ts  photos.ts  sketch.ts  footer.ts
    render/   raster.ts  encode.worker.ts  preview.tsx  vector.ts (Phase 5)
    fonts/    plex-arabic-450.subset.woff2  …600  …700  (+ .ttf in Phase 5)  OFL.txt
  ui/kit/
    NumField.tsx  UnitField.tsx  Stepper.tsx  RowEditor.tsx  ResultCard.tsx  ConfirmDialog.tsx  DocList.tsx
    ExportBar.tsx  Section.tsx  DateField.tsx  ProjectChip.tsx  PhotoStrip.tsx  Picto.tsx  Disclaimer.tsx  format.ts
  features/tools/
    host.tsx                    ToolHost: lazy map, Suspense, gate, ToolHome / ToolDocScreen frames
    tab/ToolsTab.tsx  tab/TodayStrip.tsx  projects/ProjectEditor.tsx  settings/ToolStorage.tsx  verify/VerifyScreen.tsx
    field/      trade-kit.tsx  trade-report.ts  units.tsx
    concrete/   pour-plan.tsx  pour-report.ts  quick.tsx
    rebar/      bbs.tsx  bbs-report.ts  cut-plan.tsx  remnants.tsx  cut.worker.ts
    survey/     level-book.tsx  level-report.ts  two-peg.tsx
    site/       diary.tsx  diary-report.ts  toolbox.tsx  toolbox-report.ts  permit.tsx  permit-report.ts  crew.tsx
    mep/        ac-install.tsx  ac-report.ts  drain-run.tsx  drain-report.ts  sprinkler.tsx  sprinkler-report.ts
    elec/       cable.tsx  cable-report.ts
  features/qaqc/                stays; qaqc-report.ts becomes a DocSpec builder
scripts/fonts/subset.py  scripts/bundle-budget.mjs
tests/tools/<tool>-calc.test.ts  tests/tools/<tool>-report.test.ts  tests/doc/*.test.ts
e2e/tools-*.spec.ts
i18n/en/52_tools_core.tsv … 61_cable.tsv
docs/TOOLS.md  docs/PROFILES.md
```

**Naming conventions.**

1. **Tool ids and document kinds** are camelCase letters only (`levelBook`, `siteDiary`), so they are valid in member_state key suffixes and hash routes.

2. **Engine export prefixes** are unique per tool, because the test harness merges every export into one object:

| Prefix | Tool |
|---|---|
| `trade` | tradeKit |
| `conc` | concrete |
| `bbs`, `cut` | bbs and its optimiser |
| `lvl` | levelBook |
| `diary` | siteDiary |
| `tbt` | toolboxTalk |
| `ptw` | workPermit |
| `acx` | acInstall |
| `drn` | drainRun |
| `spk` | sprinklerCheck |
| `cab` | cableCheck |
| `unitx` | units |
| `doc` | the document kit |
| `tool` | store and registry |

   Wave-2 prefixes are reserved: `tko fin snag fdt heat crew cube hot lap ew trn pav trv sto stair lift scf wkr inc ext det fdm clg vnt dct wtk pmp pnl lux gnd ramp ipc vo`. `tests/tools/export-names.test.ts` fails on any duplicate export name across `src/`.

3. **Engines are pure and never throw on input.** Out-of-range values come back as `warnings` / `errors` arrays, because the smoke crawl types «12345» into every field. Units are in the names (`lenM`, `dMm`, `pumpM3h`, `sprayLm2`). SI is used internally; integer mm for levels, cut lengths and inverts.

4. **Money naming rule.** Supervisor-allowed schemas never use a key containing `price`, `rate`, `cost`, `amount` or `egp`. Rates of flow or spray carry their unit instead (`flowLs`, `sprayLm2`).

5. **Profile ids** follow `<code>-<scope>@<n>` (`ecp203-site@1`). An id is immutable: any change to a value makes `@n+1`.

6. **Document type codes** for numbering:

| Code | Document |
|---|---|
| MR | material request |
| PP | pour plan |
| BBS | bar bending schedule |
| LB | level book |
| DR | daily report |
| TBT | toolbox talk |
| PTW | permit to work |
| ACI | AC installation inspection |
| DRN | manhole invert schedule |
| SPK | sprinkler check |
| CBL | cable schedule |
| IR | QA/QC inspection |
| NCR, IPC, VO, WR | wave 2 and 3 |

7. **Hooks for e2e:** `data-tool="<id>"`, `data-tool-new`, `data-tool-export`, `data-tool-preview`, `data-tool-result="<key>"`, `data-row="<i>"`.

8. **Files and strings.** One tool per folder file. Screens hold no maths; report builders (`*-report.ts`) are pure functions `(doc, project) → DocSpec`, so they are testable in Node. New code is multi-line, as CLAUDE.md requires.

---

## 7. Phased delivery plan

**Overview.** Every phase up to Phase 7 ships as a web update on native line 2. Database migrations go out through the «Deploy database» workflow **before** the bundle that uses them, and the app tolerates their absence. `ota.config.json → nativeLine` stays at 2 until the optional Phase L3.

| Phase | Scope | Why at this point | Delivery |
|---|---|---|---|
| 0 ✅ | Research briefs; `num-input.ts` + tests; share-cancel fix; report glyph preload; QA/QC delete asks first | Groundwork already on `feat/tools-suite` | merged with Phase 1 |
| 1 | Foundation: registry and gate, Tools tab, store, projects, UI kit, document kit (raster), QA/QC on the kit, i18n split | Every tool depends on it, and QA/QC proves the kit on a live report with e2e coverage | over the air + 1 migration |
| 2 | Field core: `tradeKit`, `concrete`, `bbs`, `levelBook`, `units` | The highest daily frequency and most minutes saved, plus the three market gaps (optimiser with diagrams, live-checked level book, pour logistics) | over the air |
| 3 | Site management: `siteDiary`, `toolboxTalk` + crew roster, `workPermit`, the full Today strip | The diary assembles from Phase-2 documents, and talks and permits are daily on large sites | over the air |
| 4 | MEP and electrical quick checks: `acInstall`, `drainRun`, `sprinklerCheck`, `cableCheck` | Small engines on a finished kit; `drainRun` reuses the level book | over the air |
| W1 gate | Regression, counsel and HSE review, docs, staged release | The quality bar for the first public wave | Publish web update: preview, then production |
| 5 | Vector backend + wave-2 field and MEP tools (§4.1, not money) | Better PDFs for every tool already shipped; then the next most frequent tools | over the air |
| 6 | Office and money: `ipc`, `voRegister` + the `tool_docs` table + public verification (`doc_receipts`) | Highest liability; needs history and capacity; comes after field adoption | over the air + migrations |
| 7 | Wave-3 tools; ECP profiles enabled as reviewers sign them | Low frequency or waiting on licensed texts | over the air |
| L3 | Optional native batch, together with the production keystore release | Already planned (security plan 1.5) | new APK / IPA, `nativeLine: 3` |

### Phase 1: Foundation

**Scope.**
- **Registry and gate (§5e).**
  - Add `tool` / `tooldoc` / `v` stack types and route every stack gate through `stackAllowed`.
  - The render-switch default becomes `Empty`.
  - Salary tools are registered with `pack: "money", money: true`. The four existing site tools are wrapped in the new screen frame, which takes them out of the main chunk.
- **Tools tab:** packs, search, «الأخيرة», and the Today strip, which shows inspections only for now.
- **Store (§5c):** IndexedDB, shards, merge, outbox, verify, hydrate push, storage meter, demo store.
  - `cloud.loadAll` gains the `tool*` keys.
  - Migration `member_state_b_rate` with pgTAP.
- **Projects (§5b):** editor, chip, logos, numbering.
- **UI kit (§5d):** the components, plus `ConfirmDialog` and the undo toast replacing the inline copies.
- **Document kit (§5a):** model, layout, blocks, raster backend + encode worker, pdf-writer, preview, delivery, committed font subsets, QR, hash.
- **QA/QC on the kit and in the store (§3.13).**
- **Build tooling:** the i18n dictionary split + completeness test; `scripts/bundle-budget.mjs`.

**Acceptance criteria.**
1. **Gating.**
   - An HR account typing `#app/tool/concrete`, `#app/tooldoc/bbs:new` or `#app/inspection/new:rebar` sees «غير متاح لحساب الموارد البشرية».
   - A supervisor reaches no money tool from the tab, a hash, the Home goal card or a deep link.
   - The registry invariant tests pass.
2. **QA/QC report on the kit.** The issuer's title block, the stamp box and the new footer line appear; the header repeats on every page. The existing "spans pages" e2e passes.
   - Text pages are ≤ 300 KB each.
   - `__engspaceDoc.liveCanvases` never exceeds 2 during a 30-page fixture export.
3. **Offline and sync.**
   - An inspection created offline survives a reload.
   - It syncs when the connection returns.
   - In the live suite, two browser contexts on one account: a deletion on A is **not** resurrected by B; parallel edits to one draft produce a conflict copy; edits to different documents both survive.
4. **Demo mode** works unchanged, with no network calls from the store.
5. **Main chunk** grows by at most 40 KB gzip. Site tools are out of it.

**Tests.**
- **Unit:**
  - `tool-docs` merge matrix (≥ 24 cases: one-sided edits, two-sided conflict, tombstone vs older or newer edit, unknown fields kept, newer `v` read-only, cap and size refusals, shard choice and move);
  - layout pagination with a fake fixed-advance measurer: a 120-row table breaks with ≥ 3 rows per page, «يُرحّل / ما قبله» sums are exact, the header repeats, no heading is orphaned, the signature block is never split, and the footer shows x/y;
  - `pdf-writer` (header, xref offsets, `/Count`, `/Lang`, Info);
  - encoder round trip (palette pack → fflate inflate → same indices);
  - hash canonicalisation (key order does not matter);
  - gate.
- **Smoke-render setups:**
  - `["tools tab", "#app/tools", signIn("ar"), "ToolsTab"]`, plus English, supervisor, HR and owner variants;
  - `["tool home", "#app/tool/concrete", …, "ToolHome"]`;
  - `["new doc", "#app/tooldoc/concrete:new", …, "ToolDocScreen"]`;
  - `["verify", "#app/v/x", …, "VerifyScreen"]`;
  - HR variants expect the closed `Empty`.
- **E2E:**
  - `tools-gating.spec.ts` (every role, tab and address);
  - `checklists.spec.ts` on the kit;
  - `tools-offline.spec.ts` (`context.setOffline`);
  - `tools-sync.spec.ts` (`E2E_LIVE=1`, two contexts).
- **PDF checks** (helper `pdfFacts(bytes)` in `e2e/helpers.ts`, using pdfjs-dist in Node): `%PDF-` and `%%EOF`, `numPages`, page sizes, Info `/Title`, `/Lang`, one `/Indexed` image per text page, the expected number of DCT photos. Pages 1 and N are rendered to PNG artifacts for review.

### Phase 2: Field core

**Scope.**
- **`tradeKit`** (§3.1): 8 modes, simple mode, calibration, material request with its PDF.
- **`concrete`** (§3.2): pour plan, quick mode, arrival schedule, calendar, WhatsApp summary.
- **`bbs`** (§3.3): schedule, shape sketches, summary, cutting plan in a worker, remnant store, quick weights mode, the `rebar` alias.
- **`levelBook`** (§3.4): HI and rise-and-fall methods, live checks, adjustment, two-peg test, edit log.
- **`units`** extensions (§3.12).
- **Today strip:** adds today's pours and the last cutting list.

**Acceptance criteria.**
1. Every §3.1–3.4 and §3.12 test vector passes at the §3.0 tolerances.
2. In e2e, typing each tool's vector inputs shows the expected hero, for example «اطلب 122.9 م³ · 14 عربية · عربية كل 18 د».
3. Old behaviour is kept:
   - the `rebar` and `masonry` addresses open the new tools;
   - the old weight results equal `rebarOrder()` from `site-calc.ts`, and the existing `site-calc.test.ts` vectors stay green.
4. Performance:
   - an 800-line BBS and a 1,500-row level book scroll with no long task over 50 ms (`E2E_PERF=1`);
   - `cutPlan` stays within 300 ms per diameter for 40 distinct lengths on the CI profile;
   - a keystroke updates the result within one frame (each engine computes its vectors in < 2 ms in a micro-benchmark).
5. A supervisor can use all four tools end to end, and no price, rate or cost appears on screen or in any PDF.

**Tests.**
- **Unit vectors** in `tests/tools/{trade,concrete,bbs,cut-optimise,level,units}-calc.test.ts`.
- **Optimiser property tests** (500 random seeded demands):
  - the plan covers the demand exactly;
  - `newBars ≥ lowerBound` and `newBars ≤ FFD`;
  - deterministic for a given seed;
  - integer mm only.
- **Report builders** (`*-report.test.ts`):
  - the DocSpec has the right columns and units in headers, totals equal engine totals, and «يُرحّل» columns are set;
  - the level book's c/f sums equal the reduced sums.
- **E2E** `tools-field.spec.ts`: one test per tool (vector in, hero out, export, `pdfFacts`), each with a supervisor variant.

### Phase 3: Site management

**Scope.**
- **`siteDiary`** (§3.5): carry-over, assembly from today's documents, photo stamping with the measured server offset, issue and revision.
- **`toolboxTalk`** (§3.6) with the crew roster (kind `crew`).
- **`workPermit`** (§3.7) with its calculators, gas-test expiry and countdown.
- **Today strip** completed: diary status, talk done, permits valid now.

**Acceptance criteria.**
1. A "same crew as yesterday" diary day is done in ≤ 25 taps and under 5 minutes in a scripted e2e.
2. The diary pulls in today's pours, talks, permits and inspections. Issue locks the day; a later change creates Rev 01.
3. Photos carry «⏱ شبكة» when the offset is less than 12 h old, otherwise «⏱ جهاز».
4. A permit shows its countdown; at expiry it shows «منتهي» and cannot be revalidated without a new gas test where one applies.
5. A toolbox talk with a worker missing PPE and no action cannot be closed.
6. Worker names never leave the account's private store. The diary shows only the count of incidents.

**Tests.**
- **Unit:** vectors §3.5–3.7; the stamp-text builder and the clock-offset logic (pure); carry-over rules (what is copied and what never is).
- **E2E:**
  - an offline diary with 3 photos, then reload, then online sync;
  - permit expiry using Playwright's clock;
  - toolbox validation errors;
  - PDF facts, including the photo-page count.

### Phase 4: MEP and electrical quick checks

**Scope.**
- `acInstall` (§3.8);
- `drainRun` (§3.9), with ground levels imported from a level book;
- `sprinklerCheck` (§3.10), with the ECP profile disabled;
- `cableCheck` (§3.11), with `verified: false` on the IEC transcription and the «من كتالوج المصنّع» mode.

**Acceptance criteria.**
1. Vectors pass.
2. The cable dataset's unverified banner is visible both in the app and in the PDF's design-basis block.
3. «ليست حسابات هيدروليكية» is printed on every sprinkler page.
4. The drain profile chart states both scales.

**Tests.** Unit vectors; e2e for each tool; a source pin that the ECP fire profile is `disabled`.

### W1 release gate

1. Full CI is green: check, database, e2e and android.
2. A manual export review on one low-end Android phone and one iPhone, printed on an office laser printer, with the result recorded in `docs/TOOLS.md`.
3. **Owner actions completed:**
   - Egyptian counsel has reviewed the §8.1 texts;
   - an HSE engineer has reviewed the toolbox topic library and the permit checklists;
   - a licensed electrical engineer has spot-checked the cable dataset rows used by the vectors.
4. `docs/TOOLS.md`, `docs/PROFILES.md` and the CLAUDE.md lines are written.
5. Release: Publish web update to the preview channel; testers use it for 1 week; then production with the update broadcast. New tools carry a «تجريبي» chip for one release.

### Phase 5: Vector backend and wave-2 tools

**Order:**
1. the vector backend;
2. `takeoffSheet`, `finishTakeoff`, `snagList`;
3. `fieldDensity`, `earthworks`, `trench`, `pavement`;
4. `cubeLog`, `hotConcrete`, `lapLength`, `heatStress`, `crewPlanner`;
5. `scaffoldTags`, `liftPlan`, `weeklyReport`, `incident`;
6. `traverse`, `setOut`, `stairCheck`;
7. the MEP and electrical wave-2 tools.

**Acceptance criteria.**
- The vector-backend gate of §5a passes.
- Every tool's vectors from §4 pass.
- The incident report has an «نسخة مجهّلة» PDF with no names.

### Phase 6: Office and money

**Scope.**
- The `tool_docs` table with `save_tool_doc` (conflict-returning) and pgTAP (own-only access, rate limit, size cap, grants per pgTAP 18).
- Shard migration with verification.
- `ipc` and `voRegister`.
- The `doc_receipts` table for public hash verification.

**Acceptance criteria.**
1. IPC arithmetic is in integer piastres: the current amount is always cumulative minus previous, and certified IPCs are immutable.
2. All tax modes print their legal basis and date.
3. The supervisor e2e confirms the office pack is absent and its chunk is never requested.

### Phase 7 and Phase L3

**Phase 7.** Wave-3 tools. ECP profiles move from `pending` to `active` only with a committed verification record (§8.2).

**Phase L3.** These are optional native additions in the production-keystore release, each behind `Capacitor.isPluginAvailable()` with the line-2 path unchanged:
- `@capacitor/geolocation` for opt-in GPS on photo stamps and survey points;
- text-to-speech for the trade kit's «اقرأ لي» on Android (iOS WKWebView already has `speechSynthesis`);
- «حفظ في التنزيلات» through MediaStore.

No PDF plugin is added (§5a).

### Tests that run in every phase

- **"Every tool opens"** is generated from `TOOL_REGISTRY`, one test per pack, skipping `status: "soon"`. It uses `[data-screen-layer] input[inputmode="decimal"]`, asserts a computed output rather than swallowing fill errors, and splits the long timeout across packs.
- **Fixture documents** live in `tests/doc/fixtures/*.json`. The layout unit tests and the e2e PDF checks share them, so a layout change shows up in both.
- **Static pins:** `PANE_KEYS` contains the tool keys; no top-level side effects in `src/domain/tools/**`, `src/doc/**` or `src/tools/**` (the harness imports everything); no duplicate export names; no `Camera.getPhoto` outside `camera.ts`; no `@capacitor/*` import in engines.

---

## 8. Risks, liability and trust

### 8.1 Disclaimers

**Where they appear.**
- A first-use banner for each tool, acknowledged once per account and stored in `toolPrefs.ack`.
- One line under every `ResultCard`.
- In every PDF: the colophon, plus the specific notes in the checks table.
- The WhatsApp summary always ends with «تقدير — راجع المستند الكامل».

| Family | Arabic (printed) | English |
|---|---|---|
| General (all tools) | «أداة مساعدة للحساب والتسجيل. القيم الافتراضية قابلة للتعديل ومصدرها مذكور، ولا تغني عن المواصفات والرسومات المعتمدة ولا عن مراجعة المهندس المسؤول.» | A calculation and record-keeping aid. Defaults are editable and sourced; it does not replace the approved specification and drawings or review by the responsible engineer. |
| Structural, concrete, rebar | the §3.2 / §3.3 notes (ECP 203, approved mix, drawings, consultant approval) | as in §3.2 / §3.3 |
| Survey | the §3.4 note (raw readings logged; legal survey work needs a licensed surveyor) | as in §3.4 |
| HSE | «تقدير استرشادي — لا يغني عن التصميم المعتمد ولا عن الشخص المختص؛ القيم الافتراضية قابلة للتعديل ومصدرها مذكور.» | Guidance estimate; it does not replace an approved design or a competent person. |
| MEP, mechanical | the HVAC brief text («… لا تتحمل EngSpace أى مسؤولية …») | as in the HVAC brief |
| Fire | «أداة تقدير وفحص أولي. لا تُغني عن تصميم معتمد من مهندس استشاري مرخّص وموافقة الحماية المدنية. القيم وفق الكود والإصدار المختار.» | Preliminary estimate and check only … |
| Electrical | the electrical brief text + «ليس للتنفيذ دون توقيع» + the dataset version | as in the electrical brief |
| Architecture | the architecture brief text (permit authority, civil defence, edition in force) | as in the architecture brief |
| Money and tax 💲 | «أرقام تقديرية — تُراجع مع المستشار الضريبي والقانوني؛ النسب مؤرّخة ومصدرها مذكور.» | Estimates; check with your tax and legal adviser; rates are dated and sourced. |

**Wording rules.**
- No screen or PDF claims compliance with an Egyptian code unless that profile is `active` and verified.
- «مطابق» in a checks table means "within the stated limit of the stated clause", and the clause is printed next to it.
- EngSpace never appears as issuer, approver or checker. Its only mark is the 7 pt footer line.
- No "official" claim, no ads and no paywall inside any tool.

### 8.2 Code-profile versioning and governance

```ts
type ProfileValue = { v: number | string; unit: string; conf: "H" | "M" | "L"; source: string; clause?: string;
  verified: boolean; verifiedBy?: string /* name + syndicate no. */; verifiedOn?: string };
type CodeProfile = { id: string /* "ecp203-site@1" */; code: string; edition: string; family: string;
  status: "active" | "pending" | "disabled"; values: Record<string, ProfileValue> };
```

**Rules.**
1. **Ids are immutable.** Changing any value creates `@n+1`, and the release notes list the changed keys.
2. **Reprints never change.** Documents keep their `ProfileSnap`, so a reprint is byte-identical apart from the generation time.
3. **Updating an issued document.** «تحديث لملف الكود الأحدث» creates a new revision. Its revision row prints the diff (key · old · new).
4. **Visible flags.** Every `[L]` value is listed in `ProfileSnap.unverified` and shows «⚑ تحقق» on screen and in the PDF. A unit test checks, for every profile, that every `conf: "L"` key lands in `unverified`.
5. **Pending profiles.** A `pending` profile (the ECP fire code, the Egyptian accessibility and stair values, the ECP 203 acceptance criteria, `rcSection`) is selectable only in a read-only "preview" with «بانتظار المراجعة».
   - It becomes `active` only through a committed verification record in `docs/PROFILES.md`: who checked, against which printed edition and page, and on what date.
   - A CI test refuses an `active` profile containing an unverified value that is not flagged.
6. **Overrides.** A project override or a document override needs a reason. Both are printed as «قيم معدّلة».

**Owner actions** (each lifts specific values from [L] or [M] towards [H]):
- **ECP 203-2018/2020, Arabic pages:** exposure table, cube size, sampling and acceptance, striking and curing, bend and hook table, cover table.
- **Electrical code (probably ECP 302):** clauses, plus a licensed copy of IEC 60364-5-52 for the ampacity and factor tables.
- **Egyptian HVAC code:** city design conditions and the outdoor-air / ACH table.
- **Fire code (ECP 305):** hazard classes, extinguisher, detector and tank values.
- **Plumbing code 301 and the network code:** minimum slopes and manhole sizes.
- **Licensed ICC IPC tables:** WSFU and DFU.
- **ESA levelling specification.**
- **Egyptian accessibility code; Law 119/2008 executive regulations:** openings and stairs.
- **Reviewers:**
  - an HSE engineer for the topic library and permit checklists;
  - a licensed structural engineer for `rcSection`;
  - Egyptian counsel for the disclaimers and the tax and VAT texts.

### 8.3 Preventing data loss

1. **The device copy comes first.** IndexedDB is written on every edit, before anything else. `navigator.storage.persist()` is requested. Failures are shown, never swallowed (§5c).
2. **Syncing never loses data.**
   - The outbox uses verify-after-write, so a lost shard race is re-queued.
   - Two-sided edits become conflict copies; nothing is overwritten.
   - Tombstones beat stale copies, and photos are deleted only after the undo window closes and the tombstone has synced.
3. **No silent caps.** A cap or size limit refuses with a reason. The storage meter warns at 80 % and offers device archiving with a JSON backup first.
4. **Issued documents are immutable.** Changes create revisions, and the edit log keeps raw survey readings.
5. **Forward and backward compatibility.**
   - Each kind has `v` and pure `migrate(kind, v → v+1)` functions with tests.
   - Unknown fields are preserved.
   - A document newer than the running bundle opens read-only, which keeps over-the-air rollback safe.
6. **Crash recovery.** `toolPrefs.lastOpen` reopens the last document after a renderer loss or an app kill. The draft is already on disk.
7. **Backup.** Tools → التخزين → «نسخة احتياطية» shares a JSON file with all documents and projects. Photos stay in the private bucket and are referenced by path. Importing a backup merges through `toolMerge`.
8. **Shared phones.** Signing out keeps the account's tool data on the device by default, so offline drafts survive a re-login. The sign-out sheet offers «احذف بيانات الأدوات من هذا الجهاز».

### 8.4 Privacy

- **Documents are private.** Tool documents live only in the member's own rows (member_state with the RLS «own» policy, later `tool_docs` with own-only access). They never appear in feeds, profiles or search.
  - Staff have no reader for them. A pgTAP test asserts that moderators and admins cannot select another account's tool rows.
  - Nothing about a tool document is sent in a push notification.
- **Photos** sit in the private `inspections` bucket, in the owner's folder, with EXIF stripped and short-lived signed URLs. Burned-in stamps carry time, project and zone only. GPS arrives in L3, opt-in per project and off by default.
- **Workers' personal data.** Names and badge numbers in crew, toolbox and permit records, and health data in incident reports, are personal and (for health) sensitive data under PDPL 151/2020 [M].
  - The tool collects only what the record needs and states the purpose in the UI.
  - The incident report offers the anonymised PDF. The diary carries counts only.
- **Account deletion** removes the member's `member_state` rows, `tool_docs` rows and the `inspections/<owner>/` folder. A cloud test confirms it, keeping CLAUDE.md's rule that deleting an account deletes everything it wrote.
- **Verification is anonymous.** The QR code and hash carry no names, and verification answers only match or no match.
- **Money stays away from supervisors** at three levels: the registry (`money: true` entries never list `supervisor`), the schemas (no price keys in supervisor tools, pinned by a test) and e2e (no tab, address or chunk).
- **Demo data is fictional,** and no page imitates a real firm.

### 8.5 Risk register

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| 1 | A wrong code value or default leads to a site error or a liability claim | M / H | Versioned profiles, [L] flags on screen and in the PDF, «طريقة الحساب» with clauses, pending ECP profiles, owner verification records, disclaimers reviewed by counsel |
| 2 | WebView runs out of memory on a long export (renderer gone) | M / H | Page-by-page encoding with at most 2 live canvases, frame-size photo decoding, no base64, e2e memory hook, document safe in IndexedDB |
| 3 | Sync loses or resurrects documents across phones | M / H | Per-document merge, conflict copies, tombstones, verify-after-write, two-context live e2e |
| 4 | member_state limits (40 keys, 1 MB) are hit by heavy users | M / M | 24 shards ≈ 16.8 MB, storage meter, device archive, the `tool_docs` table in Phase 4b |
| 5 | A supervisor sees money through a new tool or address | L / H | Registry allow-list gate everywhere, schema naming test, e2e by address, office chunk never requested |
| 6 | Raster PDFs judged not publication-grade (soft text, not searchable) | M / M | 240 dpi lossless palette pages, vector backend in Phase 5 behind the same model, printed-sample review at the W1 gate |
| 7 | The main bundle and English dictionary grow with 60+ tools | H / M | One lazy chunk per family, split tool dictionary, bundle budget in CI |
| 8 | Harness export-name collisions hide a broken engine | M / M | Mandatory prefixes, duplicate-export test, no top-level side effects |
| 9 | Field adoption fails (too many taps, unreadable in sun) | M / H | Simple mode, 56 px field mode, sun mode, carry-over, Today strip, tap-count e2e, tester week before production |
| 10 | Two phones issue the same document number offline | L / M | Collision detection at merge, «رقم مكرر», re-issue as a new revision |
| 11 | An over-the-air bundle meets an older shell, or an older bundle meets newer documents | L / M | Wave 1 is JS only, `nativeLine` unchanged; newer `v` opens read-only; updater rollback |
| 12 | Tax or legal rates change (VAT 2025, social insurance) | H / M | Dated, sourced, editable rates with regime presets; basis printed; disclaimer; owner review each quarter |
| 13 | Clock tampering undermines diary evidence | M / M | «⏱ شبكة / جهاز» on every stamp from the measured server offset; the hash at issue; public receipts in Phase 4b |
| 14 | Workers' data is misused | L / H | Private store, anonymised incident PDF, no push content, account deletion purge, PDPL note |

### 8.6 What builds trust

- Every result shows its working, its units and its clause.
- Defaults are visible, and confidence is shown honestly.
- Calculators switch off rather than extrapolate.
- The title block belongs to the issuer.
- The PDF states what it is not.
- Drafts never die, and the app shows a clear «لم يُشارك بعد» state.
- Reprints are identical years later.
- There are no ads or paywalls in any tool.

This answers each of the market brief's ten trust-killers, and it is what lets a consultant sign a sheet that came from a phone.

---

## 9. Review decisions

Three independent reviews (engineering, codebase and product) checked this blueprint before any code was written. All of their critical and major findings are applied in the sections above. This section records what changed and why, so the reasoning survives the edits.

### 9.1 Engineering corrections (applied in §3–§4)

| Where | Was | Now | Why |
|---|---|---|---|
| §3.3 shape 99 | deduction 2(r + d) at every bend | Σ 2(r + d)·tan(θ/2) − θ(r + d/2), θ ≤ 90°; hooks use BS 8666 end lengths | 45° cranks («مكسح») came out short; vector 7: Ø16 → 2483.3 mm |
| §3.3 splices | lap = Ld | 1.3·Ld (↑25 mm, ≥ 300 mm); Ld only for a declared staggered mark | wave-1 splices all fall in one section (100 % spliced) |
| §3.3 bend radius | one rule | BS 8666 Table 2 per Ø; 2d (≤ 16) / 3.5d (> 16) beyond it | Ø18 vector: 1550.5 → 1575 |
| §3.3 Ld defaults | η unknown → 1.0 | η = 1.3 when position unknown; plain bars: typed lap, ≥ 400 mm, hooks | conservative until ECP plain-bar values are verified |
| §3.3 «أمثل» | always printed | only when bars = max(lower bound, ⌈LP⌉); otherwise the gap is printed | an optimality claim must be provable |
| §3.3 cutting v3 | mixed lengths | 24 × 1575 → 4 bars, offcut 2550 each, scrap 0 | the governing rounded length is 1575 |
| §3.2 sloped footing | frustum shortcut | prismoidal V = L·B·h₁ + h₂/6·(A₁ + A₂ + 4A_m) | vector 1b: 1.9305 m³ |
| §3.10 sprinklers | sx × sy only | max(sx, 2·wallX) × max(sy, 2·wallY); LH by system and ceiling type | a head near one wall and far from the other covered too much |
| §3.11 cables | one temperature table | B.52.15 (ground, 20 °C) for D1/D2, B.52.14 (air) otherwise; inputs airC / groundC | buried circuits were derated as if in air |
| §3.7 fall clearance | fixed free fall | FF = max(0, lanyard + 1.5 − anchor above feet); OSHA 1.8 / EN 4.0 m | anchor below the D-ring was unsafe |
| §3.7 permits | `until` set on draft | draft → authorised → active → suspended → closed / cancelled | a draft must never show «ساري» |
| §4.1 IPC taxes | bare rates | each rate {value, source, asOf, conf}; VAT base P / E−J / E with three pinned results | VAT law changed in 2025; the base is a tax adviser's call |
| §3.0 tests | absolute tolerance | compare at the printed decimals; full precision stored beside it | a pin should fail only on a visible change |

### 9.2 Codebase seams (applied in §5–§7)

- **One gate:** `stackAllowed` and `toolAllowed` at push, the render switch, AppHeader, the tool sheet, its toolMeta and `takePendingOpen`; one opener `openTool(id)`; `parseHash` stays syntactic. The render switch gets an explicit profile branch before its default becomes `Empty`.
- **Money stays out of reach** in the store too: `toolKindsForRole` filters headers, search, Today, storage meter, backup and verify. The no-money guard is a camelCase token check over field lists and report columns.
- **Sync that fits member_state:** `loadAll` excludes `tool%`; tool rows load on their own (stamps first, then only changed shards); sizes measured in the server's jsonb form; per-key debounce with flush on pop / hidden; a rate limit trigger with pgTAP.
- **Header writes only on visible changes**, so typing in a document never re-renders the Tools tab.
- **Workers are thin shells over pure modules**; the test harness excludes `*.worker.ts`; nothing touches IndexedDB, fonts or storage at module top level.
- **i18n split by chunk** with `registerDictionary`; **icons by explicit named imports** (`TOOL_ICONS`); **chunk budgets** from the Vite manifest.
- **Account deletion and sign-out** wipe the device store (`toolStore.destroy`); photo uploads respect the media rate limit and quota.
- **QA/QC migration** is idempotent and runs on every hydrate while the old keys exist; existing e2e hooks and PDF checks are kept.

### 9.3 Product scope (applied in §2, §3, §7)

- **All engineers and every trade:** tradeKit gains electrician, plumber, drywall and structural-steel tiles; `finishTakeoff`, `fieldDensity` and the `coolingLoad` quick mode join wave 1; `wallTakeoff` and `takeoffSheet` move into Phase 2.
- **Office tools engineers expect:** `irRegister`, `rfiLog` (with submittals and transmittals), `meetingMinutes`, `dayworkSheet`, `steelTakeoff`, `curveSetOut`; a truck log inside the pour plan.
- **Money where it belongs:** the IPC, variations and subcontractor statements ship in Phase 4b straight after the W1 gate, for engineers and owners only, with BOQ import from Excel.
- **Delivery people actually use:** Excel / CSV export and paste-from-Excel; a WhatsApp summary with every saved document; numbering `<code>-<orig>-<TYPE>-<NNNN>` with editable counters; a document fingerprint («بصمة المستند») in wave 1 and the public QR receipt in Phase 4b.
- **Built for the site:** a one-tap sun mode (≥ 7:1 contrast, larger result text), card-first entry for the BBS and level book, dark-mode-safe sketches, a write-ahead journal and a zip backup so nothing typed on site is lost.
- **Every engine is versioned** (`<PREFIX>_ENGINE`), every issued document freezes its outputs, checks and trace, and every calculation PDF prints its basis table (value · unit · source/clause · confidence · ⚑).
