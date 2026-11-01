# Graph Report - yousef-eng-space  (2026-10-30)

## Corpus Check
- Large corpus: 349 files · ~573,165 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4111 nodes · 12831 edges · 171 communities (134 shown, 37 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 650 edges (avg confidence: 0.87)
- Token cost: 789,472 input · 0 output

## Community Hubs (Navigation)
- Roles, Taxonomy & Tabs
- Identity, Auth & Onboarding
- Tool Screens & UI Kit
- App Shell & Push Client
- Tools Blueprint Roadmap
- Moderation & Admin Console
- OTA Live Updates
- Feed & Detail Screens
- MEP & Cable Tools
- CV Screen & Settings
- Rebar BBS & Cutting
- Supabase Cloud Client
- CV Audit Engine
- CV Parsing & Extraction
- Media, Directory & Support
- Concrete Take-off Tool
- Site Diary & Permits
- PDF Page Layout
- Push Notifications Schema
- Smart Engineer Screens
- Content Schema (Posts, Jobs)
- Profiles & Moderation Schema
- Project Rules (CLAUDE.md)
- Dev Dependencies
- Word (.docx) Export
- CV Rebuild & Translate
- AI Proxy (ai-chat)
- Prototype Migration Generator
- Verification Flow
- Tool Doc Spec & Modules
- QA/QC Checklists
- Row Mapping & Hydrate
- Document Model (DocSpec)
- Level Book Tool
- Trade Kit Calculator
- AI CV Review & Redaction
- README, CI & Live Preview
- CV Hiring Panel
- Tool Host & Projects
- Phase 2 Architecture Docs
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
- Tool Store Sync
- i18n Core
- Android MainActivity
- E2E Helpers & AI Specs
- Seed Accounts Workflow
- Salary Explorer Schema
- npm Scripts
- Push Pipeline Docs
- Smart Engineer Docs
- Classic Site Tools
- Search Index
- Test Harness
- Native Glue & Sharing
- Cloud Profile & Uploads
- Native Camera Flow
- Image Compression
- Media Privacy Schema
- Security Armor Schema
- E2E Navigation & Posts
- Deploy DB Steps
- Unit Tests (UI & Auth)
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
- Doc Encoding & Hash
- Tool Store Merge
- Text Measuring & Fonts
- Scorecards & Raises Schema
- Realtime Feed Schema
- AI Schema (Quota)
- Inspection PDF Report
- Gradual Typing Scripts
- Tool Routing & Gating Plan
- Edge Function Shared Infra
- Tools Phase 1 Plan
- Smoke Render Tests
- TypeScript Config
- Deploy DB Triggers
- Phone Preview Server
- Local DB Scripts
- Verification Schema
- Company Scorecard UI
- UI Crawler Tool
- Android Test Stubs
- Post Author Controls
- Release Workflow Inputs
- Playwright Setup & Seeds
- Prototype Migration Docs
- Test Account Seeder
- Backend Client Layer
- Raise & Inflation Tracker
- Security Docs
- AI Response Schemas
- Publish Workflow Inputs
- Admin Cloud Adapter
- Publish Workflow Env
- Vite Build Config
- Tool Store Limits Plan
- Media E2E Tests
- Publish Workflow Steps
- Cloud Crawler Tool
- Publish Job Config
- Node TS Config
- Member State Shards
- Checklists E2E
- Publish Workflow Header
- Tour & Nav Tests (v21)
- Camera Config Tests
- Broadcast Input
- Company Dataset Helpers
- Settings Tests (v24)
- Capacitor Config
- Notes Input
- Push Body Input
- Push Title Input
- Push Title (EN) Input
- Device Store
- pgTAP Push Tests
- pgTAP Media Tests
- React DOM Stub
- pgTAP Author Tests
- pgTAP Security Tests
- pgTAP Moderation Tests
- pgTAP Verification Tests
- pgTAP Admin Delete Tests
- Brand Polygon Data

## God Nodes (most connected - your core abstractions)
1. `AppView()` - 157 edges
2. `Num()` - 130 edges
3. `CLAUDE.md — EngSpace project memory` - 115 edges
4. `Panel()` - 86 edges
5. `supabase()` - 79 edges
6. `Secondary()` - 70 edges
7. `Primary()` - 66 edges
8. `ok()` - 62 edges
9. `vitest` - 59 edges
10. `Registration()` - 58 edges

## Surprising Connections (you probably didn't know these)
- `private.kick_push() + engspace-push-sweep cron` --references--> `private.kick_push()`  [INFERRED]
  docs/PUSH.md → supabase/migrations/20261009000017_push_notifications.sql
- `checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections)` --references--> `jpegsOf()`  [EXTRACTED]
  docs/TOOLS-BLUEPRINT.md → e2e/checklists.spec.ts
- `Publish web update (workflow + scripts/ota/publish.mjs)` --references--> `sha256`  [INFERRED]
  docs/OTA.md → scripts/ota/publish.mjs
- `Publish web update (workflow + scripts/ota/publish.mjs)` --references--> `served`  [INFERRED]
  docs/OTA.md → scripts/ota/publish.mjs
- `Publish web update (workflow + scripts/ota/publish.mjs)` --references--> `manifest`  [INFERRED]
  docs/OTA.md → scripts/ota/publish.mjs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Diary self-assembly from today's documents (no double entry)** — docs_tools_blueprint_sitediary, docs_tools_blueprint_concrete, docs_tools_blueprint_toolboxtalk, docs_tools_blueprint_workpermit, docs_tools_blueprint_checklists, docs_tools_blueprint_no_double_entry [EXTRACTED 1.00]
- **Data-loss prevention mechanisms (§8.3)** — docs_tools_blueprint_tool_document_store, docs_tools_blueprint_tool_merge, docs_tools_blueprint_write_path_pacing, docs_tools_blueprint_write_ahead_journal, docs_tools_blueprint_tombstone_delete_undo, docs_tools_blueprint_size_guards, docs_tools_blueprint_issue_freeze, docs_tools_blueprint_storage_meter [EXTRACTED 1.00]
- **Money kept away from supervisors at three levels (registry, schemas, tab / address / chunk)** — docs_tools_blueprint_tool_registry, docs_tools_blueprint_role_gating, docs_tools_blueprint_no_money_guard, docs_tools_blueprint_lazy_chunks, docs_tools_blueprint_tools_tab [EXTRACTED 1.00]
- **Secrets stay server-side (function secrets / Vault / GitHub secrets, never the client or repo)** — docs_phase2_publishable_key_rule, docs_ai_gemini_api_key, docs_push_fcm_setup, docs_push_apns_setup, docs_push_vault_wake_setup, docs_security_media_janitor, docs_phase2_purge_verification_cron [INFERRED 0.85]
- **OTA live web update flow (publish → app-updates bucket → check → banner → broadcast)** — github_workflows_publish_update, scripts_ota_publish, docs_ota_app_updates_bucket, src_native_updater_core, src_native_updater, src_ui_update_banner_updatebanner, docs_ota_broadcast_app_update [EXTRACTED 1.00]
- **Deletion leaves nothing behind (content, authorship and media go together)** — claude_admin_delete_content, claude_delete_my_post, docs_phase2_account_deletion, docs_security_media_janitor [INFERRED 0.85]

## Communities (171 total, 37 thin omitted)

### Community 0 - "Roles, Taxonomy & Tabs"
Cohesion: 0.05
Nodes (137): CAT_DESC, catName(), CATS, COMPANIES, company(), CompanyLogo(), companyMult(), GENERAL_ROOM (+129 more)

### Community 1 - "Identity, Auth & Onboarding"
Cohesion: 0.05
Nodes (117): discForDivision(), divOf(), divTitle(), ACCOUNT_KEY, ageError(), anonTitle(), AUTHOR_FIELDS, checkPassword() (+109 more)

### Community 2 - "Tool Screens & UI Kit"
Cohesion: 0.06
Nodes (100): Phase 0 ✅: research briefs and groundwork (num-input, share-cancel, glyph preload), ResultCard (hero number, pictograms, «طريقة الحساب»), DocBlock, fmtNum(), iso(), DRN_ENGINE, PPE_ITEMS, tbtSummary() (+92 more)

### Community 3 - "App Shell & Push Client"
Cohesion: 0.04
Nodes (107): @capacitor/push-notifications, AppView(), AssistantScreen, ChecklistsScreen, CVReviewScreen, isWorker(), PaneBody, sameSig() (+99 more)

### Community 4 - "Tools Blueprint Roadmap"
Cohesion: 0.04
Nodes (86): EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md), areaSchedule · جدول المساحات والاشتراطات (Area schedule, zoning & parking), bearingTest · قراءة اختبارات التحمل (CBR / DCP / plate-load reader), chwPipe · مواسير المياه المثلجة (Chilled-water pipe sizing), coolingLoad · حمل التبريد واختيار الوحدات (Cooling load & unit selection), crewPlanner · تخطيط العمالة والمدة (Crew size & duration planner), curveSetOut · توقيع المنحنيات (Horizontal curve setting-out), dayworkSheet · يوميات الأعمال الإضافية (Daywork sheet, no rates) (+78 more)

