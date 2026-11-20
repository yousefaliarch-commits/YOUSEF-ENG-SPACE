# Graph Report - yousef-eng-space  (2026-11-20)

## Corpus Check
- 433 files · ~693,985 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 99 file(s) not represented in the graph (top: .tsv 61, .xml 12, (none) 8)

## Summary
- 4925 nodes · 15538 edges · 192 communities (145 shown, 47 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 693 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `be0a86ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tabs.tsx
- Identity, Auth & Onboarding
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
- stack.tsx
- QA/QC Checklists
- Row Mapping & Hydrate
- settings.tsx
- Level Book Tool
- Trade Kit Calculator
- AI CV Review & Redaction
- README, CI & Live Preview
- CV Hiring Panel
- buildSpec
- PHASE2.md — Supabase (Frankfurt) and Capacitor 8
- CI Workflow Steps
- Runtime Dependencies (Capacitor)
- Push Delivery (FCM/APNs)
- Text Guard (Language Filter)
- AppDelegate
- App Entry & Bootstrap
- model.ts
- Release Builds Workflow
- PanelViews.tsx
- Media Upload Function
- Test React Stubs
- hardening.test.ts
- i18n Core
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
- Native Glue & Sharing
- Cloud Profile & Uploads
- Native Camera Flow
- Image Compression
- Media Privacy Schema
- Security Armor Schema
- posts.spec.ts
- Deploy DB Steps
- Secondary
- OCR & Vendor Loading
- i18n Build & Vitest Config
- Migration Analyzer Script
- Messaging Schema
- Brand Mark Rendering
- companies.tsx
- bbs.tsx
- i18n String Extractor
- PDF Writer
- Support Tickets Schema
- Net Pay & Offers
- CV HR Assessment
- lucide-react
- native-auth.test.ts
- native/push.ts
- Scorecards & Raises Schema
- Realtime Feed Schema
- ui-style.ts
- env
- Gradual Typing Scripts
- templates.tsx
- palette.test.ts
- Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)
- Smoke Render Tests
- TypeScript Config
- 20261020000026_ai.sql
- ipc.tsx
- setup-globals.ts
- Verification Schema
- Company Scorecard UI
- UI Crawler Tool
- Android Test Stubs
- Release Workflow Inputs
- rc-section.tsx
- raises.ts
- Test Account Seeder
- config.ts
- FilterChip
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
- host.tsx
- SceneDelegate
- Broadcast Input
- rc-calc.ts
- v24.test.ts
- qto-calc.ts
- Notes Input
- Push Body Input
- Push Title Input
- Push Title (EN) Input
- playwright.config.ts
- pgTAP Push Tests
- pgTAP Media Tests
- MainActivity
- pgTAP Author Tests
- pgTAP Security Tests
- pgTAP Moderation Tests
- pgTAP Verification Tests
- pgTAP Admin Delete Tests
- Brand Polygon Data
- Product scope review (§9.3)
- Zoom lock (v0.1.8: viewport meta, touch-action, gesture listeners, native views)
- export-parity.test.ts
- v21.test.ts
- mfa.ts
- toolbox.tsx
- v22.test.ts
- siteDiary · يومية الموقع (Daily site diary)
- strict-check.mjs
- MIGRATION.md — Phase 1 prototype migration
- Account deletion wipes the device store (toolStore.destroy)
- Tool routes #app/tool/<id>, #app/tooldoc/<id>:<docId|new>, toolprojects, toolstorage, v
- live-update-ui.test.ts
- The website (Cloudflare Pages)
- Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)
- cubeLog · سجل مكعبات الخرسانة (Concrete cube register)
- post-author.test.ts
- storeDevice

## God Nodes (most connected - your core abstractions)
1. `AppView()` - 166 edges
2. `Num()` - 151 edges
3. `CLAUDE.md — EngSpace project memory` - 115 edges
4. `Panel()` - 91 edges
5. `supabase()` - 87 edges
6. `vitest` - 83 edges
7. `Secondary()` - 74 edges
8. `Primary()` - 71 edges
9. `react` - 64 edges
10. `lucide-react` - 60 edges

## Surprising Connections (you probably didn't know these)
- `2. Omnisearch (Ctrl/⌘K)` --references--> `AppView()`  [INFERRED]
  docs/OMNISEARCH-VOICE.md → src/app/AppView.tsx
- `Run modes: Demo / Cloud / Native` --references--> `forcedDemo()`  [INFERRED]
  docs/PHASE2.md → src/backend/config.ts
- `Tools i18n plan (Arabic in code, English TSV 52–61, split tool dictionary)` --references--> `DICT`  [INFERRED]
  docs/TOOLS-BLUEPRINT.md → src/i18n/i18n.ts
- `mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87)` --references--> `loadMammoth()`  [INFERRED]
  docs/MIGRATION.md → src/lib/vendor.ts
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

## Communities (192 total, 47 thin omitted)

### Community 0 - "tabs.tsx"
Cohesion: 0.05
Nodes (125): isCloud(), catName(), CATS, company(), GENERAL_ROOM, areaOf, CITIES, citiesOf() (+117 more)

### Community 1 - "Identity, Auth & Onboarding"
Cohesion: 0.06
Nodes (92): ACCOUNT_KEY, ageError(), anonTitle(), AUTHOR_FIELDS, checkPassword(), cleanName(), confirmError(), createAccountRecord() (+84 more)

### Community 2 - "ui/kit.tsx"
Cohesion: 0.11
Nodes (65): ExportBar (sticky .foot: معاينة · تصدير PDF · مشاركة), fmtNum(), colIndex(), decode(), ReadSheet, readXlsx(), textOf(), applyMeasured() (+57 more)

### Community 3 - "App Shell & Push Client"
Cohesion: 0.04
Nodes (95): AppView(), AssistantScreen, ChecklistsScreen, CVReviewScreen, isWorker(), PaneBody, sameSig(), TabPane() (+87 more)

### Community 4 - "Phase 5: vector backend and wave-2 tools"
Cohesion: 0.07
Nodes (45): areaSchedule · جدول المساحات والاشتراطات (Area schedule, zoning & parking), bearingTest · قراءة اختبارات التحمل (CBR / DCP / plate-load reader), chwPipe · مواسير المياه المثلجة (Chilled-water pipe sizing), curveSetOut · توقيع المنحنيات (Horizontal curve setting-out), detectors · توزيع الكواشف (Detector & call-point spacing), drainSize · مقاسات الصرف والتهوية (DFU drainage & vent sizing), ductSizer · مقاسات الدكت (Duct sizer, equal friction), earthing · التأريض واختبار المقاومة (Earth-rod design & test record) (+37 more)

### Community 5 - "Moderation & Admin Console"
Cohesion: 0.05
Nodes (114): COMPANIES, room(), ROOMS, GOVS, JOBS, NOTIFS0, POSTS0, PUB_KARIM (+106 more)

### Community 6 - "updater.ts"
Cohesion: 0.05
Nodes (63): OTA.md — live web updates, app-updates Storage bucket (<channel>/<version>.zip + manifest.json), @capgo/capacitor-updater plugin (CapacitorUpdater, manual mode), Settings → التحديثات الفورية (active bundle, status, manual check), rel(), base, bytes, dist (+55 more)

### Community 7 - "voice-parse.ts"
Cohesion: 0.11
Nodes (33): answerNumber(), applyAnswers(), Bilingual, defaultWaste(), FIELD, KIND_NAME, kindField(), LABELLED (+25 more)

### Community 8 - "MEP & Cable Tools"
Cohesion: 0.05
Nodes (79): Pure tool engines (src/domain/tools/*) + lazy tool screens, acInstall · فحص تركيب التكييف (AC installation check), cableCheck · الكابل وهبوط الجهد (Cable & voltage-drop check), drainRun · مناسيب غرف التفتيش (Drain run invert schedule + sight rails), Owner actions (code texts and reviewers), Phase 4: MEP and electrical quick checks (acInstall, drainRun, sprinklerCheck, cableCheck), ac-site@1 (drain table, minimum slope, ρ), drain-metric@1 / drain-ipc@1 (minimum slopes) (+71 more)

### Community 9 - "Panel"
Cohesion: 0.14
Nodes (30): reviewWithAi(), AiBadge(), AiConsentCard(), AiErrorCard(), AiInsightsCard(), AiRunningCard(), PILLARS, AIX_RUN (+22 more)

### Community 10 - "Rebar BBS & Cutting"
Cohesion: 0.09
Nodes (45): bbs · جدول تفريد وقص الحديد (Bar bending schedule & 12 m cutting optimiser), lapLength · التماسك والوصلات (Development & lap length), Rebar pack (rebar), aci318-19@1 (ACI profile), bs8666-2020@1 (scheduling standard, typed laps), ecp203-2020-bbs@1 (rebar: radius rule, rounding, kg/m, Ld factors), rebar · أوزان الحديد (legacy weight calculator, alias of bbs), Remnant store «مخزن البواقي» (kind rebarStock, per project) (+37 more)

### Community 11 - "Supabase Cloud Client"
Cohesion: 0.08
Nodes (68): @capacitor/browser, supabase(), addComment(), addReview(), closeTicket(), companyScorecard(), contribute(), countJobView() (+60 more)

### Community 12 - "CV Audit Engine"
Cohesion: 0.05
Nodes (68): anyScope(), AR_PUNCT, AR_SLIPS, AR_WEAK_LEAD, auditCV(), bigOf(), cleanObject(), conjToPast() (+60 more)

### Community 13 - "CV Parsing & Extraction"
Cohesion: 0.06
Nodes (57): notWork(), analyseBullet(), AR_MASDAR_PAST, cleanPart(), CV_ACTION_AR, CV_ACTION_EN, CV_BULLET, CV_CERT_LIST (+49 more)

### Community 14 - "drafting.tsx"
Cohesion: 0.10
Nodes (35): clamp(), COS, ISO_MAX_RATIO, ISO_MESH_MAX, ISO_VIEW, isoBox(), IsoDim, IsoGeom (+27 more)

### Community 15 - "concrete.tsx"
Cohesion: 0.09
Nodes (54): concrete · حصر وصب الخرسانة (Concrete take-off & pour planner), Striking, curing and cube-test calendar, Cold-joint guard A_max = Q_eff·t_cover/layer, ecp203-site@1 (concrete: waste, cubes, striking/curing, hourdi, logistics), WhatsApp summary summary(doc, lang), addDays(), CONC_ENGINE, CONC_KINDS (+46 more)

### Community 16 - "permit.tsx"
Cohesion: 0.06
Nodes (58): liftPlan · خطة الرفع المبسطة (Lift plan), hse-intl@1 (OSHA / HSE / EN thresholds, gas limits, power-line table), scaffoldTags · بطاقات السقالات والسلالم (Scaffold, ladder & harness tags), HSE HSG250 (permit-to-work guidance), OSHA 29 CFR 1926 (excavation 651/652, power lines 1408, scaffolds 451), trench · خنادق المواسير (Pipe trench, pipes, manholes, dewatering), workPermit · تصاريح العمل (Permit-to-work with safety calculators), DIARY_ENGINE (+50 more)

### Community 17 - "PDF Page Layout"
Cohesion: 0.15
Nodes (43): Align, anchorX(), baseline(), basisTable(), boxedText(), cellText(), checksTable(), colophon() (+35 more)

### Community 18 - "Push Notifications Schema"
Cohesion: 0.06
Nodes (27): notifications_inbox, public.notifications, public.admin_warn(), public.inflation_rates, comments_notify, inflation_notify, notifications_a_en, notifications_category (+19 more)

### Community 19 - "AssistantScreen.tsx"
Cohesion: 0.08
Nodes (54): ai_quota() — remaining units for the quota chip, react, AssistantScreen(), ChatMsg, key(), load(), save(), STARTERS (+46 more)

### Community 20 - "Content Schema (Posts, Jobs)"
Cohesion: 0.08
Nodes (43): ballots_tally, comments_author, comments_count, comments_parent, comments_post, company_reviews_author, company_reviews_company, job_contacts_count (+35 more)

### Community 21 - "Profiles & Moderation Schema"
Cohesion: 0.11
Nodes (16): audit_log_at, private.id_of_ref(), private.item_mod, private.my_ref(), private.report_targets, public.admin_accounts(), public.admin_set_staff(), public.audit_log (+8 more)

### Community 22 - "Project Rules (CLAUDE.md)"
Cohesion: 0.07
Nodes (28): CLAUDE.md — EngSpace project memory, admin_accounts — mod_ref list with moderation fields only, admin_directory — admins-only member directory keyed by pid, app.engspace:// deep-link scheme (open/<type>/<id>, auth-callback), Company scorecards (company_ratings, company_scorecard()), Playwright e2e suite (iPhone 15 + Pixel 7 profiles, E2E_LIVE / E2E_WEBKIT), Executive A4 inspection report (inspectionPdf, signatures, REPORT_PROMO), member_state — per-member synced key/value store (+20 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.05
Nodes (38): config, devDependencies, autoprefixer@^10.6.1, @capacitor/android@8.5.2, @capacitor/assets@^3.0.5, @capacitor/cli@8.5.2, @capacitor/ios@8.5.2, fake-indexeddb@6.2.5 (+30 more)

### Community 24 - "Word (.docx) Export"
Cohesion: 0.19
Nodes (30): basisBlock(), block(), checksTable(), clean(), coreXml(), dataTable(), documentXml(), esc() (+22 more)

### Community 25 - "CV Rebuild & Translate"
Cohesion: 0.10
Nodes (42): DESIGN_BY_DISC, dimPhrase(), TASK_GENERIC, TITLE_EN, CV_MILITARY_RE, CV_PERSONAL, DraftSection, HEAD (+34 more)

### Community 26 - "AI Proxy (ai-chat)"
Cohesion: 0.11
Nodes (25): AiRequest, Chunk, CORS, DEFAULT_MODEL, ERRORS, FALLBACK_MODELS, Feature, geminiBody() (+17 more)

### Community 27 - "Prototype Migration Generator"
Cohesion: 0.05
Nodes (37): asm, checker, cycles, declMod, dedent(), dfs(), DROP, dropped (+29 more)

### Community 28 - "Verification Flow"
Cohesion: 0.10
Nodes (48): discForDivision(), discName(), divConflict(), divisionForDisc(), DIVISIONS, divOf(), divTitle(), randHex() (+40 more)

### Community 29 - "stack.tsx"
Cohesion: 0.08
Nodes (82): logoSourceLabel(), POST_TYPES, REACTIONS, authorOf(), displayName(), gx(), pickAuthor(), ckey() (+74 more)

### Community 30 - "QA/QC Checklists"
Cohesion: 0.10
Nodes (48): checklists · قوائم الفحص والاستلام (QA/QC checklists & inspections), CATEGORIES, categoryOf(), cleanTemplate(), Custom, customKey(), isUserTemplate(), itemCount() (+40 more)

### Community 31 - "Row Mapping & Hydrate"
Cohesion: 0.13
Nodes (33): addPost(), latestShares(), loadAll(), postById(), postJob(), withMedia(), mediaUrl(), authorFields() (+25 more)

### Community 32 - "settings.tsx"
Cohesion: 0.10
Nodes (33): downloadLinks(), env, Landing(), Level(), PRINCIPLES, RELEASES_URL, GUIDE_HEAD, GUIDE_PULL (+25 more)

### Community 33 - "Level Book Tool"
Cohesion: 0.14
Nodes (29): Two-peg collimation test «اختبار الوتدين», levelBook · دفتر الميزانية (Levelling field book + two-peg test), survey-eng@1 (allowance presets, two-peg limit), has(), LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust(), LvlAllow (+21 more)

### Community 34 - "Trade Kit Calculator"
Cohesion: 0.09
Nodes (50): finishTakeoff · حصر التشطيبات (Room-based finishes take-off), kerbs · البردورات والإنترلوك (Kerbs & interlock), masonry · حصر المباني (legacy tool merged into tradeKit), Quantities & finishes pack (quantities), eg-site@1 (trade kit: mixes, waste, hollow-block mortar, sheet size), steelTakeoff · حصر الحديد الإنشائي (Structural steel take-off), Trade-kit tiles beyond civil (electrician, plumber, drywall, structural steel), tradeKit · حاسبة الصنايعي (Trade quick kit) (+42 more)

### Community 35 - "AI CV Review & Redaction"
Cohesion: 0.14
Nodes (25): AiCv, AIX, allowedNumbers(), arr(), both(), draftOf(), factsOf(), forbiddenFinding() (+17 more)

### Community 36 - "README, CI & Live Preview"
Cohesion: 0.07
Nodes (24): Laptop + phone live preview (npm run live, port 8770), name, on, pull_request, push, workflow_dispatch, permissions, contents (+16 more)

### Community 37 - "CV Hiring Panel"
Cohesion: 0.11
Nodes (25): CV report executive snapshot + collapsible action plan, NO_DICT, FIGURE, GradeTier, hiringPanel(), ISSUE_OWNERS, issueReasons(), issuesFor() (+17 more)

### Community 38 - "buildSpec"
Cohesion: 0.10
Nodes (29): AR_MONTHS, EN_MONTHS, iso(), LRI, PDI, toLs(), computeVo(), Body (+21 more)

### Community 39 - "PHASE2.md — Supabase (Frankfurt) and Capacitor 8"
Cohesion: 0.06
Nodes (28): admin_delete_content() — permanent delete by admins, delete_my_post() — removes replies, reactions, authorship and the image, edit_my_post() — own post, counts only real text changes, my_posts() — server answer to which posts are mine, Yousef — owner (architect / BIM coordinator), first admin, Staff roles (profiles.staff moderator / admin; role stays engineer), PHASE2.md — Supabase (Frankfurt) and Capacitor 8, bootstrap_admin() — first administrator (+20 more)

### Community 40 - "CI Workflow Steps"
Cohesion: 0.08
Nodes (32): needs, runs-on, steps, runs-on, steps, runs-on, steps, needs (+24 more)

### Community 41 - "Runtime Dependencies (Capacitor)"
Cohesion: 0.05
Nodes (49): dependencies, @capacitor/app@8.1.2, @capacitor/browser@8.0.5, @capacitor/camera@8.2.5, @capacitor/filesystem@8.1.4, @capacitor/haptics@8.0.2, @capacitor/keyboard@8.0.6, @capacitor/preferences@8.0.1 (+41 more)

### Community 42 - "Push Delivery (FCM/APNs)"
Cohesion: 0.08
Nodes (39): admin_message — team messages arrive as «فريق EngSpace», Support tickets (support_tickets / ticket_messages, private support bucket), PUSH.md — push notifications, Apple Push Notification service (APNs, iOS), Firebase Cloud Messaging (FCM, Android), Inflation month notice, private.kick_push() + engspace-push-sweep cron, Private message notices (+31 more)

### Community 43 - "Text Guard (Language Filter)"
Cohesion: 0.11
Nodes (31): AR_HATE, AR_HATE_ADDR, AR_INSULTS, AR_MILD, AR_NAME_EXCEPTIONS, AR_PREFIX, AR_PROFANITY, AR_PROFANITY_PHRASES (+23 more)

### Community 45 - "App Entry & Bootstrap"
Cohesion: 0.09
Nodes (28): Modules written by hand in Phase 1 (main, App, TopBar, ScreenLoading, vendor, ocr, i18n), react-dom, AdminGate, AdminView, App(), ErrorBoundary, installPressFeedback(), Landing (+20 more)

### Community 46 - "model.ts"
Cohesion: 0.04
Nodes (70): Calculation-basis block {k:'basis'} on every calculation PDF, Colophon (technical data only: profiles, engines, SHA-256), Issuer title block «خرطوشة», Paged tables with «يُرحّل / ما قبله» carry-forward rows, Project profile ToolProject (one profile for every title block), fflate, PROJECT_CODE, ProjectSnap (+62 more)

### Community 47 - "Release Builds Workflow"
Cohesion: 0.09
Nodes (30): runs-on, steps, GH_REPO, GH_TOKEN, GOOGLE_SERVICES_JSON, TAG, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY (+22 more)

### Community 48 - "PanelViews.tsx"
Cohesion: 0.11
Nodes (27): bullet(), coreXml(), documentXml(), DOCX_MIME, draftDocx(), esc(), headingOf(), para() (+19 more)

### Community 49 - "Media Upload Function"
Cohesion: 0.09
Nodes (37): Inspection photo removal (x-media-action: remove, media_removable), db, ascii(), check(), Chunk, concat(), CORS, handle() (+29 more)

### Community 50 - "Test React Stubs"
Cohesion: 0.07
Nodes (10): jsx(), jsxDEV(), jsxs(), Component, createContext(), c, Fragment, lazies (+2 more)

### Community 51 - "hardening.test.ts"
Cohesion: 0.06
Nodes (39): ToolDoc envelope (kind, v, lang, engine, frozen, profile, body, photos, log, audit), DOC_GUARD, DocWbs, headerOf(), isToolDoc(), isToolTomb(), jsonbBytes(), LOG_CAP (+31 more)

### Community 52 - "i18n Core"
Cohesion: 0.13
Nodes (32): AR_CHARS, arResidue(), DICT, elText(), fillPattern(), freeText(), I18N, I18N_ATTR_SEL (+24 more)

### Community 54 - "helpers.ts"
Cohesion: 0.14
Nodes (19): ANSWER, ROLES, TABS, ADMIN_PW, demoAs(), noClipped(), noCrash(), noOverflow() (+11 more)

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
Cohesion: 0.23
Nodes (16): clamp(), clampSlab(), POUR_DEFAULTS, SLAB_BARS, SLAB_COVER_MM, SLAB_DEFAULT, SLAB_RANGE, SLAB_SPACINGS (+8 more)

### Community 59 - "AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)"
Cohesion: 0.14
Nodes (16): AI.md — «المهندس الذكي» Smart Engineer (v0.29.0), private.ai_config (enabled, daily_limit, model, model_light), ai_rate() — 👍 / 👎 per feature, ai_refund() — unit back when the model fails before the first word, ai_take() — takes one unit (money:false for supervisors), ai_tokens() — token counts only, Daily AI allowance (25 per Cairo day per member), Google Gemini API (streamGenerateContent, SSE) (+8 more)

### Community 60 - "numInputParse"
Cohesion: 0.16
Nodes (17): VPath, DRN_ENGINE, Body, build(), compute(), m3(), mm(), module (+9 more)

### Community 61 - "Search Index"
Cohesion: 0.19
Nodes (18): AR_INDIC, AR_PREFIXES, AR_SUFFIXES, bigrams(), damerau(), dice(), jaroWinkler(), matchQuery() (+10 more)

### Community 62 - "harness.ts"
Cohesion: 0.10
Nodes (13): C, html, modules, sources, src, names, names, names (+5 more)

### Community 63 - "Native Glue & Sharing"
Cohesion: 0.19
Nodes (11): linkFor(), parseOpenLink(), Shareable, snippet(), back(), closed(), copyToClipboard(), initNative() (+3 more)

### Community 64 - "Cloud Profile & Uploads"
Cohesion: 0.17
Nodes (15): currentPersona(), friendly(), markContacted(), myProfile(), saveProfile(), setAvatar(), setPassword(), signIn() (+7 more)

### Community 65 - "Native Camera Flow"
Cohesion: 0.20
Nodes (18): PHOTO_NOTES, useCameraShot(), useImagePicker(), cameraAccess(), isCancel(), isDenied(), markCameraBroken(), NATIVE_MAX (+10 more)

### Community 66 - "Image Compression"
Cohesion: 0.16
Nodes (17): canEncodeWebp(), compressCanvas(), Compressed, compressImage(), dataUrlToBlob(), decode(), Decoded, encode() (+9 more)

### Community 67 - "Media Privacy Schema"
Cohesion: 0.13
Nodes (15): media_register() upload quotas, media_uploads_open, media_uploads_owner, posts_z_media, private.kick_media(), private.media_uploads, private.photo_guard(), private.post_media_in() (+7 more)

### Community 68 - "Security Armor Schema"
Cohesion: 0.11
Nodes (22): public.member_state, comments_a_rate, company_reviews_a_rate, job_views_account, jobs_a_rate, member_state_a_keys, messages_a_rate, posts_a_rate (+14 more)

### Community 69 - "posts.spec.ts"
Cohesion: 0.26
Nodes (10): CRASH, DOMAIN, newMember(), publish(), signIn(), test_info_use(), authorFlow(), badge() (+2 more)

### Community 70 - "Deploy DB Steps"
Cohesion: 0.09
Nodes (23): env, runs-on, steps, ADMIN_EMAIL, APNS_KEY_ID, APNS_KEY_P8, APNS_TEAM_ID, FCM_SERVICE_ACCOUNT (+15 more)

### Community 71 - "Secondary"
Cohesion: 0.17
Nodes (31): posLabel(), day(), demoDirectory(), DirectorySection(), MemberDetail(), STAFF, TicketDetail(), TicketsSection() (+23 more)

### Community 72 - "OCR & Vendor Loading"
Cohesion: 0.12
Nodes (17): maskMoney(), ChooserState, IMAGE_ERRORS, imageAccess(), OPTIONS, PhotoChooser(), scanImageForMoney(), loadImageEl() (+9 more)

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
Cohesion: 0.08
Nodes (21): E+S brand mark (src/ui/brand-mark.json) and icon generation, data, markPolys(), markSvg(), pts(), C, { chromium }, font (+13 more)

### Community 77 - "companies.tsx"
Cohesion: 0.11
Nodes (20): Module ↔ prototype part map, bo(), CAT_DESC, co(), CompanyLogo(), companyMult(), hueOf(), LOGO_FILES (+12 more)

### Community 78 - "bbs.tsx"
Cohesion: 0.19
Nodes (21): BBS_DIAMETERS, BBS_SHAPES, cutPieces(), shapeOf(), barPaths(), BarStrip(), blank(), blankLine() (+13 more)

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
Nodes (15): CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, CV_UNIS, candidateGender(), egyptian(), EMPLOYERS, hrAssessment (+7 more)

### Community 84 - "lucide-react"
Cohesion: 0.18
Nodes (16): lucide-react, INFLATION, INFLATION_SOURCE, lastYear(), monthKey(), InflationPanel(), DEMO_RAISES, KINDS (+8 more)

### Community 86 - "native/push.ts"
Cohesion: 0.17
Nodes (16): @capacitor/push-notifications@8.1.3, @capacitor/push-notifications, NATIVE, PLATFORM, setPendingOpen(), AskState, channels(), enablePush() (+8 more)

### Community 87 - "Scorecards & Raises Schema"
Cohesion: 0.10
Nodes (16): authorship_account, private.authorship, public.is_mine(), public.delete_my_account(), authorship_drop_raises, company_ratings_company, private.drop_raise_reports(), private.raise_rate_limit() (+8 more)

### Community 88 - "Realtime Feed Schema"
Cohesion: 0.19
Nodes (13): comments_feed_new, comments_moderation, company_reviews_moderation, jobs_moderation, posts_moderation, private.feed_comment_new(), private.feed_moderation(), private.profile_ping() (+5 more)

### Community 89 - "ui-style.ts"
Cohesion: 0.20
Nodes (13): OPTIONS, UiStylePicker(), BASE_COLOR, current, DEFAULT_STYLE, listeners, load(), paint() (+5 more)

### Community 90 - "env"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, env, if, runs-on, steps, BRANCH (+35 more)

### Community 91 - "Gradual Typing Scripts"
Cohesion: 0.12
Nodes (12): fs, path, ts, walk(), files, fs, path, edit() (+4 more)

### Community 92 - "templates.tsx"
Cohesion: 0.09
Nodes (42): REV_MAX_LEN, SIGN_MAX, Envelope, ParsedTemplateFile, parseTemplateFile(), Sign, TEMPLATE_FILE_PROBLEM, TemplateFileProblem (+34 more)

### Community 93 - "palette.test.ts"
Cohesion: 0.06
Nodes (62): 1. Tools by discipline, Salary & offer tools (offer, net, compare, script, raise, path, contract, move, inflation), isPaletteKey(), openPalette(), paletteHint(), PaletteHost(), PalettePanel, GROUP_ICON (+54 more)

### Community 94 - "Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)"
Cohesion: 0.09
Nodes (27): EngSpace Tools master blueprint (TOOLS-BLUEPRINT.md), Crew roster (kind crew, one per project), cvreview · مراجعة السيرة الذاتية (CV review, the only HR tool), DocList (windowed list of saved documents), Salary & offers pack «الراتب والعروض» 💲 (money), Phase 0 ✅: research briefs and groundwork (num-input, share-cancel, glyph preload), Phase 1: Foundation (registry/gate, Tools tab, store, projects, UI kit, document kit, QA/QC), Phase 2: Field core (tradeKit, concrete, bbs, levelBook, units) (+19 more)

### Community 95 - "Smoke Render Tests"
Cohesion: 0.14
Nodes (8): crawl(), fakeEvent, handlerErrors, render(), seen, setups, signIn(), signInAs()

### Community 96 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noImplicitAny (+6 more)

### Community 97 - "20261020000026_ai.sql"
Cohesion: 0.20
Nodes (13): ai_feedback_account, ai_feedback_created, ai_usage_day, private.ai_cfg(), private.ai_config, private.ai_feedback, private.ai_usage, public.admin_ai_usage() (+5 more)

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

### Community 105 - "Release Workflow Inputs"
Cohesion: 0.18
Nodes (10): tag, name, on, workflow_dispatch, permissions, contents, default, description (+2 more)

### Community 106 - "rc-section.tsx"
Cohesion: 0.22
Nodes (18): ResultCard (hero number, pictograms, «طريقة الحساب»), bars(), blankM(), Body, build(), DEFAULTS, Editor(), inputOf() (+10 more)

### Community 107 - "raises.ts"
Cohesion: 0.67
Nodes (5): addMonths(), cumulative(), monthsBetween(), realHistory(), Series

### Community 108 - "Test Account Seeder"
Cohesion: 0.18
Nodes (8): API, call(), def, findId(), h, remove, results, year

### Community 109 - "config.ts"
Cohesion: 0.13
Nodes (12): RFC-6238, @capacitor/core@8.5.2, @supabase/supabase-js@2.117.2, @capacitor/core, @supabase/supabase-js, nativeStorage, AUTH_REDIRECT_NATIVE, BACKEND (+4 more)

### Community 110 - "FilterChip"
Cohesion: 0.22
Nodes (21): concreteMaterials(), convert, Element, elementVolume(), masonry(), MIX, REBAR_SIZES, rebarKgPerM() (+13 more)

### Community 111 - "v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off"
Cohesion: 0.33
Nodes (5): 2. Omnisearch (Ctrl/⌘K), 4. CV review (AI side), 5. Voice take-off, Tests, v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off

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
Cohesion: 0.06
Nodes (46): agrees(), BUILTIN_FMT, cellsOf(), cellXml(), clean(), colName(), COLOR, coreXml() (+38 more)

### Community 117 - "register.tsx"
Cohesion: 0.15
Nodes (24): num(), daysBetween(), DONE, isDate(), REG_ENGINE, REG_KINDS, RegDoc, registerOf() (+16 more)

### Community 118 - "Media E2E Tests"
Cohesion: 0.14
Nodes (4): CASES, FORMS, composer(), EXIF

### Community 119 - "Publish Workflow Steps"
Cohesion: 0.25
Nodes (8): steps, if, name, run, uses, with, cache, node-version

### Community 120 - "qto.tsx"
Cohesion: 0.14
Nodes (24): ref(), XCell, XFmt, XRow, blank(), blankLine(), Body, build() (+16 more)

### Community 121 - "Publish Job Config"
Cohesion: 0.29
Nodes (7): CHANNEL, PROJECT_REF, SUPABASE_ACCESS_TOKEN, jobs, publish, env, runs-on

### Community 122 - "Node TS Config"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, allowImportingTsExtensions, types, extends, include

### Community 123 - "public.profiles"
Cohesion: 0.13
Nodes (19): on_auth_user_created, private.author_snapshot(), private.can_act(), private.handle_new_user(), private.profile_guard(), private.touch_updated_at(), profiles_guard, profiles_touch (+11 more)

### Community 124 - "Checklists E2E"
Cohesion: 0.47
Nodes (5): build(), builder(), downloadPdf(), insp(), jpegsOf()

### Community 125 - "Publish Workflow Header"
Cohesion: 0.33
Nodes (5): concurrency, name, on, permissions, contents

### Community 126 - "host.tsx"
Cohesion: 0.07
Nodes (72): DocPreview (same display list and layout object as export), Decisions worth knowing, The editable workstation (v0.39) — architectural report, Verification, What changed, by layer, applyDocControls(), cleanRev(), cleanSign() (+64 more)

### Community 127 - "SceneDelegate"
Cohesion: 0.29
Nodes (3): Capacitor, SceneDelegate, UIKit

### Community 128 - "Broadcast Input"
Cohesion: 0.40
Nodes (5): default, description, required, type, broadcast

### Community 129 - "rc-calc.ts"
Cohesion: 0.08
Nodes (41): TraceStep, Check, r(), AIR, ceilStep(), DUCT_ENGINE, ductFriction(), DuctLimits (+33 more)

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
Cohesion: 0.14
Nodes (10): coolingLoad · حمل التبريد واختيار الوحدات (Cooling load & unit selection), Excel & CSV export (docXlsx / docCsv), irRegister · سجل طلبات الاستلام (IR / WIR / MIR register), meetingMinutes · محضر اجتماع (Meeting minutes), Technical office pack «المكتب الفني» (office), Phase L3: optional native batch (nativeLine 3: geolocation, text-to-speech, Downloads), Product scope review (§9.3), rfiLog · سجل الاستفسارات والاعتمادات (RFI, submittal & transmittal register) (+2 more)

### Community 173 - "export-parity.test.ts"
Cohesion: 0.09
Nodes (30): 3. Word and Excel mirror the PDF, vitest, specDocx(), fixedMeasurer, DocSpec, DrawOp, fingerprint(), stripIsolates() (+22 more)

### Community 175 - "mfa.ts"
Cohesion: 0.20
Nodes (16): assurance(), clean(), enroll(), Enrolment, Factor, factors(), fail(), gateState (+8 more)

### Community 176 - "toolbox.tsx"
Cohesion: 0.05
Nodes (54): ISO 7010 (safety signs and pictograms), toolboxTalk · التوعية الصباحية وتمام المهمات (Toolbox talk & PPE muster), paramsOnly(), DOCX_MIME, DocBlock, PPE_ITEMS, PpeItem, tbtSummary() (+46 more)

### Community 178 - "siteDiary · يومية الموقع (Daily site diary)"
Cohesion: 0.15
Nodes (23): crewPlanner · تخطيط العمالة والمدة (Crew size & duration planner), dayworkSheet · يوميات الأعمال الإضافية (Daywork sheet, no rates), delayPenalty · غرامات التأخير 💲 (Delay penalty), finalAccount · الحساب الختامي 💲 (Final account), heatStress · الإجهاد الحراري وحظر الظهيرة (Heat index & midday-ban planner), ipc · المستخلص الجاري 💲 (Interim payment certificate), Material request «طلب خامات» (MR, kind materialRequest), ncr · تقرير عدم المطابقة (Non-conformance report) (+15 more)

### Community 179 - "strict-check.mjs"
Cohesion: 0.15
Nodes (13): @babel/parser@^8.0.6, @babel/traverse@^8.0.6, @babel/parser, @babel/traverse, base, BASELINE, explicitAny(), now (+5 more)

### Community 180 - "MIGRATION.md — Phase 1 prototype migration"
Cohesion: 0.08
Nodes (23): EngSpace — anonymous career and salary network for Egyptian engineers, Next: high-impact features (market transparency, daily engineering tools), MIGRATION.md — Phase 1 prototype migration, Dead logo controls removed after the brand board, i18n extract / build scripts ported to Node, mammoth 1.8 → 1.13 upgrade (GHSA-rmjr-87wv-gf87), pdf.js CVE-2024-4367 fix (getDocument with isEvalSupported: false), Phase 1: single-file prototype → bundled Vite + React + TypeScript (+15 more)

### Community 181 - "Account deletion wipes the device store (toolStore.destroy)"
Cohesion: 0.40
Nodes (3): incident · الحوادث ومؤشرات السلامة (Incident report + TRIR/LTIFR), Egyptian PDPL 151/2020 (personal data protection), destroyToolStore()

### Community 182 - "Tool routes #app/tool/<id>, #app/tooldoc/<id>:<docId|new>, toolprojects, toolstorage, v"
Cohesion: 0.47
Nodes (5): Tool routes #app/tool/<id>, #app/tooldoc/<id>:<docId|new>, toolprojects, toolstorage, v, parseHash(), PLAIN_TYPES, STACK_TYPES, TOOLS_TAB_TYPES

### Community 183 - "live-update-ui.test.ts"
Cohesion: 0.50
Nodes (3): base, find(), flat()

### Community 184 - "The website (Cloudflare Pages)"
Cohesion: 0.33
Nodes (5): Custom domain (engspace.org), One-time setup (owner), The public page, The website (Cloudflare Pages), What the workflow also does

### Community 186 - "Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)"
Cohesion: 0.50
Nodes (5): Phase 3: admin console as its own web app behind MFA, Phase 4: store releases, Realtime private channels (member:<id>, feed, staff), Phase 1 follow-ups (strict TypeScript, pdf.js 4/5, lazy English dictionary, admin web app), Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)

### Community 187 - "cubeLog · سجل مكعبات الخرسانة (Concrete cube register)"
Cohesion: 0.50
Nodes (4): Truck log «سجل الخلاطات» (pour-day ticket log), cubeLog · سجل مكعبات الخرسانة (Concrete cube register), Structural & concrete pack (structural), rcSection · مقاومة القطاعات الخرسانية (RC section check, ECP 203)

### Community 191 - "storeDevice"
Cohesion: 0.83
Nodes (3): KEY(), loadDevice(), storeDevice()

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
- **10 isolated node(s):** `PackageDescription`, `RFC-6238`, `./tsconfig.json`, `{ s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND }`, `Egyptian VAT Law 157/2025 (amending Law 67/2016)` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — EngSpace project memory` connect `Project Rules (CLAUDE.md)` to `App Shell & Push Client`, `updater.ts`, `MEP & Cable Tools`, `AI Proxy (ai-chat)`, `stack.tsx`, `AI CV Review & Redaction`, `README, CI & Live Preview`, `CV Hiring Panel`, `PHASE2.md — Supabase (Frankfurt) and Capacitor 8`, `Push Delivery (FCM/APNs)`, `Zoom lock (v0.1.8: viewport meta, touch-action, gesture listeners, native views)`, `PanelViews.tsx`, `Media Upload Function`, `MIGRATION.md — Phase 1 prototype migration`, `Phase 2 follow-ups (realtime, push, media sweep, pagination, iOS CI, admin web app)`, `AI.md — «المهندس الذكي» Smart Engineer (v0.29.0)`, `harness.ts`, `Native Glue & Sharing`, `Native Camera Flow`, `Secondary`, `Brand Mark Rendering`, `palette.test.ts`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `Release Workflow Inputs`, `config.ts`, `Admin Cloud Adapter`, `Media E2E Tests`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AppView()` (e.g. with `2. Omnisearch (Ctrl/⌘K)` and `jobStats0()`) actually correct?**
  _`AppView()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `RFC-6238`, `./tsconfig.json` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `tabs.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05348583877995643 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `export-parity.test.ts` to `tabs.tsx`, `rc-calc.ts`, `ui/kit.tsx`, `App Shell & Push Client`, `qto-calc.ts`, `v24.test.ts`, `updater.ts`, `voice-parse.ts`, `MEP & Cable Tools`, `Rebar BBS & Cutting`, `drafting.tsx`, `concrete.tsx`, `permit.tsx`, `AssistantScreen.tsx`, `Dev Dependencies`, `AI Proxy (ai-chat)`, `stack.tsx`, `QA/QC Checklists`, `Row Mapping & Hydrate`, `Level Book Tool`, `Trade Kit Calculator`, `AI CV Review & Redaction`, `Runtime Dependencies (Capacitor)`, `Push Delivery (FCM/APNs)`, `model.ts`, `mfa.ts`, `toolbox.tsx`, `PanelViews.tsx`, `Media Upload Function`, `hardening.test.ts`, `v21.test.ts`, `v22.test.ts`, `live-update-ui.test.ts`, `numInputParse`, `post-author.test.ts`, `harness.ts`, `Native Glue & Sharing`, `Native Camera Flow`, `Image Compression`, `i18n Build & Vitest Config`, `Brand Mark Rendering`, `Net Pay & Offers`, `CV HR Assessment`, `native-auth.test.ts`, `ui-style.ts`, `Gradual Typing Scripts`, `templates.tsx`, `palette.test.ts`, `Role gate src/tools/gate.ts (toolAllowed / stackAllowed / toolKindsForRole)`, `Smoke Render Tests`, `ipc.tsx`, `Company Scorecard UI`, `raises.ts`, `config.ts`, `FilterChip`, `xlsx.ts`, `register.tsx`, `host.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `fieldDensity · الكثافة الحقلية (Field density & compaction QC)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `finishTakeoff · حصر التشطيبات (Room-based finishes take-off)` and `Phase 5: vector backend and wave-2 tools`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._