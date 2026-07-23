# Dr. Mahmoud Elmahdy Platform — UI/UX Design System

> Version 1.0 — 24 July 2026  
> Scope: public website, student platform, learning experience, admin dashboard, responsive behavior, accessibility, content, states, and implementation guardrails.

## 1. Purpose

This document is the single UI/UX reference for Dr. Mahmoud Elmahdy’s educational platform. It describes how the product should look, behave, communicate, and scale while preserving the current business logic.

The product is an Arabic-first educational system serving school and university students through courses, curricula, videos, files, tests, results, reports, notifications, and online/offline learning.

This is not a product rewrite specification. UI work must preserve existing routes, APIs, database entities, permissions, relationships, validation, and workflows unless a change is explicitly approved as additive and non-breaking.

## 2. Product principles

1. **Arabic first:** RTL is the default direction. English technical terms remain LTR inside Arabic content.
2. **Learning before decoration:** every component must help students understand, decide, learn, or complete a task.
3. **One clear primary action:** each screen or section has one visually dominant CTA.
4. **Progressive disclosure:** show the essential choice first; reveal advanced settings only when relevant.
5. **Trust through clarity:** explain what happens after registration, publishing, uploading, or submitting.
6. **In-app continuity:** files and supported media open inside the application instead of sending students outside it.
7. **Visible system status:** loading, success, error, draft, published, pending, and unread states must never be ambiguous.
8. **Responsive by design:** desktop uses available width; mobile preserves access to navigation and primary actions.
9. **Accessible interaction:** keyboard access, visible focus, semantic labels, sufficient contrast, and reduced-motion support are required.
10. **Non-breaking evolution:** visual refactors must not alter business rules or data meaning.

## 3. Audiences and jobs

### Prospective student or parent

- Understand who the platform is for.
- Identify the correct educational track.
- Trust the instructor and teaching method.
- Create a student account or ask for help.

### Registered student

- Log in using the student access code.
- See assigned courses and lessons without manual refresh.
- Watch lessons and resume progress.
- Preview educational files inside the app.
- take tests, see results, and understand progress.
- Receive notifications for new lessons, tests, and files.
- Manage profile information and avatar.

### Administrator

- Review and manage student registrations.
- Assign courses, stages/groups, and permissions.
- Upload and organize videos, playlists, files, and lesson attachments.
- Create, import, preview, publish, and manage tests.
- Review results and reports.
- Configure public website content.
- Understand success or failure immediately after every action.

## 4. Information architecture

### Current routes — preserve exactly

| Route | Purpose |
|---|---|
| `/` | Academy home and conversion landing page |
| `/baccalaureate` | Secondary/baccalaureate track |
| `/kids` | Kids programming track |
| `/university` | Computer science/university track |
| `/curriculum` | Educational curricula catalogue |
| `/platform` | Student login, registration, recovery, and learning platform |
| `/admin` | Protected admin dashboard |

Query parameters may activate an existing state without creating new business logic. Examples include `?mode=register` and track selection parameters.

### Public navigation

Primary visible links:

- الرئيسية
- المسارات التعليمية
- عن الدكتور
- آراء الطلاب

Primary CTA: `دخول المنصة` or `متابعة التعلم` when a student session exists.  
Secondary utility: WhatsApp, presented with lower visual weight.

### Student navigation

- الرئيسية
- كورساتي
- الملفات
- الاختبارات
- حسابي

Desktop uses a right sidebar. Mobile uses a fixed five-item bottom navigation and a collapsible sidebar when needed.

### Admin navigation

Keep every existing module and action:

- الدورات
- الكورسات
- البودكاست
- المناهج التعليمية
- مكتبة الفيديوهات والقوائم
- رفع فيديو جديد
- إدارة المنصة والطلاب
- إعدادات الموقع

The upload-video action is visually featured but remains part of the existing navigation logic.

## 5. Brand and visual direction

The visual language is a mature Arabic educational SaaS product: calm, precise, trustworthy, friendly, and technical without looking like a generic developer dashboard.

