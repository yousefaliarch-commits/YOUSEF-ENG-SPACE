# Graph Report - yousef-eng-space  (2026-11-10)

## Corpus Check
- 429 files · ~692,767 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 98 file(s) not represented in the graph (top: .tsv 60, .xml 12, (none) 8)

## Summary
- 4907 nodes · 15495 edges · 190 communities (149 shown, 41 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 692 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b75a991d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stack.tsx
- Identity, Auth & Onboarding
- Tool Screens & UI Kit
- App Shell & Push Client
- Phase 5: vector backend and wave-2 tools
- Moderation & Admin Console
- updater.ts
- voice-parse.ts
- MEP & Cable Tools
- CV Screen & Settings
- Rebar BBS & Cutting
- Supabase Cloud Client
- CV Audit Engine
- CV Parsing & Extraction
- drafting.tsx
- concrete.tsx
- permit.tsx
- PDF Page Layout
- Push Notifications Schema
- AssistantScreen.tsx
- Content Schema (Posts, Jobs)
- Profiles & Moderation Schema
- Project Rules (CLAUDE.md)
- Dev Dependencies
- Word (.docx) Export
- CV Rebuild & Translate
- AI Proxy (ai-chat)
- Prototype Migration Generator
- Verification Flow
- concrete-calc.ts
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
- cv/docx.ts
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
- AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)
- tool-docs.ts
- Search Index
- harness.ts
- Native Glue & Sharing
- Cloud Profile & Uploads
- Native Camera Flow
- Image Compression
- Media Privacy Schema
- Security Armor Schema
- helpers.ts
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
- vitest
- phone-server.mjs
- Scorecards & Raises Schema
- Realtime Feed Schema
- kit-workstation.test.ts
- env
- Gradual Typing Scripts
- templates.tsx
- palette.test.ts
- Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)
- Smoke Render Tests
- TypeScript Config
- vitest.config.ts
- ipc.tsx
- fflate
- Verification Schema
- Company Scorecard UI
- UI Crawler Tool
- Android Test Stubs
- Post Author Controls
- Release Workflow Inputs
- rc-section.tsx
- raises.ts
- Test Account Seeder
- client.ts
- Num
- v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off
- AI Response Schemas
- Publish Workflow Inputs
- Admin Cloud Adapter
- Publish Workflow Env
- xlsx.ts
- register.tsx
- Media E2E Tests
- Publish Workflow Steps
- qto.tsx
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
- playwright.config.ts
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
- toolAllowed
- export-parity.test.ts
- v21.test.ts
- mfa.ts
- doc-xlsx.test.ts
- v22.test.ts
- ipc · المستخلص الجاري 💲 (Interim payment certificate)
- strict-check.mjs
- Capacitor 8 iOS / Android shells
- typing-ratchet.test.ts
- updater-flow.test.ts
- live-update-ui.test.ts
- The website (Cloudflare Pages)
- hardening.test.ts
- update-banner.test.ts
- post-author.test.ts