### Community 5 - "Moderation & Admin Console"
Cohesion: 0.06
Nodes (93): room(), ROOMS, JOBS, NOTIFS0, POSTS0, PUB_KARIM, PUB_MONA, SEED_IMG_BEAM (+85 more)

### Community 6 - "OTA Live Updates"
Cohesion: 0.05
Nodes (59): OTA.md — live web updates, app-updates Storage bucket (<channel>/<version>.zip + manifest.json), @capgo/capacitor-updater plugin (CapacitorUpdater, manual mode), Settings → التحديثات الفورية (active bundle, status, manual check), rel(), base, bytes, dist (+51 more)

### Community 7 - "Feed & Detail Screens"
Cohesion: 0.08
Nodes (72): logoSourceLabel(), POST_TYPES, REACTIONS, authorOf(), displayName(), gx(), pickAuthor(), ckey() (+64 more)

### Community 8 - "MEP & Cable Tools"
Cohesion: 0.06
Nodes (71): acInstall · فحص تركيب التكييف (AC installation check), cableCheck · الكابل وهبوط الجهد (Cable & voltage-drop check), drainRun · مناسيب غرف التفتيش (Drain run invert schedule + sight rails), Owner actions (code texts and reviewers), Phase 4: MEP and electrical quick checks (acInstall, drainRun, sprinklerCheck, cableCheck), ac-site@1 (drain table, minimum slope, ρ), drain-metric@1 / drain-ipc@1 (minimum slopes), ecp-fire@0 (disabled ECP fire profile) (+63 more)

### Community 9 - "CV Screen & Settings"
Cohesion: 0.07
Nodes (61): Module ↔ prototype part map, lucide-react, TopBar(), AiBadge(), AiConsentCard(), AiErrorCard(), AiInsightsCard(), AiRunningCard() (+53 more)

### Community 10 - "Rebar BBS & Cutting"
Cohesion: 0.07
Nodes (63): bbs · جدول تفريد وقص الحديد (Bar bending schedule & 12 m cutting optimiser), lapLength · التماسك والوصلات (Development & lap length), Rebar pack (rebar), aci318-19@1 (ACI profile), bs8666-2020@1 (scheduling standard, typed laps), ecp203-2020-bbs@1 (rebar: radius rule, rounding, kg/m, Ld factors), rebar · أوزان الحديد (legacy weight calculator, alias of bbs), Remnant store «مخزن البواقي» (kind rebarStock, per project) (+55 more)