- Light interface by default.
- No decorative gradients.
- White surfaces over soft gray/blue backgrounds.
- Blue communicates navigation, trust, and primary action.
- Orange is a restrained accent, never a competing primary.
- Green is reserved for success and correct answers.
- Red is reserved for errors and destructive actions.
- Use photography and educational imagery that feels consistent in lighting, crop, and color treatment.

## 6. Design tokens

### Color tokens

```css
--primary: #0564C9;
--primary-dark: #064A96;
--primary-soft: #EAF3FF;
--accent: #FF8A1F;
--success: #16A365;
--warning: #D97706;
--danger: #DC3545;
--navy: #0F1D32;
--background: #F6F8FC;
--surface: #FFFFFF;
--text: #172033;
--muted: #667085;
--border: #DCE3EC;
--disabled: #A8B2C1;
--overlay: rgba(15, 29, 50, 0.42);
```

All text/background combinations must meet WCAG AA contrast. Muted text must not become pale placeholder-like body copy.

### Typography

- Arabic: `Cairo`, with `Alexandria` or `IBM Plex Sans Arabic` as approved alternatives.
- English: `Inter`.
- Technical/code values: `JetBrains Mono` or the configured monospace fallback.
- Page title: 30–40px, weight 700–800, line-height 1.25–1.4.
- Section title: 28–34px, weight 700–800.
- Card title: 17–20px, weight 700.
- Body: 14–16px, weight 400–500, Arabic line-height 1.7–1.9.
- Small/helper: 12–13px, weight 400–600.
- Avoid weight 900 for long headings or paragraphs.

### Spacing

Use a 4px base scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 88`.

- Section padding: desktop 64–88px, tablet 64px, mobile 48px.
- Between major content blocks: 24px.
- Card padding: 16–24px; large forms may use 24–32px.
- Form field gap: 16px.
- Container maximum width: 1280–1440px depending on workspace density.
- Horizontal padding: 16px mobile, 24px tablet, 32px desktop.

### Shape and elevation

- Standard card radius: 16px.
- Button/input radius: 10–12px.
- Image radius: 18px.
- Badge/chip: pill when compact; 8px for rectangular status labels.
- Main shadow: `0 8px 30px rgba(15, 29, 50, 0.07)`.
- Elevated dialog shadow: `0 20px 50px rgba(15, 29, 50, 0.16)`.
- Borders remain subtle; do not border every nested element.

### Motion

- Standard duration: 150–220ms.
- Page/section reveal: maximum 300ms.
- Hover lift: 2–4px only.
- Never animate layout in a way that moves a user’s target during interaction.
- Respect `prefers-reduced-motion` and disable non-essential movement.

## 7. Global layout

### Header

- Sticky at the top with a white translucent surface and light blur.
- Brand block: logo, `د. محمود المهدي`, and `منصة البرمجة وعلوم الحاسب`.
- Links use medium/bold weight and a soft-blue active background, not an underline alone.
- The learning/platform CTA is filled blue.
- WhatsApp is a smaller outline utility action.
- Mobile opens an RTL full-height navigation sheet with explicit close control.

### Footer

- Navy `#0F1D32`, not near-black.
- Three balanced groups: brand, quick links, contact.
- Social icons must have accessible names.
- Phone numbers use LTR direction and clickable `tel:` links.
- Do not duplicate a large WhatsApp CTA when the floating action exists.
- Include copyright and only link to policy pages when those routes exist.

### Floating actions

- WhatsApp remains available but never covers content, bottom navigation, dialogs, or table actions.
- Place it on the left in RTL layouts.
- Back-to-top is hidden on mobile and separated from WhatsApp on larger screens.

## 8. Public home page

### Required section order

1. Header
2. Hero
3. Trust strip
4. Learning benefits
5. Educational tracks
6. Student results/testimonials
7. About Dr. Mahmoud
8. Registration CTA
9. Footer