## God Nodes (most connected - your core abstractions)
1. `AppView()` - 166 edges
2. `Num()` - 151 edges
3. `CLAUDE.md — EngSpace project memory` - 115 edges
4. `Panel()` - 91 edges
5. `supabase()` - 87 edges
6. `vitest` - 82 edges
7. `Secondary()` - 74 edges
8. `Primary()` - 71 edges
9. `react` - 63 edges
10. `ok()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `2. Omnisearch (Ctrl/⌘K)` --references--> `AppView()`  [INFERRED]
  docs/OMNISEARCH-VOICE.md → src/app/AppView.tsx
- `Run modes: Demo / Cloud / Native` --references--> `forcedDemo()`  [INFERRED]
  docs/PHASE2.md → src/backend/config.ts
- `mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87)` --references--> `loadMammoth()`  [INFERRED]
  docs/MIGRATION.md → src/lib/vendor.ts
- `private.kick_push() + engspace-push-sweep cron` --references--> `private.kick_push()`  [INFERRED]
  docs/PUSH.md → supabase/migrations/20261009000017_push_notifications.sql
- `delete_my_post() — removes replies, reactions, authorship and the image` --references--> `public.delete_my_post()`  [INFERRED]
  CLAUDE.md → supabase/migrations/20261013000021_post_author_controls.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Data-loss prevention mechanisms (§8.3)** — docs_tools_blueprint_tool_document_store, docs_tools_blueprint_tool_merge, docs_tools_blueprint_write_path_pacing, docs_tools_blueprint_write_ahead_journal, docs_tools_blueprint_tombstone_delete_undo, docs_tools_blueprint_size_guards, docs_tools_blueprint_issue_freeze, docs_tools_blueprint_storage_meter [EXTRACTED 1.00]
- **Diary self-assembly from today's documents (no double entry)** — docs_tools_blueprint_sitediary, docs_tools_blueprint_concrete, docs_tools_blueprint_toolboxtalk, docs_tools_blueprint_workpermit, docs_tools_blueprint_checklists, docs_tools_blueprint_no_double_entry [EXTRACTED 1.00]
- **Money kept away from supervisors at three levels (registry, schemas, tab / address / chunk)** — docs_tools_blueprint_tool_registry, docs_tools_blueprint_role_gating, docs_tools_blueprint_no_money_guard, docs_tools_blueprint_lazy_chunks, docs_tools_blueprint_tools_tab [EXTRACTED 1.00]
- **OTA live web update flow (publish → app-updates bucket → check → banner → broadcast)** — github_workflows_publish_update, scripts_ota_publish, docs_ota_app_updates_bucket, src_native_updater_core, src_native_updater, src_ui_update_banner_updatebanner, docs_ota_broadcast_app_update [EXTRACTED 1.00]
- **Deletion leaves nothing behind (content, authorship and media go together)** — claude_admin_delete_content, claude_delete_my_post, docs_phase2_account_deletion, docs_security_media_janitor [INFERRED 0.85]
- **Secrets stay server-side (function secrets / Vault / GitHub secrets, never the client or repo)** — docs_phase2_publishable_key_rule, docs_ai_gemini_api_key, docs_push_fcm_setup, docs_push_apns_setup, docs_push_vault_wake_setup, docs_security_media_janitor, docs_phase2_purge_verification_cron [INFERRED 0.85]

## Communities (190 total, 41 thin omitted)

### Community 0 - "stack.tsx"
Cohesion: 0.04
Nodes (147): bo(), CAT_DESC, catName(), CATS, co(), CompanyLogo(), companyMult(), GENERAL_ROOM (+139 more)

### Community 1 - "Identity, Auth & Onboarding"
Cohesion: 0.05
Nodes (110): isWorker(), divTitle(), ACCOUNT_KEY, ageError(), anonTitle(), AUTHOR_FIELDS, authorOf(), checkPassword() (+102 more)

### Community 2 - "Tool Screens & UI Kit"
Cohesion: 0.07
Nodes (88): DocList (windowed list of saved documents), ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة), ResultCard (hero number, pictograms, «طريقة الحساب»), Tool UI kit ui/kit (NumField … ExportBar), paramsOnly(), fmtNum(), AiFillCard(), str() (+80 more)

### Community 3 - "App Shell & Push Client"
Cohesion: 0.04
Nodes (120): Tools tab ToolsTab (Today strip, search, «الأخيرة», packs), @capacitor/push-notifications, AppView(), AssistantScreen, ChecklistsScreen, CVReviewScreen, PANE_KEYS, PaneBody (+112 more)

### Community 4 - "Phase 5: vector backend and wave-2 tools"
Cohesion: 0.06
Nodes (52): areaSchedule · جدول المساحات والاشتراطات (Area schedule, zoning & parking), bearingTest · قراءة اختبارات التحمل (CBR / DCP / plate-load reader), chwPipe · مواسير المياه المثلجة (Chilled-water pipe sizing), crewPlanner · تخطيط العمالة والمدة (Crew size & duration planner), curveSetOut · توقيع المنحنيات (Horizontal curve setting-out), detectors · توزيع الكواشف (Detector & call-point spacing), drainSize · مقاسات الصرف والتهوية (DFU drainage & vent sizing), ductSizer · مقاسات الدكت (Duct sizer, equal friction) (+44 more)

### Community 5 - "Moderation & Admin Console"
Cohesion: 0.05
Nodes (104): JOBS, NOTIFS0, POSTS0, PUB_KARIM, PUB_MONA, SEED_IMG_BEAM, THREADS0, hasSession() (+96 more)

### Community 6 - "updater.ts"
Cohesion: 0.08
Nodes (45): RFC-6238, OTA.md — live web updates, app-updates Storage bucket (<channel>/<version>.zip + manifest.json), @capgo/capacitor-updater plugin (CapacitorUpdater, manual mode), Settings → التحديثات الفورية (active bundle, status, manual check), applyUpdateNow(), bad(), call() (+37 more)

### Community 7 - "voice-parse.ts"
Cohesion: 0.11
Nodes (33): answerNumber(), applyAnswers(), Bilingual, defaultWaste(), FIELD, KIND_NAME, kindField(), LABELLED (+25 more)

### Community 8 - "MEP & Cable Tools"
Cohesion: 0.07
Nodes (67): acInstall · فحص تركيب التكييف (AC installation check), cableCheck · الكابل وهبوط الجهد (Cable & voltage-drop check), drainRun · مناسيب غرف التفتيش (Drain run invert schedule + sight rails), Owner actions (code texts and reviewers), Phase 4: MEP and electrical quick checks (acInstall, drainRun, sprinklerCheck, cableCheck), ac-site@1 (drain table, minimum slope, ρ), drain-metric@1 / drain-ipc@1 (minimum slopes), iec60364-2009@1 (factor tables with a verified flag per table) (+59 more)

### Community 9 - "CV Screen & Settings"
Cohesion: 0.05
Nodes (105): CV report executive snapshot + collapsible action plan, Module ↔ prototype part map, lucide-react, react, TopBar(), TRACKS, tracksFor(), day() (+97 more)

### Community 10 - "Rebar BBS & Cutting"
Cohesion: 0.05
Nodes (79): Pure tool engines (src/domain/tools/*) + lazy tool screens, bbs · جدول تفريد وقص الحديد (Bar bending schedule & 12 m cutting optimiser), lapLength · التماسك والوصلات (Development & lap length), Rebar pack (rebar), Structural & concrete pack (structural), aci318-19@1 (ACI profile), bs8666-2020@1 (scheduling standard, typed laps), ecp203-2020-bbs@1 (rebar: radius rule, rounding, kg/m, Ld factors) (+71 more)

### Community 11 - "Supabase Cloud Client"
Cohesion: 0.08
Nodes (64): @capacitor/browser, supabase(), addComment(), closeTicket(), companyScorecard(), contribute(), countJobView(), deleteAccount() (+56 more)

### Community 12 - "CV Audit Engine"
Cohesion: 0.05
Nodes (67): anyScope(), AR_PUNCT, AR_SLIPS, AR_WEAK_LEAD, auditCV(), bigOf(), cleanObject(), conjToPast() (+59 more)

### Community 13 - "CV Parsing & Extraction"
Cohesion: 0.06
Nodes (60): notWork(), analyseBullet(), AR_MASDAR_PAST, cleanPart(), CV_ACTION_AR, CV_ACTION_EN, CV_BULLET, CV_CERT_LIST (+52 more)

### Community 14 - "drafting.tsx"
Cohesion: 0.13
Nodes (25): clamp(), COS, ISO_MAX_RATIO, ISO_MESH_MAX, ISO_VIEW, isoBox(), IsoDim, IsoGeom (+17 more)

### Community 15 - "concrete.tsx"
Cohesion: 0.17
Nodes (30): CONC_KINDS, CONC_PROFILE, concCalendar(), kindName(), mixFor(), bagOf(), blank(), blankRow() (+22 more)

### Community 16 - "permit.tsx"
Cohesion: 0.04
Nodes (81): Truck log «سجل الخلاطات» (pour-day ticket log), Crew roster (kind crew, one per project), cubeLog · سجل مكعبات الخرسانة (Concrete cube register), liftPlan · خطة الرفع المبسطة (Lift plan), Phase 3: Site management (siteDiary, toolboxTalk + crew, workPermit, full Today strip), hse-intl@1 (OSHA / HSE / EN thresholds, gas limits, power-line table), scaffoldTags · بطاقات السقالات والسلالم (Scaffold, ladder & harness tags), siteDiary · يومية الموقع (Daily site diary) (+73 more)

### Community 17 - "PDF Page Layout"
Cohesion: 0.15
Nodes (46): Issuer title block «خرطوشة», Align, anchorX(), basisTable(), boxedText(), cellText(), checksTable(), colophon() (+38 more)

### Community 18 - "Push Notifications Schema"
Cohesion: 0.07
Nodes (25): notifications_inbox, public.notifications, public.inflation_rates, inflation_notify, notifications_a_en, notifications_category, notifications_push, private.inflation_notify() (+17 more)

### Community 19 - "AssistantScreen.tsx"
Cohesion: 0.11
Nodes (36): AssistantScreen(), ChatMsg, key(), load(), save(), STARTERS, toolsNamed(), turnsFor() (+28 more)

### Community 20 - "Content Schema (Posts, Jobs)"
Cohesion: 0.09
Nodes (38): ballots_tally, comments_author, comments_count, comments_parent, comments_post, company_reviews_company, job_contacts_count, job_contacts_job (+30 more)

### Community 21 - "Profiles & Moderation Schema"
Cohesion: 0.12
Nodes (16): company_reviews_author, public.company_reviews, audit_log_at, private.item_mod, private.report_targets, public.admin_analytics(), public.admin_set_config(), public.audit_log (+8 more)

### Community 22 - "Project Rules (CLAUDE.md)"
Cohesion: 0.07
Nodes (31): CLAUDE.md — EngSpace project memory, admin_message — team messages arrive as «فريق EngSpace», app.engspace:// deep-link scheme (open/<type>/<id>, auth-callback), Company scorecards (company_ratings, company_scorecard()), Playwright e2e suite (iPhone 15 + Pixel 7 profiles, E2E_LIVE / E2E_WEBKIT), Executive A4 inspection report (inspectionPdf, signatures, REPORT_PROMO), member_state — per-member synced key/value store, private.net_of_gross() — SQL mirror of netPay() (+23 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.06
Nodes (44): config, tar dependency override (patched version), description, devDependencies, autoprefixer@^10.6.1, @capacitor/android@8.5.2, @capacitor/assets@^3.0.5, @capacitor/cli@8.5.2 (+36 more)

### Community 24 - "Word (.docx) Export"
Cohesion: 0.20
Nodes (29): basisBlock(), block(), checksTable(), clean(), coreXml(), dataTable(), documentXml(), esc() (+21 more)

### Community 25 - "CV Rebuild & Translate"
Cohesion: 0.10
Nodes (49): dimPhrase(), scopeOf(), gradeOf(), DraftCard(), addMarks(), applyFills(), DRAFT_NOTE, DraftSection (+41 more)

### Community 26 - "AI Proxy (ai-chat)"
Cohesion: 0.10
Nodes (26): db, AiRequest, Chunk, CORS, DEFAULT_MODEL, ERRORS, FALLBACK_MODELS, Feature (+18 more)

### Community 27 - "Prototype Migration Generator"
Cohesion: 0.05
Nodes (38): asm, checker, cycles, declMod, dedent(), dfs(), DROP, dropped (+30 more)

### Community 28 - "Verification Flow"
Cohesion: 0.08
Nodes (52): discForDivision(), discName(), divConflict(), divisionForDisc(), DIVISIONS, divOf(), AV, docSize() (+44 more)

### Community 29 - "concrete-calc.ts"
Cohesion: 0.14
Nodes (22): concrete · حصر وصب الخرسانة (Concrete take-off & pour planner), Striking, curing and cube-test calendar, Cold-joint guard A_max = Q_eff·t_cover/layer, CONC_ENGINE, concColdJoint(), ConcCubeRule, concCubes(), ConcElement (+14 more)

### Community 30 - "QA/QC Checklists"
Cohesion: 0.10
Nodes (47): checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections), jpegsOf(), CATEGORIES, categoryOf(), cleanTemplate(), Custom, customKey(), isUserTemplate() (+39 more)

### Community 31 - "Row Mapping & Hydrate"
Cohesion: 0.12
Nodes (34): addPost(), addReview(), latestShares(), loadAll(), postById(), postJob(), withMedia(), mediaUrl() (+26 more)

### Community 32 - "Document kit src/doc (DocSpec → docLayout → backends)"
Cohesion: 0.08
Nodes (15): Colophon (technical data only: profiles, engines, SHA-256), Paged tables with «يُرحّل / ما قبله» carry-forward rows, baseline(), fixedMeasurer, ColophonData, DocBackend, DocCol, DocFont (+7 more)

### Community 33 - "Level Book Tool"
Cohesion: 0.15
Nodes (30): Two-peg collimation test «اختبار الوتدين», levelBook · دفتر الميزانية (Levelling field book + two-peg test), survey-eng@1 (allowance presets, two-peg limit), has(), LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust(), LvlAllow (+22 more)

### Community 34 - "Trade Kit Calculator"
Cohesion: 0.10
Nodes (44): Material request «طلب خامات» (MR, kind materialRequest), eg-site@1 (trade kit: mixes, waste, hollow-block mortar, sheet size), Trade-kit tiles beyond civil (electrician, plumber, drywall, structural steel), tradeKit · حاسبة الصنايعي (Trade quick kit), CALIB_DEFAULT, HOLLOW_MORTAR_L_M2, PLASTER_PRESETS, STEEL_SECTIONS (+36 more)

### Community 35 - "AI CV Review & Redaction"
Cohesion: 0.15
Nodes (25): AiCv, AIX, allowedNumbers(), arr(), both(), draftOf(), factsOf(), forbiddenFinding() (+17 more)

### Community 36 - "README, CI & Live Preview"
Cohesion: 0.10
Nodes (13): Laptop + phone live preview (npm run live, port 8770), name, on, pull_request, push, workflow_dispatch, permissions, contents (+5 more)

### Community 37 - "CV Hiring Panel"
Cohesion: 0.10
Nodes (28): NO_DICT, FIGURE, gradeIntel, GradeTier, hiringPanel(), interviewQuestions(), ISSUE_OWNERS, issueReasons() (+20 more)

### Community 38 - "host.tsx"
Cohesion: 0.12
Nodes (31): DocPreview (same display list and layout object as export), DOCNO_PRESETS, docNoPatternProblem(), formatDocNo(), withRevision(), DocWbs, loadDocFonts(), renderDoc() (+23 more)

### Community 39 - "PHASE2.md — Supabase (Frankfurt) and Capacitor 8"
Cohesion: 0.08
Nodes (23): admin_accounts — mod_ref list with moderation fields only, admin_delete_content() — permanent delete by admins, admin_directory — admins-only member directory keyed by pid, delete_my_post() — removes replies, reactions, authorship and the image, EngSpace — anonymous career and salary network for Egyptian engineers, Yousef — owner (architect / BIM coordinator), first admin, Staff roles (profiles.staff moderator / admin; role stays engineer), PHASE2.md — Supabase (Frankfurt) and Capacitor 8 (+15 more)

### Community 40 - "CI Workflow Steps"
Cohesion: 0.08
Nodes (32): needs, runs-on, steps, runs-on, steps, runs-on, steps, needs (+24 more)

### Community 41 - "Runtime Dependencies (Capacitor)"
Cohesion: 0.06
Nodes (36): dependencies, @capacitor/browser@8.0.5, @capacitor/camera@8.2.5, @capacitor/keyboard@8.0.6, @capacitor/preferences@8.0.1, @capacitor/push-notifications@8.1.3, @capacitor/share@8.0.3, @capacitor/splash-screen@8.0.2 (+28 more)

### Community 42 - "Push Delivery (FCM/APNs)"
Cohesion: 0.09
Nodes (37): PUSH.md — push notifications, Apple Push Notification service (APNs, iOS), Firebase Cloud Messaging (FCM, Android), Inflation month notice, private.kick_push() + engspace-push-sweep cron, Private message notices, Notification preferences (notification_prefs + profiles.settings.notify), notifications_push trigger (switch on + device registered) (+29 more)

### Community 43 - "Text Guard (Language Filter)"
Cohesion: 0.11
Nodes (31): AR_HATE, AR_HATE_ADDR, AR_INSULTS, AR_MILD, AR_NAME_EXCEPTIONS, AR_PREFIX, AR_PROFANITY, AR_PROFANITY_PHRASES (+23 more)

### Community 44 - "iOS App Shell"
Cohesion: 0.08
Nodes (4): Capacitor, AppDelegate, SceneDelegate, UIKit

### Community 45 - "App Entry & Bootstrap"
Cohesion: 0.09
Nodes (28): Modules written by hand in Phase 1 (main, App, TopBar, ScreenLoading, vendor, ocr, i18n), react-dom@18.3.1, react-dom, AdminGate, AdminView, App(), ErrorBoundary, installPressFeedback() (+20 more)

### Community 46 - "PDF Rendering & Theme"
Cohesion: 0.08
Nodes (34): Ctx, DrawOptions, drawPage(), fitRect(), imageKey(), encodeIndexed(), hexRgb(), LUTS (+26 more)

### Community 47 - "Release Builds Workflow"
Cohesion: 0.09
Nodes (30): runs-on, steps, GH_REPO, GH_TOKEN, GOOGLE_SERVICES_JSON, TAG, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY (+22 more)

### Community 48 - "cv/docx.ts"
Cohesion: 0.35
Nodes (10): bullet(), coreXml(), documentXml(), DOCX_MIME, draftDocx(), esc(), headingOf(), para() (+2 more)

### Community 49 - "Media Upload Function"
Cohesion: 0.10
Nodes (35): ascii(), check(), Chunk, concat(), CORS, handle(), json(), removeAll() (+27 more)

### Community 50 - "Test React Stubs"
Cohesion: 0.07
Nodes (10): jsx(), jsxDEV(), jsxs(), Component, createContext(), c, Fragment, lazies (+2 more)

### Community 51 - "hardening.test.ts"
Cohesion: 0.07
Nodes (25): DOC_GUARD, isToolDoc(), isToolTomb(), jsonbBytes(), mergeDoc(), MergeOut, plainText(), SHARD_GUARD (+17 more)

### Community 52 - "i18n Core"
Cohesion: 0.15
Nodes (28): AR_CHARS, arResidue(), elText(), fillPattern(), freeText(), I18N_ATTR_SEL, I18N_ATTRS, I18N_INLINE (+20 more)

### Community 53 - "Android MainActivity"
Cohesion: 0.10
Nodes (4): MainActivity, WebViewListener, Viewport meta disabling pinch / double-tap zoom, EngViewController

### Community 54 - "helpers.ts"
Cohesion: 0.16
Nodes (12): CASES, FORMS, ANSWER, ROLES, TABS, demoAs(), noClipped(), noCrash() (+4 more)

### Community 55 - "Seed Accounts Workflow"
Cohesion: 0.07
Nodes (26): default, description, options, required, type, PROJECT_REF, SEED_API_URL, SUPABASE_ACCESS_TOKEN (+18 more)

### Community 56 - "Salary Explorer Schema"
Cohesion: 0.10
Nodes (20): authorship_account, private.authorship, public.is_mine(), public.salary_bands(), public.salary_shares, salary_shares_author, salary_shares_cell, public.delete_my_account() (+12 more)

### Community 57 - "npm Scripts"
Cohesion: 0.07
Nodes (28): scripts, build, cap:sync, check, db:admin, db:env, db:functions, db:reset (+20 more)

### Community 58 - "landing.test.ts"
Cohesion: 0.14
Nodes (26): kgPerM(), clamp(), clampSlab(), f(), POUR_DEFAULTS, SLAB_BARS, SLAB_COVER_MM, SLAB_DEFAULT (+18 more)

### Community 59 - "AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)"
Cohesion: 0.09
Nodes (30): AI.md — «المهندس الذكي» Smart Engineer (v0.29.0), private.ai_config (enabled, daily_limit, model, model_light), ai_quota() — remaining units for the quota chip, ai_rate() — 👍 / 👎 per feature, ai_refund() — unit back when the model fails before the first word, ai_take() — takes one unit (money:false for supervisors), ai_tokens() — token counts only, Daily AI allowance (25 per Cairo day per member) (+22 more)

### Community 60 - "tool-docs.ts"
Cohesion: 0.09
Nodes (31): Calculation-basis block {k:'basis'} on every calculation PDF, ecp-fire@0 (disabled ECP fire profile), ToolDoc envelope (kind, v, lang, engine, frozen, profile, body, photos, log, audit), LOG_CAP, ProfileSnap, ToolDoc, ToolDocLogEntry, ToolDocStatus (+23 more)

### Community 61 - "Search Index"
Cohesion: 0.18
Nodes (23): isEn(), AR_INDIC, AR_PREFIXES, AR_SUFFIXES, bigrams(), buildSearchIndex(), damerau(), dice() (+15 more)

### Community 62 - "harness.ts"
Cohesion: 0.10
Nodes (10): C, html, modules, sources, src, localStorage, store, names (+2 more)

### Community 63 - "Native Glue & Sharing"
Cohesion: 0.12
Nodes (19): @capacitor/app@8.1.2, @capacitor/haptics@8.0.2, @capacitor/status-bar@8.0.4, @capacitor/app, @capacitor/haptics, @capacitor/status-bar, linkFor(), parseOpenLink() (+11 more)

### Community 64 - "Cloud Profile & Uploads"
Cohesion: 0.15
Nodes (17): currentPersona(), e164(), friendly(), markContacted(), myProfile(), saveProfile(), setAvatar(), setPassword() (+9 more)

### Community 65 - "Native Camera Flow"
Cohesion: 0.15
Nodes (21): @capacitor/core@8.5.2, @capacitor/filesystem@8.1.4, @capacitor/core, @capacitor/filesystem, useCameraShot(), cameraAccess(), isCancel(), isDenied() (+13 more)

### Community 66 - "Image Compression"
Cohesion: 0.16
Nodes (17): canEncodeWebp(), compressCanvas(), Compressed, compressImage(), dataUrlToBlob(), decode(), Decoded, encode() (+9 more)

### Community 67 - "Media Privacy Schema"
Cohesion: 0.12
Nodes (16): media_register() upload quotas, private.photo_guard — profile photo must be the member's own avatar upload, media_uploads_open, media_uploads_owner, posts_z_media, private.kick_media(), private.media_uploads, private.photo_guard() (+8 more)

### Community 68 - "Security Armor Schema"
Cohesion: 0.10
Nodes (23): public.member_state, comments_a_rate, company_reviews_a_rate, job_views_account, jobs_a_rate, member_state_a_keys, messages_a_rate, posts_a_rate (+15 more)

### Community 69 - "helpers.ts"
Cohesion: 0.16
Nodes (19): ADMIN_PW, CRASH, DOMAIN, newMember(), publish(), PW, settle(), signIn() (+11 more)

### Community 70 - "Deploy DB Steps"
Cohesion: 0.09
Nodes (23): env, runs-on, steps, ADMIN_EMAIL, APNS_KEY_ID, APNS_KEY_P8, APNS_TEAM_ID, FCM_SERVICE_ACCOUNT (+15 more)

### Community 71 - "publish.mjs"
Cohesion: 0.09
Nodes (18): st, out, env, r, st, base, bytes, dist (+10 more)

### Community 72 - "OCR & Vendor Loading"
Cohesion: 0.11
Nodes (20): Next: high-impact features (market transparency, daily engineering tools), MIGRATION.md — Phase 1 prototype migration, Dead logo controls removed after the brand board, mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87), pdf.js CVE-2024-4367 fix (getDocument with isEvalSupported: false), Phase 1: single-file prototype → bundled Vite + React + TypeScript, v24 single-file prototype (27 script parts, one global scope), Run modes: Demo / Cloud / Native (+12 more)

### Community 73 - "i18n Build & Vitest Config"
Cohesion: 0.26
Nodes (13): i18n extract / build scripts ported to Node, buildDict(), [cmd = "build", ...args], contentKeys(), kid(), lines(), loadExtra(), loadKeys() (+5 more)

### Community 74 - "Migration Analyzer Script"
Cohesion: 0.10
Nodes (19): brandView, checker, declOf, fs, fwdEval, host, inFn(), out (+11 more)

### Community 75 - "Messaging Schema"
Cohesion: 0.15
Nodes (19): messages_thread, private.in_thread(), private.messages, private.threads, public.my_threads(), public.send_message(), public.set_thread_identity(), public.start_thread() (+11 more)

### Community 76 - "Brand Mark Rendering"
Cohesion: 0.10
Nodes (19): E+S brand mark (src/ui/brand-mark.json) and icon generation, data, markPolys(), markSvg(), pts(), C, { chromium }, font (+11 more)

### Community 77 - "Tool Registry & Gate"
Cohesion: 0.16
Nodes (17): Salary & offers pack «الراتب والعروض» 💲 (money), Salary & offer tools (offer, net, compare, script, raise, path, contract, move, inflation), SITE_TOOLS, BY_ID, DESIGN, ENTRIES, FIELD, GROUP_OF (+9 more)

### Community 78 - "AI Client Service"
Cohesion: 0.13
Nodes (21): FormKind, X, useQuota(), AiAsk, AiError, AiFeature, AiMsg, AiResult (+13 more)

### Community 79 - "i18n String Extractor"
Cohesion: 0.13
Nodes (16): @babel/types@^8.0.6, @babel/types, byKind, hasProp(), inRegexCtx(), inType(), isBilingual(), isContent() (+8 more)

### Community 80 - "PDF Writer"
Cohesion: 0.20
Nodes (9): enc, num(), pdfDate(), PdfImage, PdfInfo, PdfPage, PdfPlacement, pdfString() (+1 more)

### Community 81 - "Support Tickets Schema"
Cohesion: 0.16
Nodes (12): public.admin_directory(), public.admin_directory_set_staff(), public.admin_message(), public.admin_public_items(), public.open_ticket(), public.reply_ticket(), public.staff_reply_ticket(), public.staff_set_ticket_status() (+4 more)

### Community 82 - "Net Pay & Offers"
Cohesion: 0.29
Nodes (13): evaluateOffer(), MEDICAL_VALUE, offerNet(), offerPackage(), percentileOf(), round500(), annualTax(), BRACKET_LOSS (+5 more)

### Community 83 - "CV HR Assessment"
Cohesion: 0.16
Nodes (16): CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, CV_UNIS, candidateGender(), egyptian(), EMPLOYERS, hrAssessment (+8 more)

### Community 84 - "Document hash and fingerprint «بصمة المستند»"
Cohesion: 0.90
Nodes (3): canonical(), contentHash(), sha256Hex()

### Community 85 - "vitest"
Cohesion: 0.10
Nodes (12): vitest, auth, calls, css, view, names, names, names (+4 more)

### Community 86 - "phone-server.mjs"
Cohesion: 0.18
Nodes (11): args, buildStamp(), COMPRESS, DIST, LAN, NO_STORE, PORT, resolveFile() (+3 more)

### Community 87 - "Scorecards & Raises Schema"
Cohesion: 0.19
Nodes (9): company_ratings_company, private.drop_raise_reports(), private.raise_rate_limit(), public.company_ratings, public.company_scorecard(), public.raise_reports, raise_reports_a_limit, raise_reports_author (+1 more)

### Community 88 - "Realtime Feed Schema"
Cohesion: 0.19
Nodes (13): comments_feed_new, comments_moderation, company_reviews_moderation, jobs_moderation, posts_moderation, private.feed_comment_new(), private.feed_moderation(), private.profile_ping() (+5 more)

### Community 89 - "kit-workstation.test.ts"
Cohesion: 0.32
Nodes (10): figureValue(), isFigure(), RollChar(), rollDirection(), RollNumber(), all(), css, El (+2 more)

### Community 90 - "env"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, env, if, runs-on, steps, BRANCH (+35 more)

### Community 91 - "Gradual Typing Scripts"
Cohesion: 0.15
Nodes (10): fs, path, ts, walk(), files, fs, path, edit() (+2 more)

### Community 92 - "templates.tsx"
Cohesion: 0.10
Nodes (43): cleanRev(), Envelope, ParsedTemplateFile, parseTemplateFile(), Sign, TEMPLATE_FILE_PROBLEM, TemplateFileProblem, newDocId() (+35 more)

### Community 93 - "palette.test.ts"
Cohesion: 0.11
Nodes (35): isPaletteKey(), openPalette(), paletteHint(), PaletteHost(), PalettePanel, GROUP_ICON, Icon, iconOf() (+27 more)

### Community 94 - "Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)"
Cohesion: 0.09
Nodes (23): EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md), cvreview · مراجعة السيرة الذاتية (CV review, the only HR tool), Phase 0 ✅: research briefs and groundwork (num-input, share-cancel, glyph preload), Phase 1: Foundation (registry/gate, Tools tab, store, projects, UI kit, document kit, QA/QC), Phase L3: optional native batch (nativeLine 3: geolocation, text-to-speech, Downloads), Codebase seams review (§9.2), Risk register (14 risks with mitigations), Storage meter «التخزين» (bodies, photos, device archive, JSON backup) (+15 more)

### Community 95 - "Smoke Render Tests"
Cohesion: 0.12
Nodes (9): Test-harness constraints (smoke crawl, stub React, no top-level side effects), crawl(), fakeEvent, handlerErrors, render(), seen, setups, signIn() (+1 more)

### Community 96 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noImplicitAny (+6 more)

### Community 97 - "vitest.config.ts"
Cohesion: 0.25
Nodes (3): here(), iconsUsed(), lucideStub

### Community 98 - "ipc.tsx"
Cohesion: 0.09
Nodes (41): computeIpc(), fin(), fmt(), IPC_ENGINE, IpcDeduction, IpcIssue, IpcItem, IpcLine (+33 more)

### Community 100 - "Verification Schema"
Cohesion: 0.11
Nodes (17): default, description, required, admin_email, on, push, workflow_dispatch, branches (+9 more)

### Community 101 - "Company Scorecard UI"
Cohesion: 0.35
Nodes (10): Agg, demoScorecard(), FactorId, factorOf(), FACTORS, nearest(), SCORE_MIN, scorecardOf() (+2 more)

### Community 102 - "UI Crawler Tool"
Cohesion: 0.31
Nodes (10): act(), auditArabic(), crawlState(), elements(), handled(), reach(), report(), reset() (+2 more)

### Community 104 - "Post Author Controls"
Cohesion: 0.40
Nodes (5): posts_feed_edit, private.feed_post_edit(), public.delete_my_post(), public.edit_my_post(), public.my_posts()

### Community 105 - "Release Workflow Inputs"
Cohesion: 0.18
Nodes (10): tag, name, on, workflow_dispatch, permissions, contents, default, description (+2 more)

### Community 106 - "rc-section.tsx"
Cohesion: 0.11
Nodes (34): barArea(), beta1(), checkRc(), chk(), DEPTH, ECU, ES, phiFlex() (+26 more)

### Community 107 - "raises.ts"
Cohesion: 0.67
Nodes (5): addMonths(), cumulative(), monthsBetween(), realHistory(), Series

### Community 108 - "Test Account Seeder"
Cohesion: 0.18
Nodes (8): API, call(), def, findId(), h, remove, results, year

### Community 109 - "client.ts"
Cohesion: 0.33
Nodes (3): nativeStorage, SUPABASE_KEY, SUPABASE_URL

### Community 110 - "Num"
Cohesion: 0.07
Nodes (89): AUTH_REDIRECT_NATIVE, BACKEND, forcedDemo(), isCloud(), areaOf, citiesOf(), CITY_COUNT, cityName() (+81 more)

### Community 111 - "v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off"
Cohesion: 0.33
Nodes (5): 2. Omnisearch (Ctrl/⌘K), 4. CV review (AI side), 5. Voice take-off, Tests, v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off

### Community 112 - "AI Response Schemas"
Cohesion: 0.32
Nodes (4): A(), CV_DOC, O(), ROWS()

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
Cohesion: 0.08
Nodes (42): agrees(), BUILTIN_FMT, cellsOf(), cellXml(), clean(), colName(), COLOR, coreXml() (+34 more)

### Community 117 - "register.tsx"
Cohesion: 0.13
Nodes (28): addDays(), num(), daysBetween(), DONE, isDate(), REG_ENGINE, REG_KINDS, RegDoc (+20 more)

### Community 118 - "Media E2E Tests"
Cohesion: 0.20
Nodes (4): composer(), EXIF, sharp@0.32.6, sharp

### Community 119 - "Publish Workflow Steps"
Cohesion: 0.25
Nodes (8): steps, if, name, run, uses, with, cache, node-version

### Community 120 - "qto.tsx"
Cohesion: 0.07
Nodes (43): DocText, AR_MONTHS, EN_MONTHS, iso(), LRI, PDI, XCell, XFmt (+35 more)

### Community 121 - "Publish Job Config"
Cohesion: 0.29
Nodes (7): CHANNEL, PROJECT_REF, SUPABASE_ACCESS_TOKEN, jobs, publish, env, runs-on

### Community 122 - "Node TS Config"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, allowImportingTsExtensions, types, extends, include

### Community 123 - "public.profiles"
Cohesion: 0.09
Nodes (25): on_auth_user_created, private.author_snapshot(), private.can_act(), private.handle_new_user(), private.profile_guard(), private.touch_updated_at(), profiles_guard, profiles_touch (+17 more)

### Community 124 - "Checklists E2E"
Cohesion: 0.60
Nodes (4): build(), builder(), downloadPdf(), insp()

### Community 125 - "Publish Workflow Header"
Cohesion: 0.33
Nodes (5): concurrency, name, on, permissions, contents

### Community 126 - "doc-controls.test.ts"
Cohesion: 0.10
Nodes (34): Decisions worth knowing, The editable workstation (v0.39) — architectural report, Verification, What changed, by layer, applyDocControls(), cleanSign(), cleanTitleExtras(), controlsForHash() (+26 more)

### Community 127 - "boq-ui.tsx"
Cohesion: 0.15
Nodes (25): colIndex(), decode(), ReadSheet, readXlsx(), textOf(), applyMeasured(), BOQ_ENGINE, BoqField (+17 more)

### Community 128 - "Broadcast Input"
Cohesion: 0.40
Nodes (5): default, description, required, type, broadcast

### Community 129 - "duct.tsx"
Cohesion: 0.14
Nodes (26): AIR, ceilStep(), DUCT_ENGINE, ductFriction(), DuctLimits, DuctMat, DuctRun, DuctRunOut (+18 more)

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

### Community 137 - "playwright.config.ts"
Cohesion: 0.33
Nodes (5): chromiumUse, { defaultBrowserType: _a, ...iphoneNoEngine }, { defaultBrowserType: _b, ...pixel }, { defaultBrowserType: _c, ...desktop }, iphone

### Community 138 - "pgTAP Push Tests"
Cohesion: 0.50
Nodes (3): claimed, th, tk

### Community 171 - "Product scope review (§9.3)"
Cohesion: 0.16
Nodes (19): coolingLoad · حمل التبريد واختيار الوحدات (Cooling load & unit selection), dayworkSheet · يوميات الأعمال الإضافية (Daywork sheet, no rates), Excel & CSV export (docXlsx / docCsv), fieldDensity · الكثافة الحقلية (Field density & compaction QC), finishTakeoff · حصر التشطيبات (Room-based finishes take-off), irRegister · سجل طلبات الاستلام (IR / WIR / MIR register), masonry · حصر المباني (legacy tool merged into tradeKit), meetingMinutes · محضر اجتماع (Meeting minutes) (+11 more)

### Community 172 - "toolAllowed"
Cohesion: 0.19
Nodes (20): 1. Tools by discipline, headerOf(), ToolHeader, wbsPath(), ToolPacks(), ToolScreen(), TemplateShelf(), today() (+12 more)

### Community 173 - "export-parity.test.ts"
Cohesion: 0.11
Nodes (22): 3. Word and Excel mirror the PDF, specDocx(), stylesXml(), fingerprint(), stripIsolates(), specXlsx(), DocShowcase(), drawSamples() (+14 more)

### Community 175 - "mfa.ts"
Cohesion: 0.20
Nodes (16): assurance(), clean(), enroll(), Enrolment, Factor, factors(), fail(), gateState (+8 more)

### Community 176 - "doc-xlsx.test.ts"
Cohesion: 0.12
Nodes (10): DOCX_MIME, DocSpec, XLSX_MIME, module, module, module, blocks, bbsBody() (+2 more)

### Community 178 - "ipc · المستخلص الجاري 💲 (Interim payment certificate)"
Cohesion: 0.41
Nodes (12): delayPenalty · غرامات التأخير 💲 (Delay penalty), finalAccount · الحساب الختامي 💲 (Final account), ipc · المستخلص الجاري 💲 (Interim payment certificate), Contracts & payments pack «العقود والمستخلصات» 💲 (contracts), Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement), Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts), priceAdjust · فروق الأسعار 💲 (Price adjustment), rateAnalysis · تحليل سعر البند 💲 (Unit-rate build-up) (+4 more)

### Community 179 - "strict-check.mjs"
Cohesion: 0.15
Nodes (13): @babel/parser@^8.0.6, @babel/traverse@^8.0.6, @babel/parser, @babel/traverse, base, BASELINE, explicitAny(), now (+5 more)

### Community 180 - "Capacitor 8 iOS / Android shells"
Cohesion: 0.40
Nodes (3): Capacitor 8 iOS / Android shells, CapApp-SPM README (Capacitor SPM host package), PackageDescription

### Community 182 - "updater-flow.test.ts"
Cohesion: 0.18
Nodes (5): file(), plist(), manifest(), P, sha

### Community 183 - "live-update-ui.test.ts"
Cohesion: 0.50
Nodes (3): base, find(), flat()

### Community 184 - "The website (Cloudflare Pages)"
Cohesion: 0.33
Nodes (5): Custom domain (engspace.org), One-time setup (owner), The public page, The website (Cloudflare Pages), What the workflow also does

### Community 185 - "hardening.test.ts"
Cohesion: 0.17
Nodes (13): Project profile ToolProject (one profile for every title block), ISO 19650 (information management, document numbering), blankProject(), KEY(), loadProjects(), PROJECT_CODE, SignRole, storeProjects() (+5 more)

### Community 187 - "update-banner.test.ts"
Cohesion: 0.40
Nodes (4): apply, find(), flat(), ready

### Community 188 - "post-author.test.ts"
Cohesion: 0.28
Nodes (6): edit_my_post() — own post, counts only real text changes, my_posts() — server answer to which posts are mine, EditedBadge(), editedWord(), flat(), sql

## Ambiguous Edges - Review These
- `Simple mode «وضع مبسّط» (one colloquial question per screen)` → `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Technical office pack «المكتب الفني» (office)` → `Tools tab ToolsTab (Today strip, search, «الأخيرة», packs)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `takeoffSheet · كشف الحصر (Measurement / take-off sheet)` → `Phase 5: vector backend and wave-2 tools`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references
- `Phase 4b: money tools straight after the W1 gate (ipc, voRegister, subStatement)` → `Phase 6: Office and money (ipc, voRegister, tool_docs, doc_receipts)`  [AMBIGUOUS]
  docs/TOOLS-BLUEPRINT.md · relation: references

