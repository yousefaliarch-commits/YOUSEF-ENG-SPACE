# Graph Report - yousef-eng-space  (2026-11-21)

## Corpus Check
- 434 files · ~696,707 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 99 file(s) not represented in the graph (top: .tsv 61, .xml 12, (none) 8)

## Summary
- 4940 nodes · 15570 edges · 194 communities (151 shown, 43 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 707 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3cccdc9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tabs.tsx
- auth.tsx
- ui/kit.tsx
- App Shell & Push Client
- Phase 5: vector backend and wave-2 tools
- Moderation & Admin Console
- updater.ts
- voice-parse.ts
- MEP & Cable Tools
- Panel
- Rebar BBS & Cutting
- Supabase Cloud Client
- CV Audit Engine
- CV Parsing & Extraction
- drafting.tsx
- concrete.tsx
- tools/site-calc.ts
- PDF Page Layout
- Push Notifications Schema
- SalaryInsight.tsx
- Content Schema (Posts, Jobs)
- Profiles & Moderation Schema
- Project Rules (CLAUDE.md)
- devDependencies
- .p
- CV Rebuild & Translate
- AI Proxy (ai-chat)
- Prototype Migration Generator
- Verification Flow
- PUSH.md — push notifications
- QA/QC Checklists
- Row Mapping & Hydrate
- chrome.tsx
- Level Book Tool
- Trade Kit Calculator
- AI CV Review & Redaction
- MIGRATION.md — Phase 1 prototype migration
- CV Hiring Panel
- model.ts
- CapApp-SPM README (Capacitor SPM host package)
- CI Workflow Steps
- vitest
- Push Delivery (FCM/APNs)
- Text Guard (Language Filter)
- AppDelegate
- dependencies
- render.ts
- Release Builds Workflow
- cv-panel.test.ts
- Media Upload Function
- Test React Stubs
- hardening.test.ts
- palette.test.ts
- MainActivity.java
- helpers.ts
- Seed Accounts Workflow
- Salary Explorer Schema
- npm Scripts
- landing.test.ts
- AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)
- numInputParse
- Search Index
- harness.ts
- initNative
- boq-ui.tsx
- Native Camera Flow
- Image Compression
- Media Privacy Schema
- Security Armor Schema
- helpers.ts
- Deploy DB Steps
- i18n.ts
- OCR & Vendor Loading
- i18n Build & Vitest Config
- Migration Analyzer Script
- Messaging Schema
- Brand Mark Rendering
- stack.tsx
- bbs.tsx
- i18n String Extractor
- PDF Writer
- Support Tickets Schema
- Net Pay & Offers
- CV HR Assessment
- DocMeasurer
- DocLang
- cloud.integration.test.ts
- Scorecards & Raises Schema
- Realtime Feed Schema
- ui-style.ts
- env
- Gradual Typing Scripts
- templates.tsx
- ai-service.ts
- Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)
- Smoke Render Tests
- TypeScript Config
- phone-server.mjs
- ipc-calc.ts
- Author controls on posts (v0.1.9)
- Verification Schema
- Company Scorecard UI
- UI Crawler Tool
- Android Test Stubs
- ai-tools.spec.ts
- Release Workflow Inputs
- AssistantScreen.tsx
- raises.ts
- test-accounts.mjs
- client.ts
- Num
- friendly
- AI Response Schemas
- Publish Workflow Inputs
- Admin Cloud Adapter
- Publish Workflow Env
- xlsx.ts
- register.tsx
- tr
- Publish Workflow Steps
- qto.tsx
- Publish Job Config
- Node TS Config
- public.profiles
- Checklists E2E
- Publish Workflow Header
- host.tsx
- Versioned code profiles (<code>-<scope>@<n>)
- Broadcast Input
- rc-calc.ts
- doc-kit.test.ts
- qto-calc.ts
- Notes Input
- Push Body Input
- Push Title Input
- Push Title (EN) Input
- 20261020000026_ai.sql
- pgTAP Push Tests
- pgTAP Media Tests
- pgTAP Author Tests
- pgTAP Security Tests
- pgTAP Moderation Tests
- pgTAP Verification Tests
- pgTAP Admin Delete Tests
- Brand Polygon Data
- Product scope review (§9.3)
- SECURITY.md — security and media rules
- export-parity.test.ts
- admin_email
- mfa.ts
- toolbox.tsx
- vite.config.ts
- ipc · المستخلص الجاري 💲 (Interim payment certificate)
- strict-check.mjs
- package.json
- ref_node_fs
- motion.test.ts
- v24.test.ts
- The website (Cloudflare Pages)
- rest.ts
- v21.test.ts
- Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)
- native-camera-config.test.ts
- capacitor.config.ts
- live-update-ui.test.ts
- post-author.test.ts

## God Nodes (most connected - your core abstractions)
1. `AppView()` - 166 edges
2. `Num()` - 151 edges
3. `CLAUDE.md — EngSpace project memory` - 115 edges
4. `Panel()` - 93 edges
5. `supabase()` - 87 edges
6. `vitest` - 83 edges
7. `Secondary()` - 75 edges
8. `Primary()` - 72 edges
9. `react` - 64 edges
10. `lucide-react` - 60 edges

## Surprising Connections (you probably didn't know these)
- `2. Omnisearch (Ctrl/⌘K)` --references--> `AppView()`  [INFERRED]
  docs/OMNISEARCH-VOICE.md → src/app/AppView.tsx
- `Tools i18n plan (Arabic in code, English TSV 52–61, split tool dictionary)` --references--> `DICT`  [INFERRED]
  docs/TOOLS-BLUEPRINT.md → src/i18n/i18n.ts
- `ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة)` --references--> `ExportBar()`  [INFERRED]
  docs/TOOLS-BLUEPRINT.md → src/ui/kit.tsx
- `Raise & inflation tracker (raise_reports, market_raises(), inflation_rates)` --references--> `public.market_raises()`  [INFERRED]
  CLAUDE.md → supabase/migrations/20261004000012_scorecards_raises.sql