Future additions may include “How it works” and FAQ between tracks and the final CTA without changing existing routes.

### Hero

- Label: `مسارات تعليمية للمدرسة والجامعة`.
- Heading: `اتعلم البرمجة صح وافهم منهجك خطوة بخطوة`.
- Supporting copy explains school/university audiences, exercises, tests, and follow-up.
- Primary CTA: `ابدأ مسارك الآن`.
- Secondary CTA: `استكشف المسارات`.
- Show only concise supporting benefits.
- Hero photo must preserve the instructor’s complete head/face at every breakpoint.
- Use `object-position` intentionally; never default blindly to center for portraits.
- Avoid overlay cards that crop or cover essential image content.

### Trust strip

Use only verified values. Current safe claims include:

- Three educational tracks.
- School and university coverage.
- Online and in-person learning.
- Follow-up and tests.

Do not publish unverified student/course counts. When real data exists, show it dynamically.

### Learning benefits

Three concise cards:

- منهج مرتب
- متابعة حقيقية
- تطبيق عملي

Cards use number, icon, title, and outcome-focused copy. One may use the soft-primary featured state.

### Educational tracks

All track cards use the same structure and height:

1. 16:9 image.
2. Small audience label.
3. Track title.
4. One concise description.
5. Maximum three chips.
6. Full-width `عرض المسار` button.

Images must use a unified visual treatment. Avoid mixing unrelated stock, illustration, and AI styles in the same row.

### Testimonials and results

- Prefer 4–6 verified testimonials or measurable student outcomes.
- Never invent counts, names, grades, or achievements.
- A testimonial contains avatar/photo, abbreviated name, stage, two-line quote, rating if real, and a concrete outcome if verified.
- If only two verified testimonials exist, use compact cards rather than oversized empty layouts.

### About section

- Light primary background, contained layout, and balanced image/text columns.
- Image crop must keep the head visible (`object-position` near top for the current portrait).
- Communicate verified qualifications and teaching modes.
- Do not repeat the exact hero composition if another approved photograph becomes available.

### Registration CTA

Never combine two intents in one button.

- Primary: `إنشاء حساب طالب`.
- Secondary: `تسجيل الدخول`.
- Tertiary text link: `تحتاج مساعدة؟ تواصل عبر واتساب`.
- Explain the approval process without creating fear or uncertainty.

## 9. Track and curriculum pages

- Preserve the current track routes and course relationships.
- Start with audience, expected level, study mode, and learning outcomes.
- Course cards should expose level, delivery mode, and relevant content volume when data is available.
- Filters must be consistent with student registration stages.
- Empty categories explain why no content is available and provide a next action.
- Curriculum lists use progressive disclosure instead of extremely long pages.

## 10. Student access experience

### Modes

The `/platform` access screen supports:

- Login by student code.
- New registration.
- Code recovery request.

Tabs or segmented controls must make the active mode unambiguous. Deep-link parameters may open registration directly.

### Registration form

- Required: student name, phone, at least one course/stage according to existing validation.
- Email is optional and must never prevent eligible lesson visibility.
- Preserve all current course/stage relationships.
- Stage selection follows category → stages/groups rather than one exhaustive list.
- Multi-selection appears as removable chips with a concise summary.
- Validation appears next to the relevant field and in a clear summary when necessary.
- Submission states: idle, submitting, approved/received, validation error, server error.
- The message `بيانات التسجيل غير مكتملة` must identify exactly which fields need attention.

### Student code

- Clicking the code/copy action copies it to the clipboard.
- Confirm with a short toast: `تم نسخ كود الطالب`.
- Provide a manual selection fallback when clipboard permission fails.
- Never expose codes belonging to other students.

## 11. Student platform

### Shell

- Desktop: 252px right sidebar, sticky top bar, wide content workspace.
- Mobile: bottom navigation with safe-area padding.
- Active state uses soft blue background, blue text, and a directional border.
- Student name and avatar remain visible without consuming excessive space.