## Knowledge Gaps
- **10 isolated node(s):** `PackageDescription`, `RFC-6238`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }`, `Job views count once per member per job per day` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1245 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — EngSpace project memory` connect `Project Rules (CLAUDE.md)` to `stack.tsx`, `App Shell & Push Client`, `updater.ts`, `CV Screen & Settings`, `Rebar BBS & Cutting`, `CV Rebuild & Translate`, `AI Proxy (ai-chat)`, `AI CV Review & Redaction`, `README, CI & Live Preview`, `CV Hiring Panel`, `PHASE2.md — Supabase (Frankfurt) and Capacitor 8`, `Push Delivery (FCM/APNs)`, `Media Upload Function`, `Android MainActivity`, `helpers.ts`, `updater-flow.test.ts`, `AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)`, `post-author.test.ts`, `harness.ts`, `Native Glue & Sharing`, `Cloud Profile & Uploads`, `Native Camera Flow`, `Security Armor Schema`, `OCR & Vendor Loading`, `Brand Mark Rendering`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `Release Workflow Inputs`, `client.ts`, `Admin Cloud Adapter`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AppView()` (e.g. with `2. Omnisearch (Ctrl/⌘K)` and `jobStats0()`) actually correct?**
  _`AppView()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `RFC-6238`, `./tsconfig.json` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stack.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.039129133622624566 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `stack.tsx`, `duct.tsx`, `Tool Screens & UI Kit`, `App Shell & Push Client`, `qto-calc.ts`, `v24.test.ts`, `updater.ts`, `voice-parse.ts`, `MEP & Cable Tools`, `Rebar BBS & Cutting`, `drafting.tsx`, `permit.tsx`, `AssistantScreen.tsx`, `Dev Dependencies`, `CV Rebuild & Translate`, `AI Proxy (ai-chat)`, `concrete-calc.ts`, `QA/QC Checklists`, `Row Mapping & Hydrate`, `Document kit src/doc (DocSpec → docLayout → backends)`, `Level Book Tool`, `Trade Kit Calculator`, `AI CV Review & Redaction`, `Push Delivery (FCM/APNs)`, `toolAllowed`, `export-parity.test.ts`, `PDF Rendering & Theme`, `mfa.ts`, `doc-xlsx.test.ts`, `Media Upload Function`, `v21.test.ts`, `hardening.test.ts`, `v22.test.ts`, `typing-ratchet.test.ts`, `updater-flow.test.ts`, `live-update-ui.test.ts`, `hardening.test.ts`, `landing.test.ts`, `update-banner.test.ts`, `post-author.test.ts`, `harness.ts`, `Native Glue & Sharing`, `Native Camera Flow`, `Image Compression`, `Tool Registry & Gate`, `Net Pay & Offers`, `CV HR Assessment`, `kit-workstation.test.ts`, `templates.tsx`, `palette.test.ts`, `Smoke Render Tests`, `vitest.config.ts`, `ipc.tsx`, `Company Scorecard UI`, `raises.ts`, `Num`, `xlsx.ts`, `register.tsx`, `qto.tsx`, `doc-controls.test.ts`, `boq-ui.tsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Simple mode «وضع مبسّط» (one colloquial question per screen)` and `Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._