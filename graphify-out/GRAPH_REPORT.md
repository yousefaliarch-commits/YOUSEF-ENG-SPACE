# Graph Report - yousef-eng-space  (2026-11-10)

## Corpus Check
- 421 files · ~682,534 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 97 file(s) not represented in the graph (top: .tsv 59, .xml 12, (none) 8)

## Summary
- 4834 nodes · 15259 edges · 191 communities (150 shown, 41 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 680 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `047e114e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Roles, Taxonomy & Tabs
- Identity, Auth & Onboarding
- Tool Screens & UI Kit
- App Shell & Push Client
- Phase 5: vector backend and wave-2 tools
- Moderation & Admin Console
- updater.ts
- Feed & Detail Screens
- MEP & Cable Tools
- CV Screen & Settings
- Rebar BBS & Cutting
- Supabase Cloud Client
- CV Audit Engine
- CV Parsing & Extraction
- FilterChip
- Concrete Take-off Tool
- Site Diary & Permits
- PDF Page Layout
- Push Notifications Schema
- SalaryInsight.tsx
- Content Schema (Posts, Jobs)
- Profiles & Moderation Schema
- Project Rules (CLAUDE.md)
- Dev Dependencies
- Word (.docx) Export
- CV Rebuild & Translate
- AI Proxy (ai-chat)
- Prototype Migration Generator
- Verification Flow
- diary.tsx
- QA/QC Checklists
- Row Mapping & Hydrate
- Document kit src/doc (DocSpec → docLayout → backends)
- Level Book Tool
- Trade Kit Calculator
- AI CV Review & Redaction
- README, CI & Live Preview
- CV Hiring Panel
- host.tsx
- PHASE2.md — Supabase (Frankfurt) and Capacitor 8
- CI Workflow Steps
- Runtime Dependencies (Capacitor)
- Push Delivery (FCM/APNs)
- Text Guard (Language Filter)
- iOS App Shell
- App Entry & Bootstrap
- PDF Rendering & Theme
- Release Builds Workflow
- Rebuilt CV Draft UI
- Media Upload Function
- Test React Stubs
- hardening.test.ts
- i18n Core
- Android MainActivity
- helpers.ts
- Seed Accounts Workflow
- Salary Explorer Schema
- npm Scripts
- landing.test.ts
- Smart Engineer Docs
- tool-docs.ts
- Search Index
- vitest
- Native Glue & Sharing
- Cloud Profile & Uploads
- Native Camera Flow
- Image Compression
- Media Privacy Schema
- Security Armor Schema
- E2E Navigation & Posts
- Deploy DB Steps
- publish.mjs
- OCR & Vendor Loading
- i18n Build & Vitest Config
- Migration Analyzer Script
- Messaging Schema
- Brand Mark Rendering
- Tool Registry & Gate
- AI Client Service
- i18n String Extractor
- PDF Writer
- Support Tickets Schema
- Net Pay & Offers
- CV HR Assessment
- Document hash and fingerprint «بصمة المستند»
- chrome.tsx
- permit.tsx
- Scorecards & Raises Schema
- Realtime Feed Schema
- AI Schema (Quota)
- env
- Gradual Typing Scripts
- templates.tsx
- palette.test.ts
- Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)
- Smoke Render Tests
- TypeScript Config
- Deploy DB Triggers
- ipc.tsx
- 20261002000008_admin_extras.sql
- Verification Schema
- Company Scorecard UI
- UI Crawler Tool
- Android Test Stubs
- Post Author Controls
- Release Workflow Inputs
- rc-section.tsx
- Prototype Migration Docs
- Test Account Seeder
- config.ts
- lucide-react
- Security Docs
- AI Response Schemas
- Publish Workflow Inputs
- Admin Cloud Adapter
- Publish Workflow Env
- xlsx.ts
- register.tsx
- Media E2E Tests
- Publish Workflow Steps
- numInputParse
- Publish Job Config
- Node TS Config
- public.profiles
- Checklists E2E
- Publish Workflow Header
- doc-controls.test.ts
- boq-ui.tsx
- Broadcast Input
- duct.tsx
- v24.test.ts
- qto-calc.ts
- Notes Input
- Push Body Input
- Push Title Input
- Push Title (EN) Input
- EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md)
- pgTAP Push Tests
- pgTAP Media Tests
- React DOM Stub
- pgTAP Author Tests
- pgTAP Security Tests
- pgTAP Moderation Tests
- pgTAP Verification Tests
- pgTAP Admin Delete Tests
- Brand Polygon Data
- Product scope review (§9.3)
- AssistantScreen.tsx
- design-docs.test.ts
- cloud.integration.test.ts
- mfa.ts
- doc-xlsx.test.ts
- update-banner.tsx
- ipc · المستخلص الجاري 💲 (Interim payment certificate)
- strict-check.mjs
- Issuer title block «خرطوشة»
- ai-tools.spec.ts
- updater-flow.test.ts
- OTA.md — live web updates
- The website (Cloudflare Pages)
- tool-projects.ts
- finishAuthLink
- update-banner.test.ts
- post-author.test.ts

## God Nodes (most connected - your core abstractions)
1. `AppView()` - 163 edges
2. `Num()` - 151 edges
3. `CLAUDE.md — EngSpace project memory` - 115 edges
4. `Panel()` - 89 edges
5. `supabase()` - 87 edges
6. `vitest` - 78 edges
7. `Secondary()` - 74 edges
8. `Primary()` - 71 edges
9. `react` - 62 edges
10. `ok()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `Tools i18n plan (Arabic in code, English TSV 52–61, split tool dictionary)` --references--> `DICT`  [INFERRED]
  docs/TOOLS-BLUEPRINT.md → src/i18n/i18n.ts
- `mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87)` --references--> `loadMammoth()`  [INFERRED]
  docs/MIGRATION.md → src/lib/vendor.ts
- `What changed, by layer` --references--> `Advanced()`  [INFERRED]
  docs/WORKSTATION.md → src/ui/kit.tsx
- `private.kick_push() + engspace-push-sweep cron` --references--> `private.kick_push()`  [INFERRED]
  docs/PUSH.md → supabase/migrations/20261009000017_push_notifications.sql
- `ai_take() — takes one unit (money:false for supervisors)` --references--> `public.ai_take()`  [INFERRED]
  docs/AI.md → supabase/migrations/20261020000026_ai.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data-loss prevention mechanisms (§8.3)** — docs_tools_blueprint_tool_document_store, docs_tools_blueprint_tool_merge, docs_tools_blueprint_write_path_pacing, docs_tools_blueprint_write_ahead_journal, docs_tools_blueprint_tombstone_delete_undo, docs_tools_blueprint_size_guards, docs_tools_blueprint_issue_freeze, docs_tools_blueprint_storage_meter [EXTRACTED 1.00]
- **Diary self-assembly from today's documents (no double entry)** — docs_tools_blueprint_sitediary, docs_tools_blueprint_concrete, docs_tools_blueprint_toolboxtalk, docs_tools_blueprint_workpermit, docs_tools_blueprint_checklists, docs_tools_blueprint_no_double_entry [EXTRACTED 1.00]
- **Money kept away from supervisors at three levels (registry, schemas, tab / address / chunk)** — docs_tools_blueprint_tool_registry, docs_tools_blueprint_role_gating, docs_tools_blueprint_no_money_guard, docs_tools_blueprint_lazy_chunks, docs_tools_blueprint_tools_tab [EXTRACTED 1.00]
- **OTA live web update flow (publish → app-updates bucket → check → banner → broadcast)** — github_workflows_publish_update, scripts_ota_publish, docs_ota_app_updates_bucket, src_native_updater_core, src_native_updater, src_ui_update_banner_updatebanner, docs_ota_broadcast_app_update [EXTRACTED 1.00]
- **Deletion leaves nothing behind (content, authorship and media go together)** — claude_admin_delete_content, claude_delete_my_post, docs_phase2_account_deletion, docs_security_media_janitor [INFERRED 0.85]
- **Secrets stay server-side (function secrets / Vault / GitHub secrets, never the client or repo)** — docs_phase2_publishable_key_rule, docs_ai_gemini_api_key, docs_push_fcm_setup, docs_push_apns_setup, docs_push_vault_wake_setup, docs_security_media_janitor, docs_phase2_purge_verification_cron [INFERRED 0.85]

## Communities (191 total, 41 thin omitted)

### Community 0 - "Roles, Taxonomy & Tabs"
Cohesion: 0.05
Nodes (129): catName(), CATS, companyMult(), areaOf, CITIES, citiesOf(), CITY_COUNT, cityName() (+121 more)

### Community 1 - "Identity, Auth & Onboarding"
Cohesion: 0.06
Nodes (91): isWorker(), divTitle(), ACCOUNT_KEY, ageError(), anonTitle(), AUTHOR_FIELDS, checkPassword(), confirmError() (+83 more)

### Community 2 - "Tool Screens & UI Kit"
Cohesion: 0.08
Nodes (78): rfiLog · سجل الاستفسارات والاعتمادات (RFI, submittal & transmittal register), REV_PRESETS, PPE_ITEMS, AiFillCard(), FormKind, str(), strs(), X (+70 more)

### Community 3 - "App Shell & Push Client"
Cohesion: 0.05
Nodes (91): @capacitor/push-notifications, AppView(), AssistantScreen, ChecklistsScreen, CVReviewScreen, PaneBody, sameSig(), TabPane() (+83 more)

### Community 4 - "Phase 5: vector backend and wave-2 tools"
Cohesion: 0.08
Nodes (43): areaSchedule · جدول المساحات والاشتراطات (Area schedule, zoning & parking), bearingTest · قراءة اختبارات التحمل (CBR / DCP / plate-load reader), chwPipe · مواسير المياه المثلجة (Chilled-water pipe sizing), Truck log «سجل الخلاطات» (pour-day ticket log), cubeLog · سجل مكعبات الخرسانة (Concrete cube register), curveSetOut · توقيع المنحنيات (Horizontal curve setting-out), detectors · توزيع الكواشف (Detector & call-point spacing), drainSize · مقاسات الصرف والتهوية (DFU drainage & vent sizing) (+35 more)

### Community 5 - "Moderation & Admin Console"
Cohesion: 0.06
Nodes (106): COMPANIES, company(), room(), ROOMS, GOVS, JOBS, NOTIFS0, POSTS0 (+98 more)

### Community 6 - "updater.ts"
Cohesion: 0.19
Nodes (19): bad(), call(), looksHealthy(), emit(), fail(), listeners, markBad(), mod() (+11 more)

### Community 7 - "Feed & Detail Screens"
Cohesion: 0.07
Nodes (69): Module ↔ prototype part map, react, bo(), CAT_DESC, co(), CompanyLogo(), GENERAL_ROOM, hueOf() (+61 more)

### Community 8 - "MEP & Cable Tools"
Cohesion: 0.07
Nodes (58): acInstall · فحص تركيب التكييف (AC installation check), cableCheck · الكابل وهبوط الجهد (Cable & voltage-drop check), drainRun · مناسيب غرف التفتيش (Drain run invert schedule + sight rails), fireDemand · الطلب المائي للحريق (Sprinkler demand & fire tank, preliminary), ac-site@1 (drain table, minimum slope, ρ), drain-metric@1 / drain-ipc@1 (minimum slopes), iec60364-2009@1 (factor tables with a verified flag per table), nfpa13-2022@1 (sprinkler limits) (+50 more)

### Community 9 - "CV Screen & Settings"
Cohesion: 0.07
Nodes (72): Welcome(), AiBadge(), AiConsentCard(), AiErrorCard(), AiInsightsCard(), AiRunningCard(), PILLARS, AIX_RUN (+64 more)

### Community 10 - "Rebar BBS & Cutting"
Cohesion: 0.05
Nodes (86): bbs · جدول تفريد وقص الحديد (Bar bending schedule & 12 m cutting optimiser), lapLength · التماسك والوصلات (Development & lap length), Rebar pack (rebar), aci318-19@1 (ACI profile), bs8666-2020@1 (scheduling standard, typed laps), ecp203-2020-bbs@1 (rebar: radius rule, rounding, kg/m, Ld factors), rebar · أوزان الحديد (legacy weight calculator, alias of bbs), Remnant store «مخزن البواقي» (kind rebarStock, per project) (+78 more)

### Community 11 - "Supabase Cloud Client"
Cohesion: 0.08
Nodes (65): @capacitor/browser, supabase(), addComment(), addReview(), closeTicket(), companyScorecard(), contribute(), countJobView() (+57 more)

### Community 12 - "CV Audit Engine"
Cohesion: 0.05
Nodes (66): anyScope(), AR_PUNCT, AR_SLIPS, AR_WEAK_LEAD, auditCV(), bigOf(), cleanObject(), conjToPast() (+58 more)

### Community 13 - "CV Parsing & Extraction"
Cohesion: 0.06
Nodes (57): notWork(), analyseBullet(), AR_MASDAR_PAST, cleanPart(), CV_ACTION_AR, CV_ACTION_EN, CV_BULLET, CV_CERT_LIST (+49 more)

### Community 14 - "FilterChip"
Cohesion: 0.21
Nodes (25): posLabel(), day(), demoDirectory(), DirectorySection(), MemberDetail(), STAFF, TicketDetail(), TicketsSection() (+17 more)

### Community 15 - "Concrete Take-off Tool"
Cohesion: 0.09
Nodes (58): Pure tool engines (src/domain/tools/*) + lazy tool screens, concrete · حصر وصب الخرسانة (Concrete take-off & pour planner), Striking, curing and cube-test calendar, Cold-joint guard A_max = Q_eff·t_cover/layer, ecp203-site@1 (concrete: waste, cubes, striking/curing, hourdi, logistics), TraceStep, addDays(), Check (+50 more)

### Community 16 - "Site Diary & Permits"
Cohesion: 0.08
Nodes (43): heatStress · الإجهاد الحراري وحظر الظهيرة (Heat index & midday-ban planner), incident · الحوادث ومؤشرات السلامة (Incident report + TRIR/LTIFR), liftPlan · خطة الرفع المبسطة (Lift plan), Material request «طلب خامات» (MR, kind materialRequest), ncr · تقرير عدم المطابقة (Non-conformance report), HSE & site management pack (hse), Phase 3: Site management (siteDiary, toolboxTalk + crew, workPermit, full Today strip), hse-intl@1 (OSHA / HSE / EN thresholds, gas limits, power-line table) (+35 more)

### Community 17 - "PDF Page Layout"
Cohesion: 0.17
Nodes (43): Align, anchorX(), basisTable(), boxedText(), cellText(), checksTable(), colophon(), docLayout() (+35 more)

### Community 18 - "Push Notifications Schema"
Cohesion: 0.06
Nodes (27): notifications_inbox, public.notifications, public.inflation_rates, comments_notify, inflation_notify, notifications_a_en, notifications_category, notifications_push (+19 more)

### Community 19 - "SalaryInsight.tsx"
Cohesion: 0.20
Nodes (16): SalaryInsightCard(), X, offList(), TIP_KINDS, ToolTipCard(), X, cached(), DAY (+8 more)

### Community 20 - "Content Schema (Posts, Jobs)"
Cohesion: 0.09
Nodes (43): ballots_tally, comments_author, comments_count, comments_parent, comments_post, company_reviews_author, company_reviews_company, job_contacts_count (+35 more)

### Community 21 - "Profiles & Moderation Schema"
Cohesion: 0.10
Nodes (17): audit_log_at, private.id_of_ref(), private.item_mod, private.my_ref(), private.report_targets, public.admin_accounts(), public.admin_set_staff(), public.audit_log (+9 more)

### Community 22 - "Project Rules (CLAUDE.md)"
Cohesion: 0.06
Nodes (32): CLAUDE.md — EngSpace project memory, admin_delete_content() — permanent delete by admins, app.engspace:// deep-link scheme (open/<type>/<id>, auth-callback), Company scorecards (company_ratings, company_scorecard()), Executive A4 inspection report (inspectionPdf, signatures, REPORT_PROMO), Next: high-impact features (market transparency, daily engineering tools), member_state — per-member synced key/value store, private.net_of_gross() — SQL mirror of netPay() (+24 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.05
Nodes (50): config, tar dependency override (patched version), description, devDependencies, autoprefixer@^10.6.1, @babel/parser@^8.0.6, @babel/traverse@^8.0.6, @babel/types@^8.0.6 (+42 more)

### Community 24 - "Word (.docx) Export"
Cohesion: 0.18
Nodes (30): basisBlock(), block(), checksTable(), clean(), coreXml(), dataTable(), documentXml(), esc() (+22 more)

### Community 25 - "CV Rebuild & Translate"
Cohesion: 0.11
Nodes (40): DESIGN_BY_DISC, TASK_GENERIC, trackL2(), CV_FLUFF_TEST, CV_MILITARY_RE, HEAD, isGradLine(), KEEP_PERSONAL (+32 more)

### Community 26 - "AI Proxy (ai-chat)"
Cohesion: 0.11
Nodes (24): AiRequest, Chunk, CORS, DEFAULT_MODEL, ERRORS, FALLBACK_MODELS, Feature, geminiBody() (+16 more)

### Community 27 - "Prototype Migration Generator"
Cohesion: 0.05
Nodes (38): asm, checker, cycles, declMod, dedent(), dfs(), DROP, dropped (+30 more)

### Community 28 - "Verification Flow"
Cohesion: 0.11
Nodes (41): discForDivision(), discName(), divConflict(), divisionForDisc(), DIVISIONS, divOf(), AV, docSize() (+33 more)

### Community 29 - "diary.tsx"
Cohesion: 0.13
Nodes (21): Body, build(), CAUSES, Delay, Editor(), Equip, Insp, Instr (+13 more)

### Community 30 - "QA/QC Checklists"
Cohesion: 0.10
Nodes (47): checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections), jpegsOf(), CATEGORIES, categoryOf(), cleanTemplate(), Custom, customKey(), isUserTemplate() (+39 more)

### Community 31 - "Row Mapping & Hydrate"
Cohesion: 0.13
Nodes (32): addPost(), latestShares(), loadAll(), postById(), postJob(), withMedia(), mediaUrl(), authorFields() (+24 more)

### Community 32 - "Document kit src/doc (DocSpec → docLayout → backends)"
Cohesion: 0.09
Nodes (17): Colophon (technical data only: profiles, engines, SHA-256), DocPreview (same display list and layout object as export), Paged tables with «يُرحّل / ما قبله» carry-forward rows, fixedMeasurer, ColophonData, DocBackend, DocCol, DocFont (+9 more)

### Community 33 - "Level Book Tool"
Cohesion: 0.15
Nodes (30): Two-peg collimation test «اختبار الوتدين», levelBook · دفتر الميزانية (Levelling field book + two-peg test), survey-eng@1 (allowance presets, two-peg limit), has(), LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust(), LvlAllow (+22 more)

### Community 34 - "Trade Kit Calculator"
Cohesion: 0.11
Nodes (40): eg-site@1 (trade kit: mixes, waste, hollow-block mortar, sheet size), Trade-kit tiles beyond civil (electrician, plumber, drywall, structural steel), tradeKit · حاسبة الصنايعي (Trade quick kit), CALIB_DEFAULT, HOLLOW_MORTAR_L_M2, PLASTER_PRESETS, STEEL_SECTIONS, TRADE_ENGINE (+32 more)

### Community 35 - "AI CV Review & Redaction"
Cohesion: 0.13
Nodes (27): AiCv, AIX, allowedNumbers(), arr(), both(), draftOf(), factsOf(), guardNumbers() (+19 more)

### Community 36 - "README, CI & Live Preview"
Cohesion: 0.07
Nodes (24): Laptop + phone live preview (npm run live, port 8770), name, on, pull_request, push, workflow_dispatch, permissions, contents (+16 more)

### Community 37 - "CV Hiring Panel"
Cohesion: 0.13
Nodes (24): FIGURE, gradeIntel, gradeOf(), GradeTier, hiringPanel(), interviewQuestions(), ISSUE_OWNERS, issueReasons() (+16 more)

### Community 38 - "host.tsx"
Cohesion: 0.13
Nodes (32): ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة), DOCNO_PRESETS, docNoPatternProblem(), formatDocNo(), DocWbs, PROJECT_CODE, DocSkeleton(), ISSUERS (+24 more)

### Community 39 - "PHASE2.md — Supabase (Frankfurt) and Capacitor 8"
Cohesion: 0.08
Nodes (20): admin_accounts — mod_ref list with moderation fields only, admin_directory — admins-only member directory keyed by pid, Yousef — owner (architect / BIM coordinator), first admin, PHASE2.md — Supabase (Frankfurt) and Capacitor 8, bootstrap_admin() — first administrator, Local Supabase development (Docker, Mailpit, db:* scripts), pgTAP privacy and permission suites (supabase/tests), private.authorship — who wrote what, unreadable by any client role (+12 more)

### Community 40 - "CI Workflow Steps"
Cohesion: 0.08
Nodes (32): needs, runs-on, steps, runs-on, steps, runs-on, steps, needs (+24 more)

### Community 41 - "Runtime Dependencies (Capacitor)"
Cohesion: 0.05
Nodes (38): dependencies, @capacitor/browser@8.0.5, @capacitor/camera@8.2.5, @capacitor/core@8.5.2, @capacitor/filesystem@8.1.4, @capacitor/keyboard@8.0.6, @capacitor/preferences@8.0.1, @capacitor/push-notifications@8.1.3 (+30 more)

### Community 42 - "Push Delivery (FCM/APNs)"
Cohesion: 0.08
Nodes (39): admin_message — team messages arrive as «فريق EngSpace», Support tickets (support_tickets / ticket_messages, private support bucket), PUSH.md — push notifications, Apple Push Notification service (APNs, iOS), Firebase Cloud Messaging (FCM, Android), Inflation month notice, private.kick_push() + engspace-push-sweep cron, Private message notices (+31 more)

### Community 43 - "Text Guard (Language Filter)"
Cohesion: 0.11
Nodes (31): AR_HATE, AR_HATE_ADDR, AR_INSULTS, AR_MILD, AR_NAME_EXCEPTIONS, AR_PREFIX, AR_PROFANITY, AR_PROFANITY_PHRASES (+23 more)

### Community 44 - "iOS App Shell"
Cohesion: 0.08
Nodes (4): Capacitor, AppDelegate, SceneDelegate, UIKit

### Community 45 - "App Entry & Bootstrap"
Cohesion: 0.09
Nodes (31): Modules written by hand in Phase 1 (main, App, TopBar, ScreenLoading, vendor, ocr, i18n), react-dom@18.3.1, react-dom, AdminGate, AdminView, App(), ErrorBoundary, installPressFeedback() (+23 more)

### Community 46 - "PDF Rendering & Theme"
Cohesion: 0.09
Nodes (33): Ctx, DrawOptions, drawPage(), fitRect(), imageKey(), DrawPage, LogoRef, canvasMeasurer (+25 more)

### Community 47 - "Release Builds Workflow"
Cohesion: 0.09
Nodes (30): runs-on, steps, GH_REPO, GH_TOKEN, GOOGLE_SERVICES_JSON, TAG, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY (+22 more)

### Community 48 - "Rebuilt CV Draft UI"
Cohesion: 0.11
Nodes (31): CV report executive snapshot + collapsible action plan, NO_DICT, bullet(), coreXml(), documentXml(), DOCX_MIME, draftDocx(), esc() (+23 more)

### Community 49 - "Media Upload Function"
Cohesion: 0.10
Nodes (36): db, ascii(), check(), Chunk, concat(), CORS, handle(), json() (+28 more)

### Community 50 - "Test React Stubs"
Cohesion: 0.07
Nodes (10): jsx(), jsxDEV(), jsxs(), Component, createContext(), c, Fragment, lazies (+2 more)

### Community 51 - "hardening.test.ts"
Cohesion: 0.06
Nodes (31): DOC_GUARD, headerOf(), isToolDoc(), isToolTomb(), jsonbBytes(), mergeDoc(), newDocId(), plainText() (+23 more)

### Community 52 - "i18n Core"
Cohesion: 0.13
Nodes (32): AR_CHARS, arResidue(), DICT, elText(), fillPattern(), freeText(), I18N, I18N_ATTR_SEL (+24 more)

### Community 53 - "Android MainActivity"
Cohesion: 0.11
Nodes (4): MainActivity, WebViewListener, Viewport meta disabling pinch / double-tap zoom, EngViewController

### Community 54 - "helpers.ts"
Cohesion: 0.15
Nodes (19): ROLES, TABS, ADMIN_PW, demoAs(), noClipped(), noCrash(), noOverflow(), PW (+11 more)

### Community 55 - "Seed Accounts Workflow"
Cohesion: 0.07
Nodes (26): default, description, options, required, type, PROJECT_REF, SEED_API_URL, SUPABASE_ACCESS_TOKEN (+18 more)

### Community 56 - "Salary Explorer Schema"
Cohesion: 0.17
Nodes (13): public.salary_bands(), public.salary_shares, salary_shares_author, salary_shares_cell, private.has_shared(), private.share_rate_limit(), public.my_salary_status(), public.salary_explorer() (+5 more)

### Community 57 - "npm Scripts"
Cohesion: 0.07
Nodes (28): scripts, build, cap:sync, check, db:admin, db:env, db:functions, db:reset (+20 more)

### Community 58 - "landing.test.ts"
Cohesion: 0.06
Nodes (60): kgPerM(), clamp(), clampSlab(), f(), POUR_DEFAULTS, SLAB_BARS, SLAB_COVER_MM, SLAB_DEFAULT (+52 more)

### Community 59 - "Smart Engineer Docs"
Cohesion: 0.18
Nodes (12): AI.md — «المهندس الذكي» Smart Engineer (v0.29.0), private.ai_config (enabled, daily_limit, model, model_light), ai_quota() — remaining units for the quota chip, ai_rate() — 👍 / 👎 per feature, ai_refund() — unit back when the model fails before the first word, ai_take() — takes one unit (money:false for supervisors), ai_tokens() — token counts only, Daily AI allowance (25 per Cairo day per member) (+4 more)

### Community 60 - "tool-docs.ts"
Cohesion: 0.07
Nodes (48): SignBox, TitleExtras, ProfileSnap, ToolDoc, ToolDocLogEntry, ToolDocStatus, ProjectSnap, ToolProject (+40 more)

### Community 61 - "Search Index"
Cohesion: 0.15
Nodes (26): isEn(), AR_INDIC, AR_PREFIXES, AR_SUFFIXES, bigrams(), buildSearchIndex(), damerau(), dice() (+18 more)

### Community 62 - "vitest"
Cohesion: 0.04
Nodes (23): vitest, C, html, modules, sources, src, auth, calls (+15 more)

### Community 63 - "Native Glue & Sharing"
Cohesion: 0.11
Nodes (20): @capacitor/app@8.1.2, @capacitor/haptics@8.0.2, @capacitor/share@8.0.3, @capacitor/splash-screen@8.0.2, @capacitor/app, @capacitor/haptics, @capacitor/share, @capacitor/splash-screen (+12 more)

### Community 64 - "Cloud Profile & Uploads"
Cohesion: 0.16
Nodes (17): currentPersona(), e164(), friendly(), markContacted(), myProfile(), saveProfile(), setAvatar(), setPassword() (+9 more)

### Community 65 - "Native Camera Flow"
Cohesion: 0.20
Nodes (18): PHOTO_NOTES, useCameraShot(), useImagePicker(), cameraAccess(), isCancel(), isDenied(), markCameraBroken(), NATIVE_MAX (+10 more)

### Community 66 - "Image Compression"
Cohesion: 0.14
Nodes (19): sharp@0.32.6, sharp, canEncodeWebp(), compressCanvas(), Compressed, compressImage(), dataUrlToBlob(), decode() (+11 more)

### Community 67 - "Media Privacy Schema"
Cohesion: 0.12
Nodes (16): media_register() upload quotas, private.photo_guard — profile photo must be the member's own avatar upload, media_uploads_open, media_uploads_owner, posts_z_media, private.kick_media(), private.media_uploads, private.photo_guard() (+8 more)

### Community 68 - "Security Armor Schema"
Cohesion: 0.11
Nodes (22): public.member_state, comments_a_rate, company_reviews_a_rate, job_views_account, jobs_a_rate, member_state_a_keys, messages_a_rate, posts_a_rate (+14 more)

### Community 69 - "E2E Navigation & Posts"
Cohesion: 0.26
Nodes (10): CRASH, DOMAIN, newMember(), publish(), signIn(), test_info_use(), authorFlow(), badge() (+2 more)

### Community 70 - "Deploy DB Steps"
Cohesion: 0.09
Nodes (23): env, runs-on, steps, ADMIN_EMAIL, APNS_KEY_ID, APNS_KEY_P8, APNS_TEAM_ID, FCM_SERVICE_ACCOUNT (+15 more)

### Community 71 - "publish.mjs"
Cohesion: 0.16
Nodes (11): base, bytes, dist, listing, manifest, pkg, put(), served (+3 more)

### Community 72 - "OCR & Vendor Loading"
Cohesion: 0.13
Nodes (16): ChooserState, IMAGE_ERRORS, imageAccess(), OPTIONS, PhotoChooser(), scanImageForMoney(), loadImageEl(), modelsGzipped() (+8 more)

### Community 73 - "i18n Build & Vitest Config"
Cohesion: 0.14
Nodes (16): i18n extract / build scripts ported to Node, buildDict(), [cmd = "build", ...args], contentKeys(), kid(), lines(), loadExtra(), loadKeys() (+8 more)

### Community 74 - "Migration Analyzer Script"
Cohesion: 0.10
Nodes (19): brandView, checker, declOf, fs, fwdEval, host, inFn(), out (+11 more)

### Community 75 - "Messaging Schema"
Cohesion: 0.16
Nodes (18): messages_thread, private.in_thread(), private.messages, private.threads, public.my_threads(), public.send_message(), public.set_thread_identity(), public.start_thread() (+10 more)

### Community 76 - "Brand Mark Rendering"
Cohesion: 0.10
Nodes (19): E+S brand mark (src/ui/brand-mark.json) and icon generation, data, markPolys(), markSvg(), pts(), C, { chromium }, font (+11 more)

### Community 77 - "Tool Registry & Gate"
Cohesion: 0.22
Nodes (13): Salary & offer tools (offer, net, compare, script, raise, path, contract, move, inflation), SITE_TOOLS, toolKindsForRole(), toolOfStack(), toolsForRole(), BY_ID, DESIGN, FIELD (+5 more)

### Community 78 - "AI Client Service"
Cohesion: 0.15
Nodes (18): useQuota(), AiAsk, AiFeature, AiMsg, AiResult, ask(), askJson(), events() (+10 more)

### Community 79 - "i18n String Extractor"
Cohesion: 0.14
Nodes (14): byKind, hasProp(), inRegexCtx(), inType(), isBilingual(), isContent(), keys, OUT (+6 more)

### Community 80 - "PDF Writer"
Cohesion: 0.13
Nodes (15): encodeIndexed(), hexRgb(), LUTS, packIndexed(), paletteLut(), unpackIndexed(), enc, num() (+7 more)

### Community 81 - "Support Tickets Schema"
Cohesion: 0.17
Nodes (11): public.admin_directory(), public.admin_directory_set_staff(), public.admin_message(), public.open_ticket(), public.reply_ticket(), public.staff_reply_ticket(), public.staff_set_ticket_status(), public.staff_tickets() (+3 more)

### Community 82 - "Net Pay & Offers"
Cohesion: 0.31
Nodes (12): evaluateOffer(), MEDICAL_VALUE, offerPackage(), percentileOf(), round500(), annualTax(), BRACKET_LOSS, grossForNet() (+4 more)

### Community 83 - "CV HR Assessment"
Cohesion: 0.15
Nodes (16): CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, CV_UNIS, candidateGender(), egyptian(), EMPLOYERS, hrAssessment (+8 more)

### Community 84 - "Document hash and fingerprint «بصمة المستند»"
Cohesion: 0.90
Nodes (3): canonical(), contentHash(), sha256Hex()

### Community 85 - "chrome.tsx"
Cohesion: 0.11
Nodes (47): DESK_MIN, DeskNav(), SPLIT_MIN, useDesk(), useMedia(), authorOf(), cleanName(), displayName() (+39 more)

### Community 86 - "permit.tsx"
Cohesion: 0.07
Nodes (46): DocText, AR_MONTHS, EN_MONTHS, fmtNum(), iso(), LRI, PDI, build() (+38 more)

### Community 87 - "Scorecards & Raises Schema"
Cohesion: 0.17
Nodes (10): authorship_drop_raises, company_ratings_company, private.drop_raise_reports(), private.raise_rate_limit(), public.company_ratings, public.company_scorecard(), public.raise_reports, raise_reports_a_limit (+2 more)

### Community 88 - "Realtime Feed Schema"
Cohesion: 0.19
Nodes (13): comments_feed_new, comments_moderation, company_reviews_moderation, jobs_moderation, posts_moderation, private.feed_comment_new(), private.feed_moderation(), private.profile_ping() (+5 more)

### Community 89 - "AI Schema (Quota)"
Cohesion: 0.18
Nodes (14): ai_feedback_account, ai_feedback_created, ai_usage_day, private.ai_cfg(), private.ai_config, private.ai_feedback, private.ai_usage, public.admin_ai_set() (+6 more)

### Community 90 - "env"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, env, if, runs-on, steps, BRANCH (+35 more)

### Community 91 - "Gradual Typing Scripts"
Cohesion: 0.15
Nodes (10): fs, path, ts, walk(), files, fs, path, edit() (+2 more)

### Community 92 - "templates.tsx"
Cohesion: 0.09
Nodes (42): REV_MAX_LEN, Envelope, ParsedTemplateFile, parseTemplateFile(), Sign, TEMPLATE_FILE_PROBLEM, TemplateFileProblem, BAD_KEY (+34 more)

### Community 93 - "palette.test.ts"
Cohesion: 0.11
Nodes (37): isPaletteKey(), openPalette(), paletteHint(), PaletteHost(), PalettePanel, GROUP_ICON, Icon, iconOf() (+29 more)

### Community 94 - "Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)"
Cohesion: 0.09
Nodes (23): cvreview · مراجعة السيرة الذاتية (CV review, the only HR tool), DocList (windowed list of saved documents), Salary & offers pack «الراتب والعروض» 💲 (money), Phase 1: Foundation (registry/gate, Tools tab, store, projects, UI kit, document kit, QA/QC), Codebase seams review (§9.2), Storage meter «التخزين» (bodies, photos, device archive, JSON backup), Test-harness constraints (smoke crawl, stub React, no top-level side effects), Delete flow: tombstone, 6 s undo, photos removed after sync (+15 more)

### Community 95 - "Smoke Render Tests"
Cohesion: 0.14
Nodes (8): crawl(), fakeEvent, handlerErrors, render(), seen, setups, signIn(), signInAs()

### Community 96 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noImplicitAny (+6 more)

### Community 97 - "Deploy DB Triggers"
Cohesion: 0.14
Nodes (13): default, description, required, concurrency, admin_email, name, on, push (+5 more)

### Community 98 - "ipc.tsx"
Cohesion: 0.08
Nodes (39): XCell, XFmt, computeIpc(), fin(), fmt(), IPC_ENGINE, IpcDeduction, IpcIssue (+31 more)

### Community 100 - "Verification Schema"
Cohesion: 0.22
Nodes (8): paths, public.decide_verification(), public.submit_verification(), public.verification_orphans(), public.verification_requests, public.withdraw_verification(), verification_one_pending, verification_queue

### Community 101 - "Company Scorecard UI"
Cohesion: 0.35
Nodes (10): Agg, demoScorecard(), FactorId, factorOf(), FACTORS, nearest(), SCORE_MIN, scorecardOf() (+2 more)

### Community 102 - "UI Crawler Tool"
Cohesion: 0.31
Nodes (10): act(), auditArabic(), crawlState(), elements(), handled(), reach(), report(), reset() (+2 more)

### Community 104 - "Post Author Controls"
Cohesion: 0.27
Nodes (8): delete_my_post() — removes replies, reactions, authorship and the image, edit_my_post() — own post, counts only real text changes, my_posts() — server answer to which posts are mine, posts_feed_edit, private.feed_post_edit(), public.delete_my_post(), public.edit_my_post(), public.my_posts()

### Community 105 - "Release Workflow Inputs"
Cohesion: 0.18
Nodes (10): tag, name, on, workflow_dispatch, permissions, contents, default, description (+2 more)

### Community 106 - "rc-section.tsx"
Cohesion: 0.10
Nodes (36): ResultCard (hero number, pictograms, «طريقة الحساب»), barArea(), beta1(), checkRc(), chk(), DEPTH, ECU, ES (+28 more)

### Community 107 - "Prototype Migration Docs"
Cohesion: 0.20
Nodes (13): EngSpace — anonymous career and salary network for Egyptian engineers, MIGRATION.md — Phase 1 prototype migration, Dead logo controls removed after the brand board, mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87), pdf.js CVE-2024-4367 fix (getDocument with isEvalSupported: false), Phase 1: single-file prototype → bundled Vite + React + TypeScript, v24 single-file prototype (27 script parts, one global scope), Supabase auth e-mail templates (Confirm signup, Reset password) (+5 more)

### Community 108 - "Test Account Seeder"
Cohesion: 0.11
Nodes (15): Playwright e2e suite (iPhone 15 + Pixel 7 profiles, E2E_LIVE / E2E_WEBKIT), Seeded test accounts (@engspace.test, ten roles), chromiumUse, { defaultBrowserType: _a, ...iphoneNoEngine }, { defaultBrowserType: _b, ...pixel }, { defaultBrowserType: _c, ...desktop }, iphone, API (+7 more)

### Community 109 - "config.ts"
Cohesion: 0.20
Nodes (7): Run modes: Demo / Cloud / Native, nativeStorage, AUTH_REDIRECT_NATIVE, BACKEND, forcedDemo(), SUPABASE_KEY, SUPABASE_URL

### Community 110 - "lucide-react"
Cohesion: 0.20
Nodes (20): lucide-react, isCloud(), INFLATION, INFLATION_SOURCE, addMonths(), cumulative(), lastYear(), monthKey() (+12 more)

### Community 111 - "Security Docs"
Cohesion: 0.17
Nodes (8): SECURITY.md — security and media rules, Job views count once per member per job per day, Inspection photo removal (x-media-action: remove, media_removable), Open Phase 1 steps (1.1 guards, 1.4 auth / staff MFA, 1.5 release build), Transformation plan Phase 1 (security steps 1.1–1.5), file(), plist(), manifest()

### Community 112 - "AI Response Schemas"
Cohesion: 0.24
Nodes (5): A(), CV_DOC, FORM_SCHEMAS, O(), ROWS()

### Community 113 - "Publish Workflow Inputs"
Cohesion: 0.20
Nodes (10): default, description, required, channel, push_body_en, workflow_dispatch, default, description (+2 more)

### Community 114 - "Admin Cloud Adapter"
Cohesion: 0.42
Nodes (9): admin, accountsOf(), auditOf(), DETAIL, loadAdmin(), modOf(), ms(), reportsOf() (+1 more)

### Community 115 - "Publish Workflow Env"
Cohesion: 0.22
Nodes (9): NOTES, P_BODY, P_BODY_EN, P_TITLE, P_TITLE_EN, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL (+1 more)

### Community 116 - "xlsx.ts"
Cohesion: 0.11
Nodes (33): agrees(), BUILTIN_FMT, cellsOf(), cellXml(), clean(), colName(), COLOR, coreXml() (+25 more)

### Community 117 - "register.tsx"
Cohesion: 0.11
Nodes (31): num(), daysBetween(), DONE, isDate(), REG_ENGINE, REG_KINDS, RegDoc, registerOf() (+23 more)

### Community 119 - "Publish Workflow Steps"
Cohesion: 0.25
Nodes (8): steps, if, name, run, uses, with, cache, node-version

### Community 120 - "numInputParse"
Cohesion: 0.11
Nodes (26): VPath, Body, build(), compute(), m3(), mm(), module, profilePaths() (+18 more)

### Community 121 - "Publish Job Config"
Cohesion: 0.29
Nodes (7): CHANNEL, PROJECT_REF, SUPABASE_ACCESS_TOKEN, jobs, publish, env, runs-on

### Community 122 - "Node TS Config"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, allowImportingTsExtensions, types, extends, include

### Community 123 - "public.profiles"
Cohesion: 0.09
Nodes (24): authorship_account, on_auth_user_created, private.author_snapshot(), private.authorship, private.can_act(), private.handle_new_user(), private.profile_guard(), private.touch_updated_at() (+16 more)

### Community 124 - "Checklists E2E"
Cohesion: 0.60
Nodes (4): build(), builder(), downloadPdf(), insp()

### Community 125 - "Publish Workflow Header"
Cohesion: 0.33
Nodes (5): concurrency, name, on, permissions, contents

### Community 126 - "doc-controls.test.ts"
Cohesion: 0.12
Nodes (29): Decisions worth knowing, The editable workstation (v0.39) — architectural report, Verification, What changed, by layer, applyDocControls(), cleanRev(), cleanSign(), cleanTitleExtras() (+21 more)

### Community 127 - "boq-ui.tsx"
Cohesion: 0.15
Nodes (25): colIndex(), decode(), ReadSheet, readXlsx(), textOf(), applyMeasured(), BOQ_ENGINE, BoqField (+17 more)

### Community 128 - "Broadcast Input"
Cohesion: 0.40
Nodes (5): default, description, required, type, broadcast

### Community 129 - "duct.tsx"
Cohesion: 0.15
Nodes (25): AIR, ceilStep(), DUCT_ENGINE, ductFriction(), DuctLimits, DuctMat, DuctRun, DuctRunOut (+17 more)

### Community 130 - "v24.test.ts"
Cohesion: 0.18
Nodes (5): S, base, find(), flat(), names

### Community 132 - "qto-calc.ts"
Cohesion: 0.12
Nodes (22): computeQto(), deductionsOf(), f3(), grossOf(), pos(), QTO_ENGINE, QtoDeduct, QtoItem (+14 more)

### Community 133 - "Notes Input"
Cohesion: 0.50
Nodes (4): notes, default, description, required

### Community 134 - "Push Body Input"
Cohesion: 0.50
Nodes (4): push_body, default, description, required

### Community 135 - "Push Title Input"
Cohesion: 0.50
Nodes (4): push_title, default, description, required

### Community 136 - "Push Title (EN) Input"
Cohesion: 0.50
Nodes (4): push_title_en, default, description, required

### Community 137 - "EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md)"
Cohesion: 0.09
Nodes (25): EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md), Calculation-basis block {k:'basis'} on every calculation PDF, Crew roster (kind crew, one per project), crewPlanner · تخطيط العمالة والمدة (Crew size & duration planner), Owner actions (code texts and reviewers), Workforce quick tools pack (workforce), Phase 0 ✅: research briefs and groundwork (num-input, share-cancel, glyph preload), Phase L3: optional native batch (nativeLine 3: geolocation, text-to-speech, Downloads) (+17 more)

### Community 138 - "pgTAP Push Tests"
Cohesion: 0.50
Nodes (3): claimed, th, tk

### Community 171 - "Product scope review (§9.3)"
Cohesion: 0.14
Nodes (21): coolingLoad · حمل التبريد واختيار الوحدات (Cooling load & unit selection), dayworkSheet · يوميات الأعمال الإضافية (Daywork sheet, no rates), Excel & CSV export (docXlsx / docCsv), fieldDensity · الكثافة الحقلية (Field density & compaction QC), finishTakeoff · حصر التشطيبات (Room-based finishes take-off), irRegister · سجل طلبات الاستلام (IR / WIR / MIR register), kerbs · البردورات والإنترلوك (Kerbs & interlock), masonry · حصر المباني (legacy tool merged into tradeKit) (+13 more)

### Community 172 - "AssistantScreen.tsx"
Cohesion: 0.19
Nodes (17): AssistantScreen(), ChatMsg, key(), load(), save(), STARTERS, toolsNamed(), turnsFor() (+9 more)

### Community 173 - "design-docs.test.ts"
Cohesion: 0.10
Nodes (12): evalFormula(), specXlsx(), tokenize(), module, module, module, module, fixed (+4 more)

### Community 174 - "cloud.integration.test.ts"
Cohesion: 0.19
Nodes (13): RFC-6238, app-updates Storage bucket (<channel>/<version>.zip + manifest.json), BUCKET, decide(), Decision, Manifest, manifestUrl(), nativeLineOf() (+5 more)

### Community 175 - "mfa.ts"
Cohesion: 0.20
Nodes (16): assurance(), clean(), enroll(), Enrolment, Factor, factors(), fail(), gateState (+8 more)

### Community 176 - "doc-xlsx.test.ts"
Cohesion: 0.13
Nodes (11): DOCX_MIME, XLSX_MIME, module, module, module, module, module, blocks (+3 more)

### Community 177 - "update-banner.tsx"
Cohesion: 0.27
Nodes (9): applyUpdateNow(), checkForUpdate(), LIMITS, onOtaState(), otaState, report(), scheduleChecks(), toast() (+1 more)

### Community 178 - "ipc · المستخلص الجاري 💲 (Interim payment certificate)"
Cohesion: 0.41
Nodes (12): delayPenalty · غرامات التأخير 💲 (Delay penalty), finalAccount · الحساب الختامي 💲 (Final account), ipc · المستخلص الجاري 💲 (Interim payment certificate), Contracts & payments pack «العقود والمستخلصات» 💲 (contracts), Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement), Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts), priceAdjust · فروق الأسعار 💲 (Price adjustment), rateAnalysis · تحليل سعر البند 💲 (Unit-rate build-up) (+4 more)

### Community 179 - "strict-check.mjs"
Cohesion: 0.21
Nodes (9): base, BASELINE, explicitAny(), now, posix(), problems, ROOT, strictErrors() (+1 more)

### Community 180 - "Issuer title block «خرطوشة»"
Cohesion: 0.20
Nodes (7): Issuer title block «خرطوشة», baseline(), fingerprint(), DocMeasurer, RevRow, TitleBlockData, TitleParty

### Community 181 - "ai-tools.spec.ts"
Cohesion: 0.22
Nodes (3): CASES, FORMS, ANSWER

### Community 183 - "OTA.md — live web updates"
Cohesion: 0.60
Nodes (3): OTA.md — live web updates, @capgo/capacitor-updater plugin (CapacitorUpdater, manual mode), Settings → التحديثات الفورية (active bundle, status, manual check)

### Community 184 - "The website (Cloudflare Pages)"
Cohesion: 0.33
Nodes (5): Custom domain (engspace.org), One-time setup (owner), The public page, The website (Cloudflare Pages), What the workflow also does

### Community 185 - "tool-projects.ts"
Cohesion: 0.47
Nodes (5): KEY(), loadProjects(), SignRole, storeProjects(), ToolParty

### Community 187 - "update-banner.test.ts"
Cohesion: 0.40
Nodes (4): apply, find(), flat(), ready

## Ambiguous Edges - Review These
- `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Technical office pack «المكتب الفني» (office)` → `Tools tab ToolsTab (Today strip, search, «الأخيرة», packs)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)` → `Simple mode «وضع مبسّط» (one colloquial question per screen)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement)` → `Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 5: vector backend and wave-2 tools` → `takeoffSheet · كشف الحصر (Measurement / take-off sheet)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references

## Knowledge Gaps
- **10 isolated node(s):** `PackageDescription`, `RFC-6238`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }`, `Job views count once per member per job per day` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1216 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — EngSpace project memory` connect `Project Rules (CLAUDE.md)` to `Roles, Taxonomy & Tabs`, `App Shell & Push Client`, `updater.ts`, `Feed & Detail Screens`, `EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md)`, `Concrete Take-off Tool`, `AI Proxy (ai-chat)`, `AI CV Review & Redaction`, `README, CI & Live Preview`, `CV Hiring Panel`, `PHASE2.md — Supabase (Frankfurt) and Capacitor 8`, `Push Delivery (FCM/APNs)`, `Rebuilt CV Draft UI`, `update-banner.tsx`, `Media Upload Function`, `ai-tools.spec.ts`, `Android MainActivity`, `OTA.md — live web updates`, `Smart Engineer Docs`, `vitest`, `Native Glue & Sharing`, `Native Camera Flow`, `Brand Mark Rendering`, `Tool Registry & Gate`, `CV HR Assessment`, `Deploy DB Triggers`, `Post Author Controls`, `Release Workflow Inputs`, `Prototype Migration Docs`, `Test Account Seeder`, `config.ts`, `Security Docs`, `Admin Cloud Adapter`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `RFC-6238`, `./tsconfig.json` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Roles, Taxonomy & Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.04711246200607903 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `Roles, Taxonomy & Tabs`, `Tool Screens & UI Kit`, `v24.test.ts`, `App Shell & Push Client`, `qto-calc.ts`, `Feed & Detail Screens`, `MEP & Cable Tools`, `Rebar BBS & Cutting`, `Concrete Take-off Tool`, `Site Diary & Permits`, `Dev Dependencies`, `AI Proxy (ai-chat)`, `QA/QC Checklists`, `Row Mapping & Hydrate`, `Level Book Tool`, `Trade Kit Calculator`, `AI CV Review & Redaction`, `Push Delivery (FCM/APNs)`, `AssistantScreen.tsx`, `design-docs.test.ts`, `cloud.integration.test.ts`, `mfa.ts`, `Rebuilt CV Draft UI`, `doc-xlsx.test.ts`, `Media Upload Function`, `hardening.test.ts`, `updater-flow.test.ts`, `landing.test.ts`, `update-banner.test.ts`, `post-author.test.ts`, `Native Glue & Sharing`, `Native Camera Flow`, `Image Compression`, `publish.mjs`, `i18n Build & Vitest Config`, `PDF Writer`, `Net Pay & Offers`, `CV HR Assessment`, `templates.tsx`, `palette.test.ts`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `Smoke Render Tests`, `ipc.tsx`, `Company Scorecard UI`, `rc-section.tsx`, `lucide-react`, `Security Docs`, `register.tsx`, `numInputParse`, `doc-controls.test.ts`, `boq-ui.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Identity, Auth & Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.058678611422172455 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._