- `private.kick_push() + engspace-push-sweep cron` --references--> `private.kick_push()`  [INFERRED]
  docs/PUSH.md → supabase/migrations/20261009000017_push_notifications.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data-loss prevention mechanisms (§8.3)** — docs_tools_blueprint_tool_document_store, docs_tools_blueprint_tool_merge, docs_tools_blueprint_write_path_pacing, docs_tools_blueprint_write_ahead_journal, docs_tools_blueprint_tombstone_delete_undo, docs_tools_blueprint_size_guards, docs_tools_blueprint_issue_freeze, docs_tools_blueprint_storage_meter [EXTRACTED 1.00]
- **Diary self-assembly from today's documents (no double entry)** — docs_tools_blueprint_sitediary, docs_tools_blueprint_concrete, docs_tools_blueprint_toolboxtalk, docs_tools_blueprint_workpermit, docs_tools_blueprint_checklists, docs_tools_blueprint_no_double_entry [EXTRACTED 1.00]
- **Money kept away from supervisors at three levels (registry, schemas, tab / address / chunk)** — docs_tools_blueprint_tool_registry, docs_tools_blueprint_role_gating, docs_tools_blueprint_no_money_guard, docs_tools_blueprint_lazy_chunks, docs_tools_blueprint_tools_tab [EXTRACTED 1.00]
- **OTA live web update flow (publish → app-updates bucket → check → banner → broadcast)** — github_workflows_publish_update, scripts_ota_publish, docs_ota_app_updates_bucket, src_native_updater_core, src_native_updater, src_ui_update_banner_updatebanner, docs_ota_broadcast_app_update [EXTRACTED 1.00]
- **Deletion leaves nothing behind (content, authorship and media go together)** — claude_admin_delete_content, claude_delete_my_post, docs_phase2_account_deletion, docs_security_media_janitor [INFERRED 0.85]
- **Secrets stay server-side (function secrets / Vault / GitHub secrets, never the client or repo)** — docs_phase2_publishable_key_rule, docs_ai_gemini_api_key, docs_push_fcm_setup, docs_push_apns_setup, docs_push_vault_wake_setup, docs_security_media_janitor, docs_phase2_purge_verification_cron [INFERRED 0.85]

## Communities (194 total, 43 thin omitted)

### Community 0 - "tabs.tsx"
Cohesion: 0.04
Nodes (130): bo(), CAT_DESC, catName(), CATS, co(), COMPANIES, company(), CompanyLogo() (+122 more)

### Community 1 - "auth.tsx"
Cohesion: 0.05
Nodes (111): divTitle(), ACCOUNT_KEY, ageError(), anonTitle(), authorOf(), checkPassword(), cleanName(), confirmError() (+103 more)

### Community 2 - "ui/kit.tsx"
Cohesion: 0.07
Nodes (89): Adding a screen, The one rule: depth has a meaning, fmtNum(), diaryCarryOver(), diaryDaysSince(), AiFillCard(), Editor(), Editor() (+81 more)

### Community 3 - "App Shell & Push Client"
Cohesion: 0.03
Nodes (140): Modules written by hand in Phase 1 (main, App, TopBar, ScreenLoading, vendor, ocr, i18n), @capacitor/push-notifications, react, react-dom, AdminGate, AdminView, App(), ErrorBoundary (+132 more)

### Community 4 - "Phase 5: vector backend and wave-2 tools"
Cohesion: 0.08
Nodes (42): areaSchedule · جدول المساحات والاشتراطات (Area schedule, zoning & parking), bearingTest · قراءة اختبارات التحمل (CBR / DCP / plate-load reader), chwPipe · مواسير المياه المثلجة (Chilled-water pipe sizing), crewPlanner · تخطيط العمالة والمدة (Crew size & duration planner), curveSetOut · توقيع المنحنيات (Horizontal curve setting-out), detectors · توزيع الكواشف (Detector & call-point spacing), drainSize · مقاسات الصرف والتهوية (DFU drainage & vent sizing), ductSizer · مقاسات الدكت (Duct sizer, equal friction) (+34 more)

### Community 5 - "Moderation & Admin Console"
Cohesion: 0.06
Nodes (91): room(), ROOMS, GOVS, JOBS, NOTIFS0, POSTS0, PUB_KARIM, PUB_MONA (+83 more)

### Community 6 - "updater.ts"
Cohesion: 0.05
Nodes (60): OTA.md — live web updates, app-updates Storage bucket (<channel>/<version>.zip + manifest.json), @capgo/capacitor-updater plugin (CapacitorUpdater, manual mode), Settings → التحديثات الفورية (active bundle, status, manual check), rel(), base, bytes, dist (+52 more)

### Community 7 - "voice-parse.ts"
Cohesion: 0.11
Nodes (33): answerNumber(), applyAnswers(), Bilingual, defaultWaste(), FIELD, KIND_NAME, kindField(), LABELLED (+25 more)

### Community 8 - "MEP & Cable Tools"
Cohesion: 0.07
Nodes (57): acInstall · فحص تركيب التكييف (AC installation check), cableCheck · الكابل وهبوط الجهد (Cable & voltage-drop check), drainRun · مناسيب غرف التفتيش (Drain run invert schedule + sight rails), ac-site@1 (drain table, minimum slope, ρ), drain-metric@1 / drain-ipc@1 (minimum slopes), iec60364-2009@1 (factor tables with a verified flag per table), nfpa13-2022@1 (sprinkler limits), sprinklerCheck · توزيع وفحص الرشاشات (Sprinkler count & spacing check) (+49 more)

### Community 9 - "Panel"
Cohesion: 0.08
Nodes (70): CV report executive snapshot + collapsible action plan, posLabel(), day(), demoDirectory(), DirectorySection(), MemberDetail(), STAFF, TicketDetail() (+62 more)

### Community 10 - "Rebar BBS & Cutting"
Cohesion: 0.08
Nodes (46): bbs · جدول تفريد وقص الحديد (Bar bending schedule & 12 m cutting optimiser), Truck log «سجل الخلاطات» (pour-day ticket log), cubeLog · سجل مكعبات الخرسانة (Concrete cube register), lapLength · التماسك والوصلات (Development & lap length), Rebar pack (rebar), aci318-19@1 (ACI profile), bs8666-2020@1 (scheduling standard, typed laps), ecp203-2020-bbs@1 (rebar: radius rule, rounding, kg/m, Ld factors) (+38 more)