### Dashboard

- Personalized greeting and current stage/learning mode.
- Continue-learning card is the dominant action.
- Summaries for lessons, files, tests, and progress are clickable.
- Skeletons preserve layout during loading.
- Data updates automatically after authentication and content changes; students should not need manual refresh for normal operation.

### Courses and lessons

- Display only content the authenticated student is authorized to see.
- Keep course → playlist/curriculum → lesson hierarchy clear.
- Video cards show title, lesson number, playlist/course, progress, and state.
- Resume from saved progress where supported.
- Locked content clearly explains the requirement without exposing protected URLs.

### Lesson player

- Video remains the visual focus.
- Adjacent content: lesson title, progress, attachments, associated test, and next lesson.
- Support keyboard and touch controls.
- Avoid browser-native download exposure for protected resources where the platform can preview them.

### Files

- Supported files open in an in-app preview modal/page.
- PDF viewer must work for all authorized PDF files and include loading/error states.
- Images display fitted with zoom when appropriate.
- Office/unsupported formats show a clear fallback; downloading is secondary and permission-controlled.
- File cards show name, type, size, course/lesson context, and publish date.
- Preview links must use authenticated application endpoints.

### Tests

- Test cards show name, course/lesson, status, attempts remaining, passing grade, and availability.
- Starting a test is explicit; submission requests confirmation when unanswered questions exist.
- Correct-answer feedback follows the test’s configured behavior.
- Results show score, pass/fail, attempts, and actionable next step.

### Notifications

Notification types include:

- New lesson.
- New test.
- New file.
- Relevant account/course updates.

Requirements:

- Unread badge updates in real time or through a reliable background refresh fallback.
- Opening an item marks it read and navigates to the matching student tab.
- New notifications appear without forcing a full page refresh.
- Empty state: `مفيش إشعارات جديدة`.
- Notification failure must never block learning.
- Deduplicate repeated events and preserve authorization filtering.

### Profile

- Personal information and educational information are visually separated.
- Email remains optional.
- Avatar upload validates type/size and offers removal.
- Save actions show progress and a final confirmation.

## 12. Admin dashboard shell

### General structure

- Arabic RTL light workspace.
- Fixed/sticky right sidebar on desktop; drawer on mobile.
- Content uses available width up to approximately 1600px.
- Header contains page context and essential account/logout controls.
- Navigation is grouped into meaningful sections without removing modules.
- Active items have a strong soft-blue state.
- `رفع فيديو جديد` remains a distinct featured action.

### Admin content pattern

Each module follows:

1. Page title and one-line description.
2. Primary action row.
3. KPI/summary cards where useful.
4. Search and filters.
5. Content table/grid.
6. Empty/loading/error states.
7. Dialog/drawer for focused editing.

Long forms use a responsive grid and sticky action area. Desktop may use a left summary panel; mobile stacks content vertically.

## 13. Admin modules

### Courses and bookings

- Preserve creation/editing, state, and relation logic.
- Tables use readable density, visible filters, and status badges.
- Pending items show count badges without overwhelming navigation.

### Podcasts

- Preserve podcast CRUD and media relationships.
- Show thumbnail, title, state, publication metadata, and compact actions.

### Curricula

- Preserve course and stage associations.
- Visually expose curriculum hierarchy and publication status.
- Use collapse/expand for large curriculum structures.

### Video library and playlists

- Clearly distinguish standalone video from playlist lesson.
- Cards/tables show video title, course, playlist, lesson number, stage targets, publish state, and actions.
- Long target lists become `N مراحل` with an expandable details preview.

### Upload video

The existing choice must remain visible:

1. `فيديو منفرد`
2. `فيديو داخل قائمة`

When `داخل قائمة` is chosen, require and display:

- Course/educational section.
- Playlist.
- Lesson name.
- Lesson number/order inside the playlist.

Use a guided flow with a persistent summary. Validation must identify the exact missing item before upload. Do not submit incomplete registration-like errors unrelated to video fields.

