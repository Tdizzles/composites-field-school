# Composites Field School

A self-hosted, interactive 15-module course for the ABYC Marine Composites (Composite Boat Builder) certification. Built for a complete beginner — no prior composites vocabulary assumed.

## How to run

No build step, no server. Open `index.html` directly in any modern browser (double-click it, or drag it into a browser window). Navigate module-to-module from the hub, or open any `module-*.html` file directly. Progress is saved per-browser in `localStorage` (key `cfs.progress`) — it does not sync across devices or browsers, and clearing site data resets it. The hub has a "Reset progress" button for the same effect on purpose.

Every page includes a floating **study-assistant chatbot** (bottom-right 💬) — a client-side keyword search over this course's own vetted content (`assets/knowledge-base.js`), not a live AI. It quotes the matching answer and links a relevant video where one exists. It says so on first open, and it can be wrong or incomplete — treat the official ABYC study guide as the final word, same as the rest of this course.

## File tree

```
composites-field-school/
├── index.html                              course hub — module grid, overall progress, start/continue
├── README.md                               this file
├── assets/
│   ├── styles.css                          shared design system (blueprint/marine-workshop theme)
│   ├── shell.js                            frame engine: nav, quiz renderer, progress storage,
│   │                                        order-game / match-game helpers, video grid, chatbot
│   ├── knowledge-base.js                   vetted Q&A content pack (window.CFS_KB) — powers the
│   │                                        chatbot and was the fact source for Modules 0, 4–14
│   └── videos.js                           curated, verified YouTube video library (window.CFS_VIDEOS)
├── module-0-orientation.html                Orientation — exam format, credential stack, study plan
├── module-1-what-is-a-composite.html        Fundamentals — fiber/matrix/core, anisotropy, sandwich
├── module-2-reinforcements.html             Reinforcements — fabric forms, fiber types, orientation
├── module-3-resins.html                     The matrix — polyester / vinylester / epoxy
├── module-4-cores-and-sandwich.html         Cores & sandwich construction, failure modes
├── module-5-safety.html                     Safety, health & the shop environment
├── module-6-curing-chemistry.html           Curing chemistry & catalyzation
├── module-7-manufacturing-processes.html    Hand lay-up, spray-up, vacuum bag, infusion, RTM, prepreg
├── module-8-molds-and-gelcoat.html          Molds, tooling & gelcoat application
├── module-9-structural-details.html         Stringers, bulkheads, transoms, hull-to-deck joints
├── module-10-hardware-and-bonding.html      Fastening, core sealing, bedding, carbon-galvanic risk
├── module-11-quality-assurance.html         Wet-out, void content, Barcol hardness, defects
├── module-12-repair-fundamentals.html       Damage triage, scarf ratios, blister repair
├── module-13-environmental-compliance.html  VOC/HAP, waste disposal, closed molding, EPA/OSHA framing
└── module-14-capstone.html                  Timed, mixed 48-question practice exam with topic scoring
```

## What's true across every module

- Exactly 6 sections per module (Hook → four distinct interactive "Do" mechanics → 5-question Recall check), sticky header with progress bar/section counter, Back/Next/dots footer — all driven by the shared `assets/shell.js`.
- Every module now includes at least one interaction beyond sliders/toggles: a drag-or-click **ordering game** (`CFS.initOrderGame`) or a **click-to-match pairing game** (`CFS.initMatchGame`), plus tap-to-reveal cards, hotspot diagrams, and segmented selectors.
- Real inline SVG diagrams throughout (no external image files, per the original spec) — cross-sections, hull anatomy, spray patterns, scarf joints, etc.
- Curated, verified YouTube videos linked from `assets/videos.js` where a solid match exists (safety, MEKP/catalyst, reinforcement types, resin comparison, core materials, processes, gelcoat, structural, hardware, QA, repair). No video ID in this project was guessed — each was found via live search and matched to its actual topic.
- "Field notes" deep-dive accordions throughout, added to go beyond the base spec — these are where the deeper reinforcement/load-path/galvanic-corrosion/binder-chemistry questions from the course commission got folded directly into Modules 1–2.
- **Modules 1–3's original technical content, quiz questions, and widget logic are unchanged** from the two source files provided (`module-1-what-is-a-composite.html`, `module-2-reinforcements.html`) plus the newly-built Module 3 — only their CSS/JS were extracted to `assets/` and relinked. Everything added to Modules 1–2 (deep-dive accordions, the match game, extra videos) is additive, not a change to the original sliders, verdicts, or quiz answers.
- Module 14 (Capstone) deviates structurally by design: it's a timed, 48-question mixed exam across all 15 modules with live per-topic score tracking, built from a custom renderer (not `CFS.renderQuiz`) so it can tally topic-level results. Every one of its 48 questions is a direct reuse/rewording of a Modules 1–3 quiz question or is newly written but traceable to a specific `assets/knowledge-base.js` entry — no new facts were introduced for the capstone.