### Community 11 - "Supabase Cloud Client"
Cohesion: 0.08
Nodes (67): @capacitor/browser, supabase(), addComment(), addReview(), closeTicket(), companyScorecard(), contribute(), countJobView() (+59 more)

### Community 12 - "CV Audit Engine"
Cohesion: 0.05
Nodes (62): anyScope(), AR_PUNCT, AR_SLIPS, AR_WEAK_LEAD, auditCV(), bigOf(), cleanObject(), conjToPast() (+54 more)

### Community 13 - "CV Parsing & Extraction"
Cohesion: 0.06
Nodes (57): mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87), notWork(), analyseBullet(), AR_MASDAR_PAST, cleanPart(), CV_ACTION_AR, CV_ACTION_EN, CV_BULLET (+49 more)

### Community 14 - "drafting.tsx"
Cohesion: 0.14
Nodes (23): clamp(), COS, ISO_MAX_RATIO, ISO_MESH_MAX, ISO_VIEW, isoBox(), IsoDim, IsoGeom (+15 more)

### Community 15 - "concrete.tsx"
Cohesion: 0.09
Nodes (52): concrete · حصر وصب الخرسانة (Concrete take-off & pour planner), Striking, curing and cube-test calendar, Cold-joint guard A_max = Q_eff·t_cover/layer, ecp203-site@1 (concrete: waste, cubes, striking/curing, hourdi, logistics), CONC_ENGINE, CONC_KINDS, CONC_PROFILE, concCalendar() (+44 more)

### Community 16 - "tools/site-calc.ts"
Cohesion: 0.10
Nodes (38): Crew roster (kind crew, one per project), dayworkSheet · يوميات الأعمال الإضافية (Daywork sheet, no rates), heatStress · الإجهاد الحراري وحظر الظهيرة (Heat index & midday-ban planner), incident · الحوادث ومؤشرات السلامة (Incident report + TRIR/LTIFR), liftPlan · خطة الرفع المبسطة (Lift plan), ncr · تقرير عدم المطابقة (Non-conformance report), HSE & site management pack (hse), Phase 3: Site management (siteDiary, toolboxTalk + crew, workPermit, full Today strip) (+30 more)

### Community 17 - "PDF Page Layout"
Cohesion: 0.15
Nodes (48): Issuer title block «خرطوشة», Paged tables with «يُرحّل / ما قبله» carry-forward rows, Align, anchorX(), basisTable(), boxedText(), cellText(), checksTable() (+40 more)

### Community 18 - "Push Notifications Schema"
Cohesion: 0.06
Nodes (27): notifications_inbox, public.notifications, public.admin_warn(), public.inflation_rates, comments_notify, inflation_notify, notifications_a_en, notifications_category (+19 more)

### Community 19 - "SalaryInsight.tsx"
Cohesion: 0.20
Nodes (17): SalaryInsightCard(), X, offList(), TIP_KINDS, ToolTipCard(), X, cached(), DAY (+9 more)

### Community 20 - "Content Schema (Posts, Jobs)"
Cohesion: 0.09
Nodes (42): ballots_tally, comments_author, comments_count, comments_parent, comments_post, company_reviews_author, company_reviews_company, job_contacts_count (+34 more)

### Community 21 - "Profiles & Moderation Schema"
Cohesion: 0.11
Nodes (16): audit_log_at, private.id_of_ref(), private.item_mod, private.my_ref(), private.report_targets, public.admin_accounts(), public.admin_set_staff(), public.audit_log (+8 more)

### Community 22 - "Project Rules (CLAUDE.md)"
Cohesion: 0.06
Nodes (37): CLAUDE.md — EngSpace project memory, admin_accounts — mod_ref list with moderation fields only, admin_delete_content() — permanent delete by admins, admin_directory — admins-only member directory keyed by pid, app.engspace:// deep-link scheme (open/<type>/<id>, auth-callback), Company scorecards (company_ratings, company_scorecard()), delete_my_post() — removes replies, reactions, authorship and the image, edit_my_post() — own post, counts only real text changes (+29 more)

### Community 23 - "devDependencies"
Cohesion: 0.07
Nodes (29): devDependencies, autoprefixer@^10.6.1, @babel/types@^8.0.6, @capacitor/android@8.5.2, @capacitor/assets@^3.0.5, @capacitor/ios@8.5.2, @playwright/test@1.63.0, postcss@^8.5.28 (+21 more)

### Community 24 - ".p"
Cohesion: 0.22
Nodes (28): basisBlock(), block(), checksTable(), clean(), coreXml(), dataTable(), documentXml(), esc() (+20 more)

### Community 25 - "CV Rebuild & Translate"
Cohesion: 0.11
Nodes (41): DESIGN_BY_DISC, TASK_GENERIC, trackL2(), CV_FLUFF_TEST, CV_MILITARY_RE, addMarks(), DRAFT_NOTE, HEAD (+33 more)

### Community 26 - "AI Proxy (ai-chat)"
Cohesion: 0.11
Nodes (25): AiRequest, Chunk, CORS, DEFAULT_MODEL, ERRORS, FALLBACK_MODELS, Feature, geminiBody() (+17 more)

### Community 27 - "Prototype Migration Generator"
Cohesion: 0.05
Nodes (37): asm, checker, cycles, declMod, dedent(), dfs(), DROP, dropped (+29 more)

### Community 28 - "Verification Flow"
Cohesion: 0.10
Nodes (46): discForDivision(), discName(), divConflict(), divisionForDisc(), DIVISIONS, divOf(), AV, docSize() (+38 more)

### Community 29 - "PUSH.md — push notifications"
Cohesion: 0.18
Nodes (16): admin_message — team messages arrive as «فريق EngSpace», Support tickets (support_tickets / ticket_messages, private support bucket), PUSH.md — push notifications, Apple Push Notification service (APNs, iOS), Firebase Cloud Messaging (FCM, Android), Inflation month notice, private.kick_push() + engspace-push-sweep cron, Private message notices (+8 more)

### Community 30 - "QA/QC Checklists"
Cohesion: 0.16
Nodes (33): CATEGORIES, categoryOf(), cleanTemplate(), Custom, customKey(), isUserTemplate(), itemCount(), itemsOf() (+25 more)