### Website settings

Preserve all existing groups:

- General.
- Hero.
- About.
- Services.
- Pricing.
- Testimonials.
- FAQ.
- Portfolio.
- Eduverse.
- Why choose me.
- Contact.
- Social.

Provide preview where safe, clear save status, and warnings for unsaved changes. Content editors must not need knowledge of database keys.

## 14. Educational platform administration

The `إدارة المنصة التعليمية` workspace contains five fixed tabs:

- الطلاب
- الملفات
- الاختبارات
- النتائج
- التقارير

Keep top KPI cards and make them navigate to their matching tabs. Each tab has a title, description, actions, filters, and content region.

### Students tab

- Search by name, phone, or code.
- Filter by stage and status.
- Statuses include pending, approved, and suspended according to current logic.
- Show assigned courses/stages, learning mode, last relevant activity when available, and compact actions.
- Student code copy gives immediate clipboard confirmation.
- Approval/assignment changes refresh affected student access without requiring repeated manual intervention.
- Destructive/suspension actions require confirmation.

### Files tab

Preserve destination modes:

1. `لطلاب كورس/مرحلة`.
2. `مرفق درس`.

Recommended guided steps:

1. Where will the file appear?
2. Select section/course and stages, or select the target lesson.
3. Upload and define display name.
4. Review and publish/save draft.

Desktop summary panel shows destination, section, stage count, filename, type, and publish location.

Latest-files table columns:

- File name.
- Display location.
- Targets summary.
- Type.
- Size.
- Upload date.
- Status.
- Actions.

`معاينة` must preview the selected upload before final submission without disabling or replacing the actual upload button. Preview must not mark a draft as published.

### Tests tab

Preserve:

- Test name.
- Related course.
- Test type/scope.
- Target stages/groups.
- Passing grade.
- Number of attempts.
- Required progress where configured.
- Question builder.
- Import from file.
- Draft/publish behavior.

Layout sections:

1. Basic information.
2. Target audience.
3. Test settings.
4. Questions.
5. Actions.

Sticky actions: save draft, publish, preview, add question.

#### Question editor

- Numbered collapsible cards.
- Two-column answers on desktop; single column on mobile.
- Correct answer uses a soft success state plus icon/text, never color alone.
- Toolbar: move, duplicate, delete.
- Delete is visually secondary and requires confirmation when data would be lost.
- Question validation points to the exact incomplete question.

#### Import from file

- Accept only configured file types and sizes.
- Show selected filename, extraction progress, and parse result.
- Extract question text and choices into editable draft questions.
- Never auto-publish extracted content.
- Present uncertain extraction clearly and require admin review.
- Failed extraction leaves the existing builder content intact.

### Stage/group selector

The data model and selection logic remain unchanged. The UI follows:

1. Select main educational category.
2. Show only its stages/groups.
3. Search within stages.
4. Multi-select.
5. Display selected items as removable chips.
6. Summarize long selections by count.
7. Expand details on request.

Never print a huge raw stage list in tables, cards, or summaries.

### Results tab

- Search by student or test.
- Filter by course, stage, pass/fail, and date when data supports it.
- Show student, test, score, pass status, attempt number, and submission time.
- Export actions must respect active filters and permissions.

### Reports tab

- Use concise KPI summaries and readable tables/charts.
- Every metric has a label, time context, and definition.
- Empty data is not rendered as misleading zero-performance charts.
- Exported information follows the same authorization rules as the screen.

## 15. Core components

### Buttons

- Primary: one per decision area; blue filled.
- Secondary: white/outline.
- Ghost: low-emphasis navigation or utility.
- Danger: red, used only at the confirmation point.
- Minimum touch target: 44×44px.
- Loading preserves button width and disables duplicate submission.

### Inputs

- Visible label above every field.
- Placeholder is an example, not a label.
- Helper and error text are associated programmatically.
- Focus: primary border plus subtle ring.
- Disabled state remains readable and explains why when non-obvious.