### Community 11 - "Supabase Cloud Client"
Cohesion: 0.08
Nodes (63): @capacitor/browser, supabase(), addComment(), closeTicket(), companyScorecard(), countJobView(), deleteAccount(), deleteItem() (+55 more)

### Community 12 - "CV Audit Engine"
Cohesion: 0.05
Nodes (61): anyScope(), AR_PUNCT, AR_SLIPS, AR_WEAK_LEAD, auditCV(), bigOf(), cleanObject(), conjToPast() (+53 more)

### Community 13 - "CV Parsing & Extraction"
Cohesion: 0.06
Nodes (56): notWork(), analyseBullet(), AR_MASDAR_PAST, cleanPart(), CV_ACTION_AR, CV_ACTION_EN, CV_BULLET, CV_CERT_LIST (+48 more)

### Community 14 - "Media, Directory & Support"
Cohesion: 0.08
Nodes (52): react, installPressFeedback(), BACKEND, isCloud(), lastYear(), monthKey(), day(), demoDirectory() (+44 more)

### Community 15 - "Concrete Take-off Tool"
Cohesion: 0.09
Nodes (49): Pure tool engines (src/domain/tools/*) + lazy tool screens, concrete · حصر وصب الخرسانة (Concrete take-off & pour planner), Striking, curing and cube-test calendar, Cold-joint guard A_max = Q_eff·t_cover/layer, Truck log «سجل الخلاطات» (pour-day ticket log), cubeLog · سجل مكعبات الخرسانة (Concrete cube register), ecp203-site@1 (concrete: waste, cubes, striking/curing, hourdi, logistics), ECP 203 (Egyptian code for concrete structures) (+41 more)

### Community 16 - "Site Diary & Permits"
Cohesion: 0.08
Nodes (51): Crew roster (kind crew, one per project), heatStress · الإجهاد الحراري وحظر الظهيرة (Heat index & midday-ban planner), incident · الحوادث ومؤشرات السلامة (Incident report + TRIR/LTIFR), liftPlan · خطة الرفع المبسطة (Lift plan), ncr · تقرير عدم المطابقة (Non-conformance report), HSE & site management pack (hse), Phase 3: Site management (siteDiary, toolboxTalk + crew, workPermit, full Today strip), hse-intl@1 (OSHA / HSE / EN thresholds, gas limits, power-line table) (+43 more)

### Community 17 - "PDF Page Layout"
Cohesion: 0.17
Nodes (43): Align, anchorX(), basisTable(), boxedText(), brandMarkPath(), cellText(), checksTable(), colophon() (+35 more)

### Community 18 - "Push Notifications Schema"
Cohesion: 0.06
Nodes (28): notifications_inbox, public.notifications, public.admin_warn(), public.inflation_rates, comments_notify, inflation_notify, notifications_a_en, notifications_category (+20 more)

### Community 19 - "Smart Engineer Screens"
Cohesion: 0.11
Nodes (37): AssistantScreen(), ChatMsg, key(), load(), save(), STARTERS, toolsNamed(), turnsFor() (+29 more)

### Community 20 - "Content Schema (Posts, Jobs)"
Cohesion: 0.09
Nodes (42): ballots_tally, comments_author, comments_count, comments_parent, comments_post, company_reviews_author, company_reviews_company, job_contacts_count (+34 more)

### Community 21 - "Profiles & Moderation Schema"
Cohesion: 0.07
Nodes (28): on_auth_user_created, private.author_snapshot(), private.can_act(), private.handle_new_user(), profiles_guard, profiles_touch, public.app_config, public.is_admin() (+20 more)

### Community 22 - "Project Rules (CLAUDE.md)"
Cohesion: 0.08
Nodes (24): CLAUDE.md — EngSpace project memory, admin_accounts — mod_ref list with moderation fields only, admin_directory — admins-only member directory keyed by pid, Company scorecards (company_ratings, company_scorecard()), Executive A4 inspection report (inspectionPdf, signatures, REPORT_PROMO), member_state — per-member synced key/value store, private.net_of_gross() — SQL mirror of netPay(), Offer evaluator + yearly net calculator (+16 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.06
Nodes (42): description, devDependencies, autoprefixer@^10.6.1, @babel/parser@^8.0.6, @babel/traverse@^8.0.6, @babel/types@^8.0.6, @capacitor/android@8.5.2, @capacitor/assets@^3.0.5 (+34 more)

### Community 24 - "Word (.docx) Export"
Cohesion: 0.14
Nodes (34): fflate, basisBlock(), block(), checksTable(), clean(), coreXml(), dataTable(), documentXml() (+26 more)

### Community 25 - "CV Rebuild & Translate"
Cohesion: 0.11
Nodes (41): NO_DICT, DESIGN_BY_DISC, TASK_GENERIC, trackL2(), CV_FLUFF_TEST, CV_MILITARY_RE, addMarks(), HEAD (+33 more)

### Community 26 - "AI Proxy (ai-chat)"
Cohesion: 0.10
Nodes (29): db, AiRequest, Chunk, CORS, DEFAULT_MODEL, ERRORS, FALLBACK_MODELS, Feature (+21 more)

### Community 27 - "Prototype Migration Generator"
Cohesion: 0.05
Nodes (37): asm, checker, cycles, declMod, dedent(), dfs(), DROP, dropped (+29 more)

### Community 28 - "Verification Flow"
Cohesion: 0.11
Nodes (40): discName(), divConflict(), divisionForDisc(), DIVISIONS, AV, docSize(), DocZoom(), REVIEW_CHECKS (+32 more)

### Community 29 - "Tool Doc Spec & Modules"
Cohesion: 0.08
Nodes (36): ToolDoc envelope (kind, v, lang, engine, frozen, profile, body, photos, log, audit), LOG_CAP, ProfileSnap, ToolDoc, ToolDocLogEntry, ToolDocStatus, ToolHeader, ToolKind (+28 more)

### Community 30 - "QA/QC Checklists"
Cohesion: 0.14
Nodes (37): CATEGORIES, categoryOf(), cleanTemplate(), Custom, customKey(), isUserTemplate(), itemCount(), itemsOf() (+29 more)

### Community 31 - "Row Mapping & Hydrate"
Cohesion: 0.11
Nodes (34): addPost(), addReview(), contribute(), loadAll(), postById(), postJob(), withMedia(), mediaUrl() (+26 more)

### Community 32 - "Document Model (DocSpec)"
Cohesion: 0.08
Nodes (29): Calculation-basis block {k:'basis'} on every calculation PDF, checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections), Colophon (technical data only: profiles, engines, SHA-256), Issuer title block «خرطوشة», Paged tables with «يُرحّل / ما قبله» carry-forward rows, fingerprint(), BasisRow, ColophonData (+21 more)

### Community 33 - "Level Book Tool"
Cohesion: 0.13
Nodes (32): Two-peg collimation test «اختبار الوتدين», levelBook · دفتر الميزانية (Levelling field book + two-peg test), Material request «طلب خامات» (MR, kind materialRequest), survey-eng@1 (allowance presets, two-peg limit), has(), LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust() (+24 more)

### Community 34 - "Trade Kit Calculator"
Cohesion: 0.13
Nodes (33): eg-site@1 (trade kit: mixes, waste, hollow-block mortar, sheet size), Trade-kit tiles beyond civil (electrician, plumber, drywall, structural steel), tradeKit · حاسبة الصنايعي (Trade quick kit), CALIB_DEFAULT, HOLLOW_MORTAR_L_M2, PLASTER_PRESETS, STEEL_SECTIONS, TRADE_ENGINE (+25 more)

### Community 35 - "AI CV Review & Redaction"
Cohesion: 0.11
Nodes (29): AiCv, AIX, allowedNumbers(), arr(), both(), draftOf(), factsOf(), guardNumbers() (+21 more)

### Community 36 - "README, CI & Live Preview"
Cohesion: 0.08
Nodes (21): EngSpace — anonymous career and salary network for Egyptian engineers, Supabase auth e-mail templates (Confirm signup, Reset password), Laptop + phone live preview (npm run live, port 8770), name, on, pull_request, push, workflow_dispatch (+13 more)

### Community 37 - "CV Hiring Panel"
Cohesion: 0.11
Nodes (30): CV report executive snapshot + collapsible action plan, discL2(), ETERM(), posL2(), FIGURE, gradeIntel, gradeOf(), GradeTier (+22 more)

### Community 38 - "Tool Host & Projects"
Cohesion: 0.11
Nodes (29): ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة), Project profile ToolProject (one profile for every title block), ISO 19650 (information management, document numbering), blankProject(), KEY(), loadProjects(), PROJECT_CODE, SignRole (+21 more)

### Community 39 - "Phase 2 Architecture Docs"
Cohesion: 0.10
Nodes (18): app.engspace:// deep-link scheme (open/<type>/<id>, auth-callback), Next: high-impact features (market transparency, daily engineering tools), PHASE2.md — Supabase (Frankfurt) and Capacitor 8, Run modes: Demo / Cloud / Native, Capacitor 8 iOS / Android shells, Local Supabase development (Docker, Mailpit, db:* scripts), pgTAP privacy and permission suites (supabase/tests), Phase 2: Supabase backend + Capacitor 8 native shells (+10 more)

### Community 40 - "CI Workflow Steps"
Cohesion: 0.08
Nodes (32): needs, runs-on, steps, runs-on, steps, runs-on, steps, needs (+24 more)

### Community 41 - "Runtime Dependencies (Capacitor)"
Cohesion: 0.06
Nodes (32): dependencies, @capacitor/app@8.1.2, @capacitor/browser@8.0.5, @capacitor/camera@8.2.5, @capacitor/filesystem@8.1.4, @capacitor/haptics@8.0.2, @capacitor/keyboard@8.0.6, @capacitor/preferences@8.0.1 (+24 more)

### Community 42 - "Push Delivery (FCM/APNs)"
Cohesion: 0.10
Nodes (24): apnsBody(), ApnsKey, apnsSender(), b64url(), ClaimedPush, deliver(), DeviceToken, enc (+16 more)

### Community 43 - "Text Guard (Language Filter)"
Cohesion: 0.11
Nodes (31): AR_HATE, AR_HATE_ADDR, AR_INSULTS, AR_MILD, AR_NAME_EXCEPTIONS, AR_PREFIX, AR_PROFANITY, AR_PROFANITY_PHRASES (+23 more)

### Community 44 - "iOS App Shell"
Cohesion: 0.08
Nodes (4): Capacitor, AppDelegate, SceneDelegate, UIKit

### Community 45 - "App Entry & Bootstrap"
Cohesion: 0.10
Nodes (23): Modules written by hand in Phase 1 (main, App, TopBar, ScreenLoading, vendor, ocr, i18n), react-dom@18.3.1, react-dom, AdminView, App(), ErrorBoundary, loadTheme(), PRESS_SEL (+15 more)

### Community 46 - "PDF Rendering & Theme"
Cohesion: 0.11
Nodes (23): DocPreview (same display list and layout object as export), Ctx, DrawOptions, drawPage(), fitRect(), imageKey(), PhotoRef, docStats (+15 more)

### Community 47 - "Release Builds Workflow"
Cohesion: 0.09
Nodes (30): runs-on, steps, GH_REPO, GH_TOKEN, GOOGLE_SERVICES_JSON, TAG, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY (+22 more)

### Community 48 - "Rebuilt CV Draft UI"
Cohesion: 0.15
Nodes (23): bullet(), coreXml(), documentXml(), DOCX_MIME, draftDocx(), esc(), headingOf(), para() (+15 more)

### Community 49 - "Media Upload Function"
Cohesion: 0.14
Nodes (24): ascii(), check(), Chunk, concat(), hasMetadata(), ImageInfo, inspect(), isSOF() (+16 more)

### Community 50 - "Test React Stubs"
Cohesion: 0.08
Nodes (9): jsx(), jsxDEV(), jsxs(), Component, createContext(), c, Fragment, lazies (+1 more)

### Community 51 - "Tool Store Sync"
Cohesion: 0.13
Nodes (6): headerOf(), jsonbBytes(), shardOf(), ToolSyncState, ToolAdapter, toolStore

### Community 52 - "i18n Core"
Cohesion: 0.17
Nodes (26): AR_CHARS, arResidue(), elText(), fillPattern(), freeText(), I18N_ATTR_SEL, I18N_ATTRS, I18N_INLINE (+18 more)

### Community 53 - "Android MainActivity"
Cohesion: 0.11
Nodes (4): MainActivity, WebViewListener, Viewport meta disabling pinch / double-tap zoom, EngViewController

### Community 54 - "E2E Helpers & AI Specs"
Cohesion: 0.16
Nodes (11): CASES, FORMS, ANSWER, ROLES, TABS, demoAs(), noClipped(), noCrash() (+3 more)

### Community 55 - "Seed Accounts Workflow"
Cohesion: 0.07
Nodes (26): default, description, options, required, type, PROJECT_REF, SEED_API_URL, SUPABASE_ACCESS_TOKEN (+18 more)

### Community 56 - "Salary Explorer Schema"
Cohesion: 0.10
Nodes (19): authorship_account, private.authorship, public.is_mine(), public.salary_bands(), public.salary_shares, salary_shares_author, salary_shares_cell, public.start_thread() (+11 more)

### Community 57 - "npm Scripts"
Cohesion: 0.08
Nodes (26): scripts, build, cap:sync, check, db:admin, db:env, db:functions, db:reset (+18 more)

### Community 58 - "Push Pipeline Docs"
Cohesion: 0.18
Nodes (16): admin_message — team messages arrive as «فريق EngSpace», Support tickets (support_tickets / ticket_messages, private support bucket), PUSH.md — push notifications, Apple Push Notification service (APNs, iOS), Firebase Cloud Messaging (FCM, Android), Inflation month notice, private.kick_push() + engspace-push-sweep cron, Private message notices (+8 more)

### Community 59 - "Smart Engineer Docs"
Cohesion: 0.15
Nodes (13): AI.md — «المهندس الذكي» Smart Engineer (v0.29.0), private.ai_config (enabled, daily_limit, model, model_light), ai_rate() — 👍 / 👎 per feature, ai_refund() — unit back when the model fails before the first word, ai_take() — takes one unit (money:false for supervisors), ai_tokens() — token counts only, Daily AI allowance (25 per Cairo day per member), Google Gemini API (streamGenerateContent, SSE) (+5 more)

### Community 60 - "Classic Site Tools"
Cohesion: 0.21
Nodes (22): concreteMaterials(), convert, Element, elementVolume(), masonry(), MIX, REBAR_SIZES, rebarKgPerM() (+14 more)

### Community 61 - "Search Index"
Cohesion: 0.17
Nodes (24): isEn(), tr(), AR_INDIC, AR_PREFIXES, AR_SUFFIXES, bigrams(), buildSearchIndex(), damerau() (+16 more)

### Community 62 - "Test Harness"
Cohesion: 0.09
Nodes (12): C, html, modules, sources, src, localStorage, store, names (+4 more)

### Community 63 - "Native Glue & Sharing"
Cohesion: 0.14
Nodes (15): @capacitor/splash-screen@8.0.2, @capacitor/status-bar@8.0.4, @capacitor/splash-screen, @capacitor/status-bar, linkFor(), parseOpenLink(), Shareable, snippet() (+7 more)

### Community 64 - "Cloud Profile & Uploads"
Cohesion: 0.12
Nodes (21): currentPersona(), e164(), finishAuthLink(), friendly(), markContacted(), myProfile(), saveProfile(), sendPhoneCode() (+13 more)

### Community 65 - "Native Camera Flow"
Cohesion: 0.17
Nodes (17): useCameraShot(), cameraAccess(), isCancel(), isDenied(), markCameraBroken(), NATIVE_MAX, nativePhoto(), nativePhotosReady() (+9 more)

### Community 66 - "Image Compression"
Cohesion: 0.16
Nodes (17): canEncodeWebp(), compressCanvas(), Compressed, compressImage(), dataUrlToBlob(), decode(), Decoded, encode() (+9 more)

### Community 67 - "Media Privacy Schema"
Cohesion: 0.13
Nodes (16): private.photo_guard — profile photo must be the member's own avatar upload, media_uploads_open, media_uploads_owner, posts_z_media, private.kick_media(), private.media_uploads, private.photo_guard(), private.post_media_in() (+8 more)

### Community 68 - "Security Armor Schema"
Cohesion: 0.14
Nodes (18): public.member_state, comments_a_rate, company_reviews_a_rate, job_views_account, jobs_a_rate, member_state_a_keys, messages_a_rate, posts_a_rate (+10 more)

### Community 69 - "E2E Navigation & Posts"
Cohesion: 0.20
Nodes (16): ADMIN_PW, CRASH, DOMAIN, newMember(), publish(), PW, settle(), signIn() (+8 more)

### Community 70 - "Deploy DB Steps"
Cohesion: 0.09
Nodes (23): env, runs-on, steps, ADMIN_EMAIL, APNS_KEY_ID, APNS_KEY_P8, APNS_TEAM_ID, FCM_SERVICE_ACCOUNT (+15 more)

### Community 71 - "Unit Tests (UI & Auth)"
Cohesion: 0.09
Nodes (11): vitest, base, find(), flat(), auth, calls, names, names (+3 more)

### Community 72 - "OCR & Vendor Loading"
Cohesion: 0.14
Nodes (13): mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87), mammoth@1.13.0, tesseract.js@5.1.1, mammoth, tesseract.js, modelsGzipped(), ocrOpen(), ocrWorkerUrl() (+5 more)

### Community 73 - "i18n Build & Vitest Config"
Cohesion: 0.15
Nodes (15): buildDict(), [cmd = "build", ...args], contentKeys(), kid(), lines(), loadExtra(), loadKeys(), loadTr() (+7 more)

### Community 74 - "Migration Analyzer Script"
Cohesion: 0.10
Nodes (19): brandView, checker, declOf, fs, fwdEval, host, inFn(), out (+11 more)

### Community 75 - "Messaging Schema"
Cohesion: 0.16
Nodes (17): messages_thread, private.in_thread(), private.messages, private.threads, public.my_threads(), public.send_message(), public.set_thread_identity(), public.thread_messages() (+9 more)

### Community 76 - "Brand Mark Rendering"
Cohesion: 0.14
Nodes (13): E+S brand mark (src/ui/brand-mark.json) and icon generation, data, markPolys(), markSvg(), pts(), C, { chromium }, font (+5 more)

### Community 77 - "Tool Registry & Gate"
Cohesion: 0.21
Nodes (16): Site tools (concrete, rebar, masonry, units), Tools suite wave 1 (v0.28.0), SITE_TOOLS, ToolScreen(), toolAllowed(), toolKindsForRole(), toolOfStack(), toolsForRole() (+8 more)

### Community 78 - "AI Client Service"
Cohesion: 0.14
Nodes (18): ai_quota() — remaining units for the quota chip, FormKind, X, useQuota(), AiAsk, AiError, AiFeature, AiMsg (+10 more)

### Community 79 - "i18n String Extractor"
Cohesion: 0.14
Nodes (14): byKind, hasProp(), inRegexCtx(), inType(), isBilingual(), isContent(), keys, OUT (+6 more)

### Community 80 - "PDF Writer"
Cohesion: 0.19
Nodes (9): enc, num(), pdfDate(), PdfImage, PdfInfo, PdfPage, PdfPlacement, pdfString() (+1 more)

### Community 81 - "Support Tickets Schema"
Cohesion: 0.16
Nodes (12): public.admin_directory(), public.admin_directory_set_staff(), public.admin_message(), public.admin_public_items(), public.open_ticket(), public.reply_ticket(), public.staff_reply_ticket(), public.staff_set_ticket_status() (+4 more)

### Community 82 - "Net Pay & Offers"
Cohesion: 0.25
Nodes (15): evaluateOffer(), MEDICAL_VALUE, offerNet(), offerPackage(), percentileOf(), round500(), annualTax(), BRACKET_LOSS (+7 more)

### Community 83 - "CV HR Assessment"
Cohesion: 0.16
Nodes (16): CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, CV_UNIS, candidateGender(), egyptian(), EMPLOYERS, hrAssessment (+8 more)

### Community 84 - "Doc Encoding & Hash"
Cohesion: 0.22
Nodes (10): encodeIndexed(), hexRgb(), LUTS, packIndexed(), paletteLut(), unpackIndexed(), canonical(), contentHash() (+2 more)

### Community 85 - "Tool Store Merge"
Cohesion: 0.18
Nodes (11): mergeDoc(), newDocId(), CloudPort, emptyMeta(), idbAdapter(), memoryAdapter(), req(), SaveResult (+3 more)

### Community 86 - "Text Measuring & Fonts"
Cohesion: 0.14
Nodes (10): baseline(), DocMeasurer, AR_MONTHS, EN_MONTHS, graphemes(), latinDigits(), LRI, MINUS (+2 more)

### Community 87 - "Scorecards & Raises Schema"
Cohesion: 0.17
Nodes (10): company_ratings_company, private.drop_raise_reports(), private.raise_rate_limit(), public.company_ratings, public.company_scorecard(), public.market_raises(), public.raise_reports, raise_reports_a_limit (+2 more)

### Community 88 - "Realtime Feed Schema"
Cohesion: 0.18
Nodes (15): comments_feed_new, comments_moderation, company_reviews_moderation, jobs_moderation, posts_feed_new, posts_moderation, private.feed_comment_new(), private.feed_moderation() (+7 more)

### Community 89 - "AI Schema (Quota)"
Cohesion: 0.19
Nodes (14): ai_feedback_account, ai_feedback_created, ai_usage_day, private.ai_cfg(), private.ai_config, private.ai_feedback, private.ai_usage, public.admin_ai_set() (+6 more)

### Community 90 - "Inspection PDF Report"
Cohesion: 0.16
Nodes (12): A4, C, dataUrlBytes(), drawMark(), inspectionPdf(), InspectionReport, MARK, pdfFromJpegs() (+4 more)

### Community 91 - "Gradual Typing Scripts"
Cohesion: 0.15
Nodes (10): fs, path, ts, walk(), files, fs, path, edit() (+2 more)

### Community 92 - "Tool Routing & Gating Plan"
Cohesion: 0.21
Nodes (10): cvreview · مراجعة السيرة الذاتية (CV review, the only HR tool), Codebase seams review (§9.2), Tool routes #app/tool/<id>, #app/tooldoc/<id>:<docId|new>, toolprojects, toolstorage, v, parseHash(), PLAIN_TYPES, STACK_TYPES, TOOL_VIEWS, TOOL_MODULES (+2 more)

### Community 93 - "Edge Function Shared Infra"
Cohesion: 0.23
Nodes (10): CORS, handle(), json(), removeAll(), sweep(), isKind(), pathFor(), Verdict (+2 more)

### Community 94 - "Tools Phase 1 Plan"
Cohesion: 0.17
Nodes (10): Salary & offers pack «الراتب والعروض» 💲 (money), Phase 1: Foundation (registry/gate, Tools tab, store, projects, UI kit, document kit, QA/QC), Salary & offer tools (offer, net, compare, script, raise, path, contract, move, inflation), Delete flow: tombstone, 6 s undo, photos removed after sync, Tools tab ToolsTab (Today strip, search, «الأخيرة», packs), PANE_KEYS, MergeOut, ToolTomb (+2 more)

### Community 95 - "Smoke Render Tests"
Cohesion: 0.14
Nodes (8): crawl(), fakeEvent, handlerErrors, render(), seen, setups, signIn(), signInAs()

### Community 96 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noImplicitAny (+6 more)

### Community 97 - "Deploy DB Triggers"
Cohesion: 0.14
Nodes (13): default, description, required, concurrency, admin_email, name, on, push (+5 more)

### Community 98 - "Phone Preview Server"
Cohesion: 0.18
Nodes (11): args, buildStamp(), COMPRESS, DIST, LAN, NO_STORE, PORT, resolveFile() (+3 more)

### Community 99 - "Local DB Scripts"
Cohesion: 0.15
Nodes (8): Yousef — owner (architect / BIM coordinator), first admin, bootstrap_admin() — first administrator, st, out, env, r, st, public.bootstrap_admin()

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
Cohesion: 0.21
Nodes (10): admin_delete_content() — permanent delete by admins, delete_my_post() — removes replies, reactions, authorship and the image, edit_my_post() — own post, counts only real text changes, my_posts() — server answer to which posts are mine, Staff roles (profiles.staff moderator / admin; role stays engineer), posts_feed_edit, private.feed_post_edit(), public.delete_my_post() (+2 more)

### Community 105 - "Release Workflow Inputs"
Cohesion: 0.17
Nodes (10): tag, name, on, workflow_dispatch, permissions, contents, default, description (+2 more)

### Community 106 - "Playwright Setup & Seeds"
Cohesion: 0.17
Nodes (10): Playwright e2e suite (iPhone 15 + Pixel 7 profiles, E2E_LIVE / E2E_WEBKIT), Seeded test accounts (@engspace.test, ten roles), chromiumUse, { defaultBrowserType: _a, ...iphoneNoEngine }, { defaultBrowserType: _b, ...pixel }, iphone, @playwright/test, env (+2 more)

### Community 107 - "Prototype Migration Docs"
Cohesion: 0.29
Nodes (8): MIGRATION.md — Phase 1 prototype migration, Dead logo controls removed after the brand board, i18n extract / build scripts ported to Node, pdf.js CVE-2024-4367 fix (getDocument with isEvalSupported: false), Phase 1: single-file prototype → bundled Vite + React + TypeScript, tar dependency override (patched version), v24 single-file prototype (27 script parts, one global scope), Source layout (src/app, features, ui, domain, lib, data, i18n, styles)

### Community 108 - "Test Account Seeder"
Cohesion: 0.18
Nodes (8): API, call(), def, findId(), h, remove, results, year

### Community 109 - "Backend Client Layer"
Cohesion: 0.20
Nodes (6): @capacitor/core@8.5.2, @supabase/supabase-js@2.117.2, @capacitor/core, @supabase/supabase-js, nativeStorage, SUPABASE_URL

### Community 110 - "Raise & Inflation Tracker"
Cohesion: 0.35
Nodes (8): Raise & inflation tracker (raise_reports, market_raises(), inflation_rates), INFLATION, INFLATION_SOURCE, addMonths(), cumulative(), monthsBetween(), realHistory(), Series

### Community 111 - "Security Docs"
Cohesion: 0.33
Nodes (6): SECURITY.md — security and media rules, Job views count once per member per job per day, media_register() upload quotas, Inspection photo removal (x-media-action: remove, media_removable), Open Phase 1 steps (1.1 guards, 1.4 auth / staff MFA, 1.5 release build), Transformation plan Phase 1 (security steps 1.1–1.5)

### Community 112 - "AI Response Schemas"
Cohesion: 0.24
Nodes (5): A(), CV_DOC, CV_REVIEW_SCHEMA, O(), ROWS()

### Community 113 - "Publish Workflow Inputs"
Cohesion: 0.20
Nodes (10): default, description, required, channel, push_body_en, workflow_dispatch, default, description (+2 more)

### Community 114 - "Admin Cloud Adapter"
Cohesion: 0.42
Nodes (9): admin, accountsOf(), auditOf(), DETAIL, loadAdmin(), modOf(), ms(), reportsOf() (+1 more)

### Community 115 - "Publish Workflow Env"
Cohesion: 0.22
Nodes (9): NOTES, P_BODY, P_BODY_EN, P_TITLE, P_TITLE_EN, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL (+1 more)

### Community 116 - "Vite Build Config"
Cohesion: 0.22
Nodes (6): vite@^8.3.1, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react, BUILD, sha

### Community 117 - "Tool Store Limits Plan"
Cohesion: 0.36
Nodes (3): Storage meter «التخزين» (bodies, photos, device archive, JSON backup), DOC_GUARD, destroyToolStore()

### Community 119 - "Publish Workflow Steps"
Cohesion: 0.25
Nodes (8): steps, if, name, run, uses, with, cache, node-version

### Community 120 - "Cloud Crawler Tool"
Cohesion: 0.25
Nodes (6): ACCOUNTS, { chromium }, env, MAX, require, t0

### Community 121 - "Publish Job Config"
Cohesion: 0.29
Nodes (7): CHANNEL, PROJECT_REF, SUPABASE_ACCESS_TOKEN, jobs, publish, env, runs-on

### Community 122 - "Node TS Config"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, allowImportingTsExtensions, types, extends, include

### Community 123 - "Member State Shards"
Cohesion: 0.40
Nodes (3): SHARD_GUARD, SHARD_TARGET, SHARDS

### Community 124 - "Checklists E2E"
Cohesion: 0.47
Nodes (5): build(), builder(), downloadPdf(), insp(), jpegsOf()

### Community 125 - "Publish Workflow Header"
Cohesion: 0.33
Nodes (5): concurrency, name, on, permissions, contents

### Community 127 - "Camera Config Tests"
Cohesion: 0.50
Nodes (3): file(), plist(), manifest()

### Community 128 - "Broadcast Input"
Cohesion: 0.40
Nodes (5): default, description, required, type, broadcast

### Community 129 - "Company Dataset Helpers"
Cohesion: 0.40
Nodes (5): bo(), co(), LOGO_FILES, logoUrl(), netFig()

### Community 132 - "Capacitor Config"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.5.2, @capacitor/cli

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

### Community 137 - "Device Store"
Cohesion: 0.83
Nodes (3): KEY(), loadDevice(), storeDevice()

### Community 138 - "pgTAP Push Tests"
Cohesion: 0.50
Nodes (3): claimed, th, tk

## Ambiguous Edges - Review These
- `Simple mode «وضع مبسّط» (one colloquial question per screen)` → `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Technical office pack «المكتب الفني» (office)` → `Tools tab ToolsTab (Today strip, search, «الأخيرة», packs)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `takeoffSheet · كشف الحصر (Measurement / take-off sheet)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement)` → `Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references

## Knowledge Gaps
- **9 isolated node(s):** `PackageDescription`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }`, `DocList (windowed list of saved documents)`, `Egyptian VAT Law 157/2025 (amending Law 67/2016)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1018 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — EngSpace project memory` connect `Project Rules (CLAUDE.md)` to `App Shell & Push Client`, `Tools Blueprint Roadmap`, `OTA Live Updates`, `Feed & Detail Screens`, `Media, Directory & Support`, `Concrete Take-off Tool`, `AI Proxy (ai-chat)`, `AI CV Review & Redaction`, `README, CI & Live Preview`, `CV Hiring Panel`, `Phase 2 Architecture Docs`, `Rebuilt CV Draft UI`, `Android MainActivity`, `E2E Helpers & AI Specs`, `Push Pipeline Docs`, `Smart Engineer Docs`, `Test Harness`, `Native Glue & Sharing`, `Cloud Profile & Uploads`, `Native Camera Flow`, `Security Armor Schema`, `Brand Mark Rendering`, `Tool Registry & Gate`, `PDF Writer`, `Deploy DB Triggers`, `Local DB Scripts`, `Post Author Controls`, `Release Workflow Inputs`, `Playwright Setup & Seeds`, `Prototype Migration Docs`, `Backend Client Layer`, `Raise & Inflation Tracker`, `Security Docs`, `Admin Cloud Adapter`, `Camera Config Tests`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Roles, Taxonomy & Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.04827466016033461 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Unit Tests (UI & Auth)` to `Roles, Taxonomy & Tabs`, `Tool Screens & UI Kit`, `App Shell & Push Client`, `Settings Tests (v24)`, `OTA Live Updates`, `Feed & Detail Screens`, `MEP & Cable Tools`, `Rebar BBS & Cutting`, `Concrete Take-off Tool`, `Site Diary & Permits`, `Smart Engineer Screens`, `Dev Dependencies`, `Word (.docx) Export`, `AI Proxy (ai-chat)`, `QA/QC Checklists`, `Row Mapping & Hydrate`, `Level Book Tool`, `Trade Kit Calculator`, `AI CV Review & Redaction`, `Push Delivery (FCM/APNs)`, `Rebuilt CV Draft UI`, `Media Upload Function`, `Classic Site Tools`, `Test Harness`, `Native Glue & Sharing`, `Native Camera Flow`, `Image Compression`, `i18n Build & Vitest Config`, `Net Pay & Offers`, `CV HR Assessment`, `Doc Encoding & Hash`, `Tool Store Merge`, `Tool Routing & Gating Plan`, `Tools Phase 1 Plan`, `Smoke Render Tests`, `Company Scorecard UI`, `Raise & Inflation Tracker`, `Tour & Nav Tests (v21)`, `Camera Config Tests`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `Identity, Auth & Onboarding` be split into smaller, more focused modules?**
  _Cohesion score 0.047075793338578545 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Simple mode «وضع مبسّط» (one colloquial question per screen)` and `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Technical office pack «المكتب الفني» (office)` and `Tools tab ToolsTab (Today strip, search, «الأخيرة», packs)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._