### Community 31 - "Row Mapping & Hydrate"
Cohesion: 0.13
Nodes (32): addPost(), latestShares(), loadAll(), postById(), postJob(), withMedia(), mediaUrl(), authorFields() (+24 more)

### Community 32 - "chrome.tsx"
Cohesion: 0.06
Nodes (60): Module ↔ prototype part map, lucide-react, DESK_MIN, DeskNav(), SPLIT_MIN, useDesk(), useMedia(), TopBar() (+52 more)

### Community 33 - "Level Book Tool"
Cohesion: 0.19
Nodes (21): Pure tool engines (src/domain/tools/*) + lazy tool screens, Two-peg collimation test «اختبار الوتدين», levelBook · دفتر الميزانية (Levelling field book + two-peg test), survey-eng@1 (allowance presets, two-peg limit), has(), LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust() (+13 more)

### Community 34 - "Trade Kit Calculator"
Cohesion: 0.12
Nodes (33): Material request «طلب خامات» (MR, kind materialRequest), eg-site@1 (trade kit: mixes, waste, hollow-block mortar, sheet size), Trade-kit tiles beyond civil (electrician, plumber, drywall, structural steel), tradeKit · حاسبة الصنايعي (Trade quick kit), CALIB_DEFAULT, HOLLOW_MORTAR_L_M2, PLASTER_PRESETS, STEEL_SECTIONS (+25 more)

### Community 35 - "AI CV Review & Redaction"
Cohesion: 0.09
Nodes (35): 1. Tools by discipline, 2. Omnisearch (Ctrl/⌘K), 4. CV review (AI side), 5. Voice take-off, Tests, v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off, AiCv, AIX (+27 more)

### Community 36 - "MIGRATION.md — Phase 1 prototype migration"
Cohesion: 0.08
Nodes (24): EngSpace — anonymous career and salary network for Egyptian engineers, MIGRATION.md — Phase 1 prototype migration, Dead logo controls removed after the brand board, pdf.js CVE-2024-4367 fix (getDocument with isEvalSupported: false), Phase 1: single-file prototype → bundled Vite + React + TypeScript, v24 single-file prototype (27 script parts, one global scope), Laptop + phone live preview (npm run live, port 8770), name (+16 more)

### Community 37 - "CV Hiring Panel"
Cohesion: 0.11
Nodes (31): NO_DICT, discL2(), ETERM(), posL2(), FIGURE, gradeIntel, gradeOf(), GradeTier (+23 more)

### Community 38 - "model.ts"
Cohesion: 0.06
Nodes (53): ProjectSnap, SignRole, ToolProject, BasisRow, DocRenderResult, DocRow, DocSection, DocStatus (+45 more)

### Community 40 - "CI Workflow Steps"
Cohesion: 0.08
Nodes (32): needs, runs-on, steps, runs-on, steps, runs-on, steps, needs (+24 more)

### Community 41 - "vitest"
Cohesion: 0.08
Nodes (13): vitest, auth, calls, base, pkg, names, names, names (+5 more)

### Community 42 - "Push Delivery (FCM/APNs)"
Cohesion: 0.12
Nodes (23): apnsBody(), ApnsKey, apnsSender(), b64url(), ClaimedPush, deliver(), DeviceToken, enc (+15 more)

### Community 43 - "Text Guard (Language Filter)"
Cohesion: 0.11
Nodes (31): AR_HATE, AR_HATE_ADDR, AR_INSULTS, AR_MILD, AR_NAME_EXCEPTIONS, AR_PREFIX, AR_PROFANITY, AR_PROFANITY_PHRASES (+23 more)

### Community 44 - "AppDelegate"
Cohesion: 0.08
Nodes (4): Capacitor, AppDelegate, SceneDelegate, UIKit

### Community 45 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @capacitor/browser@8.0.5, @capacitor/camera@8.2.5, @capacitor/haptics@8.0.2, @capacitor/keyboard@8.0.6, @capacitor/preferences@8.0.1, @capacitor/push-notifications@8.1.3, @capacitor/share@8.0.3 (+23 more)

### Community 46 - "render.ts"
Cohesion: 0.06
Nodes (41): Colophon (technical data only: profiles, engines, SHA-256), DocPreview (same display list and layout object as export), Ctx, DrawOptions, drawPage(), fitRect(), imageKey(), encodeIndexed() (+33 more)

### Community 47 - "Release Builds Workflow"
Cohesion: 0.09
Nodes (30): runs-on, steps, GH_REPO, GH_TOKEN, GOOGLE_SERVICES_JSON, TAG, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY (+22 more)

### Community 48 - "cv-panel.test.ts"
Cohesion: 0.14
Nodes (19): bullet(), coreXml(), documentXml(), DOCX_MIME, draftDocx(), esc(), headingOf(), para() (+11 more)

### Community 49 - "Media Upload Function"
Cohesion: 0.11
Nodes (31): ascii(), check(), Chunk, concat(), CORS, handle(), json(), removeAll() (+23 more)

### Community 50 - "Test React Stubs"
Cohesion: 0.07
Nodes (10): jsx(), jsxDEV(), jsxs(), Component, createContext(), c, Fragment, lazies (+2 more)

### Community 51 - "hardening.test.ts"
Cohesion: 0.06
Nodes (39): ToolDoc envelope (kind, v, lang, engine, frozen, profile, body, photos, log, audit), DOC_GUARD, DocWbs, headerOf(), isToolDoc(), isToolTomb(), jsonbBytes(), LOG_CAP (+31 more)

### Community 52 - "palette.test.ts"
Cohesion: 0.07
Nodes (52): Site tools (concrete, rebar, masonry, units), Tools suite wave 1 (v0.28.0), Salary & offer tools (offer, net, compare, script, raise, path, contract, move, inflation), isPaletteKey(), openPalette(), paletteHint(), PaletteHost(), PalettePanel (+44 more)

### Community 53 - "MainActivity.java"
Cohesion: 0.11
Nodes (4): MainActivity, WebViewListener, Viewport meta disabling pinch / double-tap zoom, EngViewController

### Community 54 - "helpers.ts"
Cohesion: 0.16
Nodes (15): ROLES, TABS, ADMIN_PW, demoAs(), newMember(), noClipped(), noCrash(), noOverflow() (+7 more)

### Community 55 - "Seed Accounts Workflow"
Cohesion: 0.07
Nodes (26): default, description, options, required, type, PROJECT_REF, SEED_API_URL, SUPABASE_ACCESS_TOKEN (+18 more)

### Community 56 - "Salary Explorer Schema"
Cohesion: 0.10
Nodes (19): private.authorship, public.is_mine(), public.salary_bands(), public.salary_shares, salary_shares_author, salary_shares_cell, public.delete_my_account(), private.has_shared() (+11 more)

### Community 57 - "npm Scripts"
Cohesion: 0.07
Nodes (28): scripts, build, cap:sync, check, db:admin, db:env, db:functions, db:reset (+20 more)

### Community 58 - "landing.test.ts"
Cohesion: 0.19
Nodes (17): AUTH_PARAMS, entryView, kgPerM(), tradeBarSpacing(), clamp(), clampSlab(), f(), POUR_DEFAULTS (+9 more)

### Community 59 - "AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)"
Cohesion: 0.12
Nodes (17): AI.md — «المهندس الذكي» Smart Engineer (v0.29.0), private.ai_config (enabled, daily_limit, model, model_light), ai_rate() — 👍 / 👎 per feature, ai_take() — takes one unit (money:false for supervisors), ai_tokens() — token counts only, Daily AI allowance (25 per Cairo day per member), Google Gemini API (streamGenerateContent, SSE), Proposed AI next steps (admin usage panel, prompt A/B, proactive tips, photo → NCR) (+9 more)

### Community 60 - "numInputParse"
Cohesion: 0.08
Nodes (34): ResultCard (hero number, pictograms, «طريقة الحساب»), sizeDucts(), toLs(), lvlTrace(), Body, build(), calc(), limitsOf() (+26 more)

### Community 61 - "Search Index"
Cohesion: 0.19
Nodes (22): AR_INDIC, AR_PREFIXES, AR_SUFFIXES, bigrams(), buildSearchIndex(), damerau(), dice(), indexDoc() (+14 more)

### Community 62 - "harness.ts"
Cohesion: 0.08
Nodes (10): C, html, modules, sources, src, localStorage, store, names (+2 more)

### Community 63 - "initNative"
Cohesion: 0.25
Nodes (8): @capacitor/app@8.1.2, @capacitor/splash-screen@8.0.2, @capacitor/status-bar@8.0.4, @capacitor/app, @capacitor/splash-screen, @capacitor/status-bar, back(), initNative()

### Community 64 - "boq-ui.tsx"
Cohesion: 0.08
Nodes (50): colIndex(), decode(), ReadSheet, readXlsx(), textOf(), applyMeasured(), BOQ_ENGINE, BoqField (+42 more)

### Community 65 - "Native Camera Flow"
Cohesion: 0.13
Nodes (21): @capacitor/filesystem@8.1.4, @capacitor/filesystem, PHOTO_NOTES, useCameraShot(), cameraAccess(), cameraLinked(), isCancel(), isDenied() (+13 more)

### Community 66 - "Image Compression"
Cohesion: 0.16
Nodes (17): canEncodeWebp(), compressCanvas(), Compressed, compressImage(), dataUrlToBlob(), decode(), Decoded, encode() (+9 more)

### Community 67 - "Media Privacy Schema"
Cohesion: 0.13
Nodes (15): private.photo_guard — profile photo must be the member's own avatar upload, media_uploads_open, media_uploads_owner, posts_z_media, private.kick_media(), private.media_uploads, private.photo_guard(), private.post_media_in() (+7 more)

### Community 68 - "Security Armor Schema"
Cohesion: 0.11
Nodes (22): public.member_state, comments_a_rate, company_reviews_a_rate, job_views_account, jobs_a_rate, member_state_a_keys, messages_a_rate, posts_a_rate (+14 more)

### Community 69 - "helpers.ts"
Cohesion: 0.19
Nodes (14): CRASH, DOMAIN, publish(), settle(), tab(), layer(), openFirstPost(), authorFlow() (+6 more)

### Community 70 - "Deploy DB Steps"
Cohesion: 0.09
Nodes (23): env, runs-on, steps, ADMIN_EMAIL, APNS_KEY_ID, APNS_KEY_P8, APNS_TEAM_ID, FCM_SERVICE_ACCOUNT (+15 more)

### Community 71 - "i18n.ts"
Cohesion: 0.13
Nodes (32): AR_CHARS, arResidue(), DICT, elText(), fillPattern(), freeText(), I18N, I18N_ATTR_SEL (+24 more)

### Community 72 - "OCR & Vendor Loading"
Cohesion: 0.13
Nodes (16): maskMoney(), ChooserState, IMAGE_ERRORS, imageAccess(), OPTIONS, PhotoChooser(), scanImageForMoney(), loadImageEl() (+8 more)

### Community 73 - "i18n Build & Vitest Config"
Cohesion: 0.15
Nodes (15): buildDict(), [cmd = "build", ...args], contentKeys(), kid(), lines(), loadExtra(), loadKeys(), loadTr() (+7 more)

### Community 74 - "Migration Analyzer Script"
Cohesion: 0.10
Nodes (19): brandView, checker, declOf, fs, fwdEval, host, inFn(), out (+11 more)

### Community 75 - "Messaging Schema"
Cohesion: 0.16
Nodes (18): messages_thread, private.in_thread(), private.messages, private.threads, public.my_threads(), public.send_message(), public.set_thread_identity(), public.start_thread() (+10 more)

### Community 76 - "Brand Mark Rendering"
Cohesion: 0.10
Nodes (19): E+S brand mark (src/ui/brand-mark.json) and icon generation, data, markPolys(), markSvg(), pts(), C, { chromium }, font (+11 more)

### Community 77 - "stack.tsx"
Cohesion: 0.09
Nodes (57): POST_TYPES, REACTIONS, AUTHOR_FIELDS, displayName(), honorific(), pickAuthor(), ckey(), reasonsFor() (+49 more)

### Community 78 - "bbs.tsx"
Cohesion: 0.17
Nodes (24): BBS_DIAMETERS, BBS_GRADES, BBS_SHAPES, bbsSummary(), cutPieces(), gradeOf(), shapeOf(), barPaths() (+16 more)

### Community 79 - "i18n String Extractor"
Cohesion: 0.13
Nodes (15): i18n extract / build scripts ported to Node, byKind, hasProp(), inRegexCtx(), inType(), isBilingual(), isContent(), keys (+7 more)

### Community 80 - "PDF Writer"
Cohesion: 0.20
Nodes (9): enc, num(), pdfDate(), PdfImage, PdfInfo, PdfPage, PdfPlacement, pdfString() (+1 more)

### Community 81 - "Support Tickets Schema"
Cohesion: 0.17
Nodes (11): public.admin_directory(), public.admin_directory_set_staff(), public.admin_message(), public.open_ticket(), public.reply_ticket(), public.staff_reply_ticket(), public.staff_set_ticket_status(), public.staff_tickets() (+3 more)

### Community 82 - "Net Pay & Offers"
Cohesion: 0.29
Nodes (13): evaluateOffer(), MEDICAL_VALUE, offerNet(), offerPackage(), percentileOf(), round500(), annualTax(), BRACKET_LOSS (+5 more)

### Community 83 - "CV HR Assessment"
Cohesion: 0.16
Nodes (16): CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, CV_UNIS, candidateGender(), egyptian(), EMPLOYERS, hrAssessment (+8 more)

### Community 86 - "cloud.integration.test.ts"
Cohesion: 0.09
Nodes (13): Yousef — owner (architect / BIM coordinator), first admin, RFC-6238, bootstrap_admin() — first administrator, st, out, env, r, st (+5 more)

### Community 87 - "Scorecards & Raises Schema"
Cohesion: 0.17
Nodes (10): company_ratings_company, private.drop_raise_reports(), private.raise_rate_limit(), public.company_ratings, public.company_scorecard(), public.market_raises(), public.raise_reports, raise_reports_a_limit (+2 more)

### Community 88 - "Realtime Feed Schema"
Cohesion: 0.19
Nodes (13): comments_feed_new, comments_moderation, company_reviews_moderation, jobs_moderation, posts_moderation, private.feed_comment_new(), private.feed_moderation(), private.profile_ping() (+5 more)

### Community 89 - "ui-style.ts"
Cohesion: 0.12
Nodes (21): Colour, How it is built, How it was verified (v0.41), Interaction, Performance, «ناعم» — the Soft UI style, OPTIONS, UiStylePicker() (+13 more)

### Community 90 - "env"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, env, if, runs-on, steps, BRANCH (+35 more)

### Community 91 - "Gradual Typing Scripts"
Cohesion: 0.15
Nodes (10): fs, path, ts, walk(), files, fs, path, edit() (+2 more)

### Community 92 - "templates.tsx"
Cohesion: 0.08
Nodes (60): REV_MAX_LEN, Envelope, ParsedTemplateFile, parseTemplateFile(), Sign, TEMPLATE_FILE_PROBLEM, TemplateFileProblem, newDocId() (+52 more)

### Community 93 - "ai-service.ts"
Cohesion: 0.13
Nodes (20): ai_quota() — remaining units for the quota chip, useQuota(), AiAsk, AiError, AiFeature, AiMsg, AiResult, ask() (+12 more)

### Community 94 - "Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)"
Cohesion: 0.07
Nodes (31): EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md), cvreview · مراجعة السيرة الذاتية (CV review, the only HR tool), DocList (windowed list of saved documents), ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة), Salary & offers pack «الراتب والعروض» 💲 (money), Phase 0 ✅: research briefs and groundwork (num-input, share-cancel, glyph preload), Phase 1: Foundation (registry/gate, Tools tab, store, projects, UI kit, document kit, QA/QC), Phase L3: optional native batch (nativeLine 3: geolocation, text-to-speech, Downloads) (+23 more)

### Community 95 - "Smoke Render Tests"
Cohesion: 0.14
Nodes (8): crawl(), fakeEvent, handlerErrors, render(), seen, setups, signIn(), signInAs()

### Community 96 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noImplicitAny (+6 more)

### Community 97 - "phone-server.mjs"
Cohesion: 0.18
Nodes (11): args, buildStamp(), COMPRESS, DIST, LAN, NO_STORE, PORT, resolveFile() (+3 more)

### Community 98 - "ipc-calc.ts"
Cohesion: 0.15
Nodes (16): computeIpc(), fin(), fmt(), IPC_ENGINE, IpcDeduction, IpcIssue, IpcItem, IpcLine (+8 more)

### Community 99 - "Author controls on posts (v0.1.9)"
Cohesion: 0.40
Nodes (5): posts_feed_edit, private.feed_post_edit(), public.delete_my_post(), public.edit_my_post(), public.my_posts()

### Community 100 - "Verification Schema"
Cohesion: 0.24
Nodes (7): public.decide_verification(), public.submit_verification(), public.verification_orphans(), public.verification_requests, public.withdraw_verification(), verification_one_pending, verification_queue

### Community 101 - "Company Scorecard UI"
Cohesion: 0.35
Nodes (10): Agg, demoScorecard(), FactorId, factorOf(), FACTORS, nearest(), SCORE_MIN, scorecardOf() (+2 more)

### Community 102 - "UI Crawler Tool"
Cohesion: 0.31
Nodes (10): act(), auditArabic(), crawlState(), elements(), handled(), reach(), report(), reset() (+2 more)

### Community 104 - "ai-tools.spec.ts"
Cohesion: 0.12
Nodes (5): CASES, FORMS, ANSWER, composer(), EXIF

### Community 105 - "Release Workflow Inputs"
Cohesion: 0.17
Nodes (10): tag, name, on, workflow_dispatch, permissions, contents, default, description (+2 more)

### Community 106 - "AssistantScreen.tsx"
Cohesion: 0.19
Nodes (17): AssistantScreen(), ChatMsg, key(), load(), save(), STARTERS, toolsNamed(), turnsFor() (+9 more)

### Community 107 - "raises.ts"
Cohesion: 0.67
Nodes (5): addMonths(), cumulative(), monthsBetween(), realHistory(), Series

### Community 108 - "test-accounts.mjs"
Cohesion: 0.09
Nodes (18): Playwright e2e suite (iPhone 15 + Pixel 7 profiles, E2E_LIVE / E2E_WEBKIT), Seeded test accounts (@engspace.test, ten roles), chromiumUse, { defaultBrowserType: _a, ...iphoneNoEngine }, { defaultBrowserType: _b, ...pixel }, { defaultBrowserType: _c, ...desktop }, iphone, env (+10 more)

### Community 109 - "client.ts"
Cohesion: 0.22
Nodes (6): @capacitor/core@8.5.2, @supabase/supabase-js@2.117.2, @capacitor/core, @supabase/supabase-js, nativeStorage, SUPABASE_URL

### Community 110 - "Num"
Cohesion: 0.09
Nodes (66): BACKEND, isCloud(), rentFor(), INFLATION, INFLATION_SOURCE, lastYear(), monthKey(), concreteMaterials() (+58 more)

### Community 111 - "friendly"
Cohesion: 0.15
Nodes (17): currentPersona(), e164(), friendly(), markContacted(), myProfile(), saveProfile(), setAvatar(), setPassword() (+9 more)

### Community 112 - "AI Response Schemas"
Cohesion: 0.28
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
Cohesion: 0.07
Nodes (46): agrees(), BUILTIN_FMT, cellsOf(), cellXml(), clean(), colName(), COLOR, coreXml() (+38 more)

### Community 117 - "register.tsx"
Cohesion: 0.11
Nodes (32): addDays(), num(), daysBetween(), DONE, isDate(), REG_ENGINE, REG_KINDS, RegDoc (+24 more)

### Community 118 - "tr"
Cohesion: 0.17
Nodes (15): checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections), jpegsOf(), isEn(), tr(), A4, C, dataUrlBytes(), inspectionPdf() (+7 more)

### Community 119 - "Publish Workflow Steps"
Cohesion: 0.25
Nodes (8): steps, if, name, run, uses, with, cache, node-version

### Community 120 - "qto.tsx"
Cohesion: 0.15
Nodes (21): XCell, XFmt, XRow, blank(), blankLine(), Body, build(), compute() (+13 more)

### Community 121 - "Publish Job Config"
Cohesion: 0.29
Nodes (7): CHANNEL, PROJECT_REF, SUPABASE_ACCESS_TOKEN, jobs, publish, env, runs-on

### Community 122 - "Node TS Config"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, allowImportingTsExtensions, types, extends, include

### Community 123 - "public.profiles"
Cohesion: 0.11
Nodes (22): authorship_account, on_auth_user_created, private.author_snapshot(), private.can_act(), private.handle_new_user(), private.profile_guard(), private.touch_updated_at(), profiles_guard (+14 more)

### Community 124 - "Checklists E2E"
Cohesion: 0.60
Nodes (4): build(), builder(), downloadPdf(), insp()

### Community 125 - "Publish Workflow Header"
Cohesion: 0.33
Nodes (5): concurrency, name, on, permissions, contents

### Community 126 - "host.tsx"
Cohesion: 0.06
Nodes (71): Decisions worth knowing, The editable workstation (v0.39) — architectural report, Verification, What changed, by layer, applyDocControls(), cleanRev(), cleanSign(), cleanTitleExtras() (+63 more)

### Community 127 - "Versioned code profiles (<code>-<scope>@<n>)"
Cohesion: 0.17
Nodes (12): Calculation-basis block {k:'basis'} on every calculation PDF, hotConcrete · حرارة الخرسانة صيفًا (Fresh-concrete temperature planner), Owner actions (code texts and reviewers), Structural & concrete pack (structural), ecp-fire@0 (disabled ECP fire profile), eg-tax@2026-10 (VAT, withholding, stamp; dated, sourced rates), rampAccess · المنحدرات والإتاحة (Ramps & accessibility), rcSection · مقاومة القطاعات الخرسانية (RC section check, ECP 203) (+4 more)

### Community 128 - "Broadcast Input"
Cohesion: 0.40
Nodes (5): default, description, required, type, broadcast

### Community 129 - "rc-calc.ts"
Cohesion: 0.08
Nodes (35): TraceStep, Check, AIR, ceilStep(), DUCT_ENGINE, ductFriction(), DuctLimits, DuctMat (+27 more)

### Community 130 - "doc-kit.test.ts"
Cohesion: 0.22
Nodes (8): hexRgb(), LUTS, paletteLut(), unpackIndexed(), canonical(), contentHash(), sha256Hex(), PALETTE

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

### Community 137 - "20261020000026_ai.sql"
Cohesion: 0.22
Nodes (12): ai_refund() — unit back when the model fails before the first word, ai_feedback_account, ai_feedback_created, ai_usage_day, private.ai_cfg(), private.ai_config, private.ai_feedback, private.ai_usage (+4 more)

### Community 138 - "pgTAP Push Tests"
Cohesion: 0.50
Nodes (3): claimed, th, tk

### Community 171 - "Product scope review (§9.3)"
Cohesion: 0.16
Nodes (20): coolingLoad · حمل التبريد واختيار الوحدات (Cooling load & unit selection), Excel & CSV export (docXlsx / docCsv), fieldDensity · الكثافة الحقلية (Field density & compaction QC), finishTakeoff · حصر التشطيبات (Room-based finishes take-off), irRegister · سجل طلبات الاستلام (IR / WIR / MIR register), kerbs · البردورات والإنترلوك (Kerbs & interlock), masonry · حصر المباني (legacy tool merged into tradeKit), meetingMinutes · محضر اجتماع (Meeting minutes) (+12 more)

### Community 172 - "SECURITY.md — security and media rules"
Cohesion: 0.29
Nodes (7): SECURITY.md — security and media rules, Job views count once per member per job per day, media_register() upload quotas, Inspection photo removal (x-media-action: remove, media_removable), Open Phase 1 steps (1.1 guards, 1.4 auth / staff MFA, 1.5 release build), Transformation plan Phase 1 (security steps 1.1–1.5), KINDS

### Community 173 - "export-parity.test.ts"
Cohesion: 0.10
Nodes (21): 3. Word and Excel mirror the PDF, specDocx(), stylesXml(), fixedMeasurer, DocSpec, DrawOp, fingerprint(), stripIsolates() (+13 more)

### Community 174 - "admin_email"
Cohesion: 0.20
Nodes (10): default, description, required, admin_email, on, push, workflow_dispatch, branches (+2 more)

### Community 175 - "mfa.ts"
Cohesion: 0.20
Nodes (16): assurance(), clean(), enroll(), Enrolment, Factor, factors(), fail(), gateState (+8 more)

### Community 176 - "toolbox.tsx"
Cohesion: 0.05
Nodes (62): DOCX_MIME, DocBlock, DocText, AR_MONTHS, EN_MONTHS, iso(), LRI, PDI (+54 more)

### Community 177 - "vite.config.ts"
Cohesion: 0.22
Nodes (6): vite@^8.3.1, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react, BUILD, sha

### Community 178 - "ipc · المستخلص الجاري 💲 (Interim payment certificate)"
Cohesion: 0.25
Nodes (16): delayPenalty · غرامات التأخير 💲 (Delay penalty), finalAccount · الحساب الختامي 💲 (Final account), ipc · المستخلص الجاري 💲 (Interim payment certificate), Contracts & payments pack «العقود والمستخلصات» 💲 (contracts), Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement), Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts), priceAdjust · فروق الأسعار 💲 (Price adjustment), rateAnalysis · تحليل سعر البند 💲 (Unit-rate build-up) (+8 more)

### Community 179 - "strict-check.mjs"
Cohesion: 0.21
Nodes (9): base, BASELINE, explicitAny(), now, posix(), problems, ROOT, strictErrors() (+1 more)

### Community 180 - "package.json"
Cohesion: 0.11
Nodes (18): tar dependency override (patched version), @capgo/capacitor-updater@8.52.1, pdfjs-dist@3.11.174, description, @babel/parser@^8.0.6, @babel/traverse@^8.0.6, fake-indexeddb@6.2.5, name (+10 more)

### Community 182 - "motion.test.ts"
Cohesion: 0.50
Nodes (6): settleTime(), Spring, springAt(), springCurve(), SPRINGS, css

### Community 184 - "The website (Cloudflare Pages)"
Cohesion: 0.33
Nodes (5): Custom domain (engspace.org), One-time setup (owner), The public page, The website (Cloudflare Pages), What the workflow also does

### Community 185 - "rest.ts"
Cohesion: 0.40
Nodes (4): db, Fetch, RestClient, Result

### Community 187 - "Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)"
Cohesion: 0.50
Nodes (5): Phase 3: admin console as its own web app behind MFA, Phase 4: store releases, Realtime private channels (member:<id>, feed, staff), Phase 1 follow-ups (strict TypeScript, pdf.js 4/5, lazy English dictionary, admin web app), Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)

### Community 188 - "native-camera-config.test.ts"
Cohesion: 0.50
Nodes (3): file(), plist(), manifest()

### Community 191 - "capacitor.config.ts"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.5.2, @capacitor/cli

### Community 192 - "live-update-ui.test.ts"
Cohesion: 0.50
Nodes (3): base, find(), flat()

## Ambiguous Edges - Review These
- `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Technical office pack «المكتب الفني» (office)` → `Tools tab ToolsTab (Today strip, search, «الأخيرة», packs)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)` → `Simple mode «وضع مبسّط» (one colloquial question per screen)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `takeoffSheet · كشف الحصر (Measurement / take-off sheet)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement)` → `Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references

## Knowledge Gaps
- **10 isolated node(s):** `PackageDescription`, `RFC-6238`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }`, `ISO 7010 (safety signs and pictograms)` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1256 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — EngSpace project memory` connect `Project Rules (CLAUDE.md)` to `tabs.tsx`, `App Shell & Push Client`, `updater.ts`, `Panel`, `AI Proxy (ai-chat)`, `PUSH.md — push notifications`, `Level Book Tool`, `AI CV Review & Redaction`, `MIGRATION.md — Phase 1 prototype migration`, `CV Hiring Panel`, `SECURITY.md — security and media rules`, `cv-panel.test.ts`, `palette.test.ts`, `MainActivity.java`, `AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)`, `Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)`, `native-camera-config.test.ts`, `harness.ts`, `Native Camera Flow`, `Security Armor Schema`, `Brand Mark Rendering`, `cloud.integration.test.ts`, `ai-service.ts`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `ai-tools.spec.ts`, `Release Workflow Inputs`, `test-accounts.mjs`, `client.ts`, `friendly`, `Admin Cloud Adapter`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AppView()` (e.g. with `2. Omnisearch (Ctrl/⌘K)` and `jobStats0()`) actually correct?**
  _`AppView()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `RFC-6238`, `./tsconfig.json` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `tabs.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.042055167055167056 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `tabs.tsx`, `rc-calc.ts`, `doc-kit.test.ts`, `App Shell & Push Client`, `qto-calc.ts`, `updater.ts`, `voice-parse.ts`, `MEP & Cable Tools`, `Rebar BBS & Cutting`, `drafting.tsx`, `concrete.tsx`, `tools/site-calc.ts`, `devDependencies`, `AI Proxy (ai-chat)`, `QA/QC Checklists`, `Row Mapping & Hydrate`, `Level Book Tool`, `Trade Kit Calculator`, `AI CV Review & Redaction`, `Push Delivery (FCM/APNs)`, `export-parity.test.ts`, `mfa.ts`, `toolbox.tsx`, `cv-panel.test.ts`, `ipc · المستخلص الجاري 💲 (Interim payment certificate)`, `hardening.test.ts`, `package.json`, `palette.test.ts`, `motion.test.ts`, `Media Upload Function`, `v24.test.ts`, `landing.test.ts`, `v21.test.ts`, `native-camera-config.test.ts`, `numInputParse`, `harness.ts`, `live-update-ui.test.ts`, `Native Camera Flow`, `Image Compression`, `post-author.test.ts`, `boq-ui.tsx`, `i18n Build & Vitest Config`, `stack.tsx`, `Net Pay & Offers`, `CV HR Assessment`, `cloud.integration.test.ts`, `ui-style.ts`, `templates.tsx`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `Smoke Render Tests`, `ipc-calc.ts`, `Company Scorecard UI`, `AssistantScreen.tsx`, `raises.ts`, `Num`, `xlsx.ts`, `register.tsx`, `host.tsx`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._