### Cards

- Use cards to group one concept, not every line of content.
- Header, content, and actions have predictable alignment.
- Clickable cards have hover, focus, and pointer affordance.
- Avoid nesting more than two card surfaces.

### Tables

- Sticky header for long datasets when practical.
- Compact rows with 44–52px minimum interaction height.
- Right-align Arabic content; LTR-align codes, dates where suitable, and numeric technical values.
- Actions use labeled tooltips and accessible names.
- Mobile changes to cards or controlled horizontal scrolling; no clipped actions.

### Badges and chips

- Badge = system status.
- Chip = selection/filter.
- Status mapping stays consistent across all modules.
- Never rely on color alone.

### Dialogs and drawers

- Dialog for focused confirmation or short form.
- Drawer/full-screen sheet for complex mobile editing.
- Title, description, close button, and predictable action order are mandatory.
- Unsaved changes require explicit confirmation before closing.

### Toasts

- Success: short and specific (`تم نشر الاختبار`).
- Error: state what failed and the next action.
- Copy confirmation disappears automatically.
- Toasts complement inline validation; they do not replace it.

### Empty states

Every empty state includes:

- What is empty.
- Why it may be empty when known.
- One relevant next action.

### Loading and errors

- Use skeletons for content surfaces and spinners for isolated actions.
- Preserve the previous valid data during background refresh.
- Provide retry for recoverable load errors.
- Never show raw server stack traces to users.

## 16. Copy and localization

- Use approachable Egyptian Arabic consistently, with professional clarity.
- Avoid switching randomly between formal Arabic and slang.
- Buttons use verbs: `عرض`, `ابدأ`, `حفظ`, `نشر`, `معاينة`, `نسخ`.
- Avoid vague labels such as `اضغط هنا`.
- Technical English remains correctly ordered using `dir="ltr"` or isolated inline spans.
- Arabic numerals/date formatting should follow the audience context and remain readable.
- Error messages explain resolution, not only failure.

## 17. Responsive rules

### Mobile: below 640px

- Single-column forms and cards.
- 16px horizontal padding.
- Mobile bottom navigation remains unobstructed.
- Primary actions may become full-width or sticky above safe area.
- Tables become cards or scroll containers.
- Hide back-to-top floating control.

### Tablet: 640–1023px

- Two-column grids where content permits.
- Navigation may remain collapsed.
- Long form summaries stack below the form.

### Desktop: 1024px and above

- Use wide workspaces and 2–4 column grids.
- Admin/student sidebars are persistent.
- Long forms use main content plus summary panel.
- Sticky action areas must not cover table rows or bottom content.

Test at minimum: 360×800, 390×844, 768×1024, 1280×800, 1440×900, and 1920×1080.

## 18. Accessibility requirements

- WCAG 2.1 AA target.
- Semantic landmarks: header, nav, main, section, aside, footer.
- Every icon-only button has an Arabic accessible name.
- Keyboard focus is visible and follows logical RTL reading order.
- Escape closes dialogs/sheets when safe.
- Forms expose labels, errors, required state, and descriptions.
- Images have meaningful Arabic alt text; decorative images use empty alt.
- Videos include captions/transcripts when available.
- Correct/incorrect and published/draft states use text/icon plus color.
- Announce asynchronous success/error changes using appropriate live regions.
- Touch target minimum is 44px.

## 19. Security and privacy UX

- Do not expose protected file/video source URLs unnecessarily.
- Student content is filtered server-side; UI hiding alone is not authorization.
- Access codes are masked where appropriate and copied only on explicit action.
- Confirm destructive actions and explain their scope.
- Do not include private student data in public notifications or URLs.
- File previews use authenticated endpoints and safe MIME/content-disposition headers.
- Imported test files remain drafts until reviewed and published.

## 20. Performance requirements