## Content-accuracy protocol (why the TODOs below exist)

Per the build brief's guardrails: nothing in this course invents composites facts, numbers, or quiz answers. Every fact traces to `composites-class-curriculum.md`, the vetted Q&A content pack (`assets/knowledge-base.js`, itself built from a real ABYC-oriented flashcard set), or well-established, uncontroversial general engineering/construction knowledge explicitly flagged as such. **Anywhere the source material didn't lock down an exact number, product recommendation, or procedure, the module says so out loud** — a visible `TODO: VERIFY` callout on the page plus a matching HTML comment in the source. A flagged gap is a success condition of this build, not a defect.

## Needs review — every `TODO: VERIFY`, by module

**Module 0 — Orientation**
- Whether ABYC's traditional open-notes/open-book exam policy applies to this exam's *online-proctored* delivery format specifically.
- Exact positioning/cost of ACMA CCT, CertTEC, MiniCraft, Spectrum, and OSHA 10 relative to the ABYC Marine Composites cert (the credential-stack comparator widget's exact comparative values are unlocked).

**Module 4 — Cores & Sandwich Construction**
- Exact foam density grade numbers and Nomex/aluminum honeycomb specific property values (the core-material property bars are relative/illustrative only).

**Module 5 — Safety**
- Specific chemical-resistance breakthrough-time figures for nitrile vs. other glove materials.
- Specific storage distances/quantities for MEKP vs. accelerator/heat sources, and cartridge replacement intervals.
- Exact minimum eyewash flushing duration (e.g., ANSI Z358.1 guidance) for the MEKP-in-eyes first aid step.

**Module 6 — Curing Chemistry & Catalyzation**
- Exact cobalt promoter dosing/ppm figures.
- Exact drops-per-ml conversion for MEKP dispensers (the calculator reports ml only, the vetted unit).

**Module 7 — Manufacturing Processes**
- Exact comparative cost/skill/emissions numbers across hand lay-up vs. spray-up vs. vacuum bag vs. infusion vs. RTM vs. prepreg (property bars are relative/illustrative rankings only).

**Module 8 — Molds & Gelcoat**
- Exact selection criteria for wax vs. PVA vs. chemical release agents, beyond "three types exist" and "full coverage is always required."

**Module 9 — Structural Details**
- Specific ISO 12215 scantling formulas/thresholds (mentioned only conceptually, per the curriculum's own instruction to avoid heavy math).
- Specific fastener spacing, torque values, and adhesive-bead-size numbers for hull-to-deck joints.

**Module 10 — Hardware Installation & Bonding**
- Specific fastener torque values, fastener sizing for given loads, and backing-plate material/thickness specs.
- A specific bedding-compound product/type recommendation (e.g. polyurethane vs. polysulfide vs. silicone) for a given application.
- **Open question with no vetted answer at all:** "When is it necessary to use an adhesive in place of a putty?" — flagged rather than guessed.

**Module 11 — Quality Assurance & Defects**
- Specific numeric acceptance criteria: void-content percentage, moisture-meter reading thresholds, and Barcol hardness target values (flagged in three places — the quality meter, the Barcol demo, and the inspection-method matcher).

**Module 12 — Repair Fundamentals**
- Exact wet-rag test procedure and interpretation (named by the curriculum, not detailed in the source material).
- No vetted method for reverse-engineering an unknown original laminate schedule — "matching the schedule" is taught qualitatively only.
- Exact blister dry-out duration and barrier-coat specification.

**Module 13 — Environmental & Regulatory Compliance**
- Specific NESHAP/EPA numeric emission limits and permit thresholds (the regulatory *framework* — Clean Air Act NESHAP for Reinforced Plastic Composites Production — is real and cited; specific current numeric limits are not).

**Modules 1, 2, 3, 14:** no open TODOs. Modules 1–2 carry their original vetted content; Module 3 and Module 14 draw entirely from the locked curriculum spec and the knowledge-base content pack.

## Before the real exam

This is a self-study companion built from the published ABYC topic list and a supplied flashcard-style content pack — **not** an official ABYC item bank. Work through the "Needs review" list above against the current official ABYC Marine Composites study guide before treating any flagged item as exam-ready, and treat a good Module 14 practice score as encouraging, not a guarantee.
