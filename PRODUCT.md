# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary decision-maker:** أولياء الأمور (parents) — they research, compare, and submit booking requests for their children. The booking form leads with parent name and phone.

**Primary learner:** طلاب أولى وتانية بكالوريا (1st & 2nd year baccalaureate students) in Egypt, learning programming for the first time or struggling with memorization-based approaches.

**Secondary audiences:**
- طلاب الجامعة (university CS/Engineering students) — need practical understanding of programming courses
- الأطفال والمراهقين (kids and teenagers) — age-appropriate programming introduction
- المبتدئين (absolute beginners) — foundational computational thinking

## Product Purpose

Educational platform and academy by **د. محمود المهدي** (Dr. Mahmoud ElMahdy) that teaches programming and computer science through a structured, comprehension-first methodology. The platform combines video lessons, exercises, tests, and progress tracking — available online across Egypt and offline at the Zagazig academy (Eduverse, فلل الجامعة).

Success means: a student who can understand a problem, analyze it, determine the solution steps, and write the code independently — not one who memorizes code patterns.

## Positioning

**"الطالب مش محتاج يحفظ الكود... محتاج يفهم إزاي يفكر ويحل بنفسه"**

The differentiator is a sequenced learning path that starts from computational thinking before touching code. Each lesson builds on the previous one; no topic advances until the foundation is solid. This contrasts with the common approach of disconnected video tutorials or memorization-based teaching.

Dr. Mahmoud holds a Master's in Information Systems and brings academic rigor with practical, applied teaching — bridging the gap between university-level CS knowledge and accessible school-level instruction.

## Operating Context

- **Geography:** Egypt — online for all governorates; offline in Zagazig (الشرقية)
- **Physical location:** Eduverse, فلل الجامعة, الزقازيق
- **Delivery modes:** Online (recorded video + live sessions + platform) and offline (in-person at the academy)
- **School types served:** Arabic-track schools (عربي) and language schools (لغات)
- **Booking flow:** Parent submits a booking request (not a payment) → team contacts to confirm program and schedule
- **Communication:** WhatsApp is the primary contact channel (201044348610), plus phone lines (01066711545, 01272047933)
- **Student platform:** Authenticated access with lessons, exercises, tests, progress tracking, and parent monitoring dashboard

## Capabilities and Constraints

**Confirmed capabilities:**
- Multi-track learning paths: Baccalaureate (1st/2nd year), University CS, Kids, Curriculum browser
- Student platform with authentication, lesson progress, and test results
- Parent tracking dashboard (progress, attendance, test scores, last activity)
- Admin dashboard with site settings, content management, and learning module administration
- Booking/inquiry system via API
- Configurable site settings (testimonials, contact info, social links, branding)

**Technical stack:**
- React + Vite + TypeScript (SPA)
- Tailwind CSS v4 with @theme inline tokens
- shadcn/ui component library (Radix primitives)
- Framer Motion for animations
- wouter for client-side routing
- TanStack React Query for API state
- Cairo font (self-hosted, Arabic + Latin subsets)
- Monorepo workspace with shared API client and backend

**Constraints:**
- RTL-first layout (dir="rtl" throughout)
- Arabic is the primary language; English appears only in programming terms
- Mobile-first with sticky bottom CTA bar on small screens
- All testimonials and site copy are admin-configurable via settings API

## Brand Commitments

- **Name:** د. محمود المهدي (Dr. Mahmoud ElMahdy)
- **Academy brand:** Eduverse (physical academy location)
- **Tagline:** "مدرب برمجة وذكاء اصطناعي — مؤسس Eduverse"
- **Logo:** Circular photo mark (`/logo.jpg`)
- **Primary color:** Academy blue (#0564C9 / HSL 211 100% 35%)
- **Font:** Cairo (self-hosted, weights 400/600/700/800)
- **Voice:** Direct, confident, empathetic toward parents' concerns. Professional but warm. Uses Egyptian Arabic (عامية مصرية) in marketing copy.
- **Social presence:** Facebook, Instagram, YouTube, LinkedIn (configurable via admin)

## Evidence on Hand

- Real testimonials stored in site settings (admin-managed, not hardcoded fabrications)
- Hero photography: `/dr-mahmoud-hero-classroom.png`
- Track imagery: `/university-cs-path.png`, `/baccalaureate-hero.png`, `/web-development-path.png`
- Structured FAQ with 10 real parent questions and verified answers
- No fabricated pricing, student counts, success rates, or institutional partnerships are claimed

## Product Principles

1. **الفهم قبل الكود** — Understanding before code. Every learning path starts with computational thinking, not syntax.
2. **تسلسل مش عشوائي** — Sequential, not random. Each lesson depends on the previous; no skipping ahead.
3. **المتابعة حقيقية** — Real tracking. Parents and students see actual progress data, not vanity metrics.
4. **الطالب يطبق بنفسه** — The student applies independently. The goal is self-sufficient problem-solving.
5. **أونلاين مش أقل** — Online is not less. Same content, tests, and monitoring as offline.

## Accessibility & Inclusion

- Arabic-track and language-track (لغات) students are both served
- RTL layout with proper bidirectional text handling for code/English terms
- Self-hosted fonts (no external dependency or FOIT)
- Focus-visible rings on all interactive elements
- `prefers-reduced-motion` respected in admin workspace
- Mobile-optimized with safe-area-inset support for notched devices