- Prioritize hero image and above-the-fold CSS.
- Lazy-load below-the-fold images and heavy viewers.
- Use responsive image dimensions and avoid layout shift.
- Lazy-load admin and specialist route bundles.
- Debounce search/filter requests where server-backed.
- Notifications should reconnect with controlled backoff and use polling fallback when real-time transport fails.
- Avoid refreshing every dataset after a small mutation; update or invalidate the affected resource.
- Preserve interface responsiveness during uploads and extraction.

## 21. Analytics and UX measurement

Measure only with approved privacy-compliant analytics:

- Hero primary/secondary CTA clicks.
- Track-card views and clicks.
- Registration start, validation failure, submit, and approval funnel.
- Login/recovery success rate.
- Lesson start/completion and resume rate.
- File preview success/failure by type.
- Test start/completion/abandonment.
- Notification delivered/opened/read.
- Admin upload, publish, and extraction success/failure.

Never use invented marketing metrics in the UI. Analytics definitions must distinguish unique students, attempts, lessons, files, and notifications.

## 22. QA acceptance checklist

### Global

- [ ] RTL layout is correct at every breakpoint.
- [ ] No horizontal overflow at 360px.
- [ ] All routes still work.
- [ ] Header and floating actions do not cover content.
- [ ] Focus states and keyboard order work.
- [ ] Loading, empty, error, and success states exist.

### Public website

- [ ] Hero head/face is never cropped.
- [ ] One primary CTA is visually dominant.
- [ ] Track cards have consistent height and action labels.
- [ ] Claims and testimonials are verified.
- [ ] Registration and login are separate actions.

### Student platform

- [ ] Optional email does not block authorized content.
- [ ] Content appears after login/change without manual refresh.
- [ ] New lesson/file/test notifications appear and navigate correctly.
- [ ] PDFs and supported files preview inside the app.
- [ ] Copy student code provides confirmation.
- [ ] Bottom navigation remains usable with safe-area spacing.

### Admin

- [ ] Existing modules, permissions, and workflows remain intact.
- [ ] Standalone/playlist video choice is visible.
- [ ] Playlist upload requests lesson name and lesson number.
- [ ] File preview does not disable or replace upload.
- [ ] File destination logic remains course/stage or lesson attachment.
- [ ] Test import creates editable drafts and never auto-publishes.
- [ ] Stage selector summarizes long selections.
- [ ] Destructive actions require confirmation.

### Technical release gate

- [ ] TypeScript passes.
- [ ] Production build passes.
- [ ] No console errors caused by the application.
- [ ] Main page, platform, admin login, API, and media endpoints return expected status.
- [ ] Desktop and mobile visual regression checks pass.
- [ ] Deployment health, process manager, and web server configuration pass.

## 23. Non-breaking implementation guardrails

Do not change without explicit product approval:

- Routes.
- Database schema and entity relationships.
- Admin permissions.
- Course/stage targeting semantics.
- File destination modes.
- Test/course/stage relationships.
- Draft/publish meaning.
- Existing validation rules, except additive clearer feedback.
- Student authorization and content filtering.

Safe additive improvements include:

- Visual grouping and responsive grids.
- Search/filter presentation.
- Summaries, chips, tooltips, and previews.
- Better loading/error/empty/success states.
- Sticky action bars.
- In-app previews using existing authorization.
- Real-time updates with a safe fallback.
- Accessibility labels and keyboard behavior.

## 24. Definition of done

A UI/UX change is complete only when:

1. It solves the stated user problem.
2. Existing business logic and permissions are preserved.
3. Desktop, tablet, and mobile behavior is verified.
4. Loading, empty, error, success, disabled, and focus states are handled.
5. Arabic RTL and mixed English content render correctly.
6. Accessibility requirements are met.
7. Typecheck and production build pass.
8. Critical user flows are tested, not only the edited component.
9. No unverified content or metrics were introduced.
10. The production deployment is health-checked after release.

---

This document governs UI/UX decisions for the current product. When implementation and this document differ, preserve business logic first, document the discrepancy, and align the interface through a reviewed, non-breaking change.
