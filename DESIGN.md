---
name: Dr. Mahmoud ElMahdy Academy
description: Arabic-first programming education platform — clarity, structure, trust
colors:
  academy-blue: "#0564C9"
  deep-authority: "#064A96"
  midnight-navy: "#0F1D32"
  slate-ink: "#172033"
  calm-steel: "#526176"
  quiet-grey: "#667085"
  silver-border: "#DCE3EC"
  ice-blue-tint: "#EAF3FF"
  cloud-canvas: "#F6F8FC"
  pure-white: "#FFFFFF"
  trust-green: "#16A365"
  whatsapp-green: "#25D366"
  alert-red: "#DC2626"
typography:
  display:
    fontFamily: "Cairo, sans-serif"
    fontSize: "clamp(2.375rem, 5vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "tight"
  headline:
    fontFamily: "Cairo, sans-serif"
    fontSize: "clamp(1.875rem, 3.5vw, 2.125rem)"
    fontWeight: 800
    lineHeight: 1.45
  title:
    fontFamily: "Cairo, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Cairo, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 2
  label:
    fontFamily: "Cairo, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  section-y: "3.5rem"
  section-y-lg: "5rem"
  container-x: "1rem"
  container-x-lg: "2rem"
  component-gap: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.academy-blue}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.deep-authority}"
    textColor: "{colors.pure-white}"
  button-outline:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "48px"
  button-whatsapp:
    backgroundColor: "{colors.pure-white}"
    textColor: "#168C45"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "44px"
  card-surface:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip-blue:
    backgroundColor: "{colors.ice-blue-tint}"
    textColor: "{colors.academy-blue}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  input-home:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  nav-bar:
    backgroundColor: "rgba(255,255,255,0.95)"
    textColor: "{colors.calm-steel}"
    height: "64px"
---

# Design System: Dr. Mahmoud ElMahdy Academy

## Overview

**Creative North Star: "The Clear Path"**

This is a system built on the same philosophy as the teaching it serves: clarity first, then confidence. Every surface feels like walking into a well-organized classroom — clean walls, clear signage, materials laid out in order. There is no visual noise competing for attention; the hierarchy does the work so parents can find answers and students can find their next step.

The palette is anchored in a single confident blue that carries authority without coldness. Surrounding it is a world of cool neutrals, soft canvas backgrounds, and generous white space that lets Arabic typography breathe at its natural reading rhythm. Cards and containers use gentle rounding and ambient shadows — surfaces that feel lifted but not floating, structured but not rigid.

The system is RTL-native. Every spatial decision, every icon placement, every reading flow assumes Arabic as the primary language. English appears only inside code snippets and programming terms, inheriting the typographic weight of its surrounding context.

**Key Characteristics:**
- **Structured clarity** — visual hierarchy does the navigation; no element fights for attention
- **Single-blue confidence** — one primary blue drives all action and trust signals
- **Warm neutrality** — cool greys with just enough warmth to feel approachable, not clinical
- **Generous breathing room** — sections are tall, gaps are wide, text has room to be read
- **RTL-native** — built right-to-left from the ground up, not mirrored from LTR

## Colors

A disciplined single-hue palette: academy blue as the sole accent, supported by a neutral ramp from midnight navy to cloud canvas.

### Primary
- **Academy Blue** (#0564C9): The single action color. Buttons, links, active states, eyebrow labels, and icon containers. Used sparingly enough that its presence always signals "this is interactive" or "this is important."
- **Deep Authority** (#064A96): Darker blue for emphasis blocks, callout backgrounds, hover states on primary buttons. Never used as text on light backgrounds — only as a container background with white text.

### Neutral
- **Midnight Navy** (#0F1D32): Footer background and the deepest surface in the system. Used only in the footer and nowhere else on the page.
- **Slate Ink** (#172033): Primary text color. All headings and body text default to this — not pure black, but dark enough for maximum readability on the light canvas.
- **Calm Steel** (#526176): Secondary body text. Subheadings, descriptions, and supporting copy that should read clearly but recede behind headlines.
- **Quiet Grey** (#667085): Tertiary text. Metadata, timestamps, role labels, and low-priority information. The lightest text color used on light backgrounds.
- **Silver Border** (#DCE3EC): Universal border color. Cards, inputs, section dividers, and the nav underline all share this single border token.
- **Ice Blue Tint** (#EAF3FF): Light blue wash for chips, icon containers, callout backgrounds, and active nav items. The only tinted surface — everything else is white or cloud canvas.
- **Cloud Canvas** (#F6F8FC): Page background. The barely-there blue-grey that makes white cards feel distinct without contrast fatigue.
- **Pure White** (#FFFFFF): Card surfaces, input backgrounds, the navbar. The default container color.

### Semantic
- **Trust Green** (#16A365): Checkmarks, success states, and "confirmed" indicators. Never used as a button color.
- **WhatsApp Green** (#25D366): WhatsApp-specific branding on CTA borders. Paired with #168C45 text.
- **Alert Red** (#DC2626): Form errors only. Not used for badges or destructive actions in the public-facing site.

### Named Rules
**The One-Blue Rule.** Academy Blue is the only chromatic accent on any public-facing surface. No secondary accent, no gradient, no warm color competes with it. Its monopoly is what makes it immediately recognizable as "click here" or "look here."

**The Tint-Not-Shade Rule.** When blue needs a background, use Ice Blue Tint (#EAF3FF) — never a semi-transparent overlay of Academy Blue. This keeps the tinted surfaces consistent and avoids opacity stacking artifacts.

## Typography

**Primary Font:** Cairo (self-hosted, Arabic + Latin subsets, weights 400/600/700/800)

**Character:** Cairo is a humanist Arabic font with geometric Latin companions. Its open counters and generous x-height make it exceptionally legible in both Arabic body text and mixed Arabic-English programming contexts. The self-hosted woff2 files eliminate FOIT and external dependencies.

### Hierarchy
- **Display** (800 extrabold, clamp(38px–52px), line-height 1.35): Hero headlines only. One per page. Always Slate Ink on light backgrounds.
- **Headline** (800 extrabold, clamp(30px–34px), line-height 1.45): Section titles. The `SectionTitle` component uses this. Always centered with a colored eyebrow above.
- **Title** (700 bold, 20px, line-height 1.5): Card titles, feature names, FAQ questions. The workhorse heading level inside content blocks.
- **Body** (500 medium, 15px, line-height 2.0): Primary reading text. The generous line-height accommodates Arabic's vertical extenders and diacritics.
- **Label** (700 bold, 14px, line-height 1.5): Eyebrow text above section titles, chip text, form labels, navigation items. Always uppercase visual weight via bold, never letter-spacing or text-transform (Arabic doesn't have case).

### Named Rules
**The Bold-Not-Light Rule.** The lightest weight used is 500 (medium). No thin or light weights exist in the system. Arabic readability on screens demands substance; waif-like type undermines trust.

**The Two-Point Rule.** Adjacent text sizes in the hierarchy never differ by less than 2px. Display→Headline is a large jump; Headline→Title is moderate; Title→Body is subtle but always perceptible.

## Layout

Content lives inside a max-w-7xl (1280px) container, centered, with 16px horizontal padding on mobile scaling to 32px on desktop. The layout is a stacking model: full-width colored sections alternate between Cloud Canvas and Pure White backgrounds, creating visual rhythm without explicit dividers.

**Section rhythm:** Every section uses py-14 (56px) on mobile, py-20 (80px) on desktop. This generous vertical spacing gives each content block room to own its viewport slice.

**Grid behavior:**
- Single column on mobile (< 768px)
- 2-column or 3-column grids on tablet/desktop, using gap-5 (20px) or gap-6 (24px)
- Hero sections use a weighted grid: `lg:grid-cols-[1.04fr_.96fr]` for text-heavy/image-light splits
- About/feature sections use `lg:grid-cols-[.82fr_1.18fr]` for image/text splits

**Container max-widths:** Sections that need narrower focus (FAQ, comparison) drop to max-w-4xl or max-w-6xl. The full 7xl is reserved for feature grids and hero sections.

**Mobile CTA bar:** A fixed bottom bar on screens < md with two action buttons (program details + WhatsApp), accounting for safe-area-inset-bottom on notched devices.

## Elevation & Depth

The system uses ambient shadows rather than structural elevation. Surfaces are differentiated primarily by background color (white cards on cloud canvas), with shadows providing subtle depth cues on hover and for hero photography.

### Shadow Vocabulary
- **Card ambient** (`0 8px 30px rgba(15,29,50,.06–.07)`): Default card shadow. Barely visible at rest — more felt than seen. Provides just enough lift to separate white cards from the cloud canvas.
- **Hero dramatic** (`0 16px 45px rgba(15,29,50,.14)`): Reserved for the hero portrait frame. The deepest shadow in the system, making the photo feel like a physical object placed on the page.
- **Button glow** (`shadow-lg shadow-blue-700/15`): A colored shadow under primary CTAs in the hero section. Adds urgency without neon glow.
- **Input focus** (`0 0 0 3px rgba(5,100,201,.12)`): A soft blue ring around focused inputs. Not a border change — a glow that expands the perceived hit area.

### Named Rules
**The Ambient-Only Rule.** No hard drop shadows. Every shadow uses large blur (24px–45px) and low opacity (.06–.15). The system feels like soft studio lighting, not paper stacked on paper.

## Shapes

The form language is consistently rounded with two tiers: containers (16px radius) and interactive elements (12px radius). Pills and badges use full rounding.

- **Containers** (cards, sections, callout boxes): 16px radius (rounded-2xl). Large enough to feel soft, not enough to feel playful.
- **Interactive elements** (buttons, inputs, select menus): 12px radius (rounded-xl). Slightly tighter than containers, establishing a subtle hierarchy between "this holds content" and "this does something."
- **Badges and chips:** Full radius (rounded-full). Pills that feel like status indicators, not buttons.
- **Avatar/logo:** Full radius (circular). The logo mark is always a circle with a thin primary/20 border.
- **Hero photography:** 18px radius with a 4px white border frame. The photo has its own shape language — slightly more rounded than standard cards, with the white border creating a physical-frame effect.

### Named Rules
**The Two-Tier Rule.** Containers get 16px radius. Interactive elements get 12px radius. Nothing else. This two-level system prevents the "every element has a different radius" drift that plagues component-heavy builds.

## Components

### Buttons
- **Shape:** Gently rounded (12px radius), minimum height 48px for primary actions, 44px for secondary
- **Primary:** Academy Blue background, white text, font-bold, with a subtle blue glow shadow. Hover darkens to Deep Authority. No border.
- **Outline:** White background, Slate Ink text, Silver Border, font-bold. No shadow. Hover is elevation-based (subtle overlay).
- **WhatsApp CTA:** White background with WhatsApp Green border, dark green text. Specific to the WhatsApp contact action — not a generic "success" button.
- **Ghost:** Transparent background, transparent border. Used inside dense layouts where a visible button would add noise.
- **All buttons** use the hover-elevate system (pseudo-element overlay) rather than background-color transitions, creating a consistent interaction model.

### Cards / Containers
- **Corner style:** 16px radius (rounded-2xl)
- **Background:** Pure White on Cloud Canvas sections; Cloud Canvas (#F6F8FC) on White sections. Cards always contrast their parent.
- **Border:** 1px Silver Border (#DCE3EC). Some featured cards use a blue border (#B8D6F7) for emphasis.
- **Shadow:** Card ambient (0 8px 30px rgba(15,29,50,.06)). Present at rest, not hover-only.
- **Internal padding:** 24px (p-6). Consistent across all card types.
- **Hover (academy-card class):** translateY(-4px) lift with shadow increase and blue-tinted border. Used selectively on browsable cards, not on static content cards.

### Chips / Badges
- **Style:** Ice Blue Tint background (#EAF3FF), Academy Blue text, fully rounded (pill shape)
- **Padding:** 4px 12px (small) or 8px 16px (standard)
- **Weight:** font-bold at 12-14px
- **No hover state.** Chips are informational, not interactive.
- **Neutral variant:** Cloud Canvas background (#F6F8FC), Calm Steel text. Used for tag-like metadata inside cards.

### Inputs / Fields
- **Style:** White background, Silver Border, 12px radius, minimum height 44px
- **Typography:** 14px, Slate Ink color, right-aligned for Arabic
- **Focus:** Border shifts to Academy Blue (#0564C9) with a 3px blue glow ring (rgba(5,100,201,.12))
- **Error:** Red-50 background with red-700 bold text in a rounded-xl container below the field group
- **Select menus** share the same visual treatment as text inputs — no native select appearance differences.

### Navigation
- **Sticky top** with white/95 background and backdrop-blur
- **Height:** 64px (h-16), containing logo + links + CTAs
- **Logo:** Circular image (40px) with primary/20 border, paired with name (bold primary) and tagline (muted 10px)
- **Links:** 14px font-bold, Calm Steel default → blue-50 bg + primary text when active. Intersection Observer tracks which section is visible.
- **Mobile:** Full-screen slide-from-right drawer (Framer Motion), rounded-[14px] link items with icon + label + chevron, student status card at top
- **CTA pair:** Primary button ("دخول المنصة") + outline WhatsApp button in desktop nav; mirrored in mobile drawer as a 2-col grid

### Section Title (Signature Component)
A reusable composition that appears above every content section:
- **Eyebrow:** Label weight (14px bold), Academy Blue color, centered
- **Headline:** Headline weight (30-34px extrabold), Slate Ink, centered, max-w-3xl
- **Supporting text (optional):** 15px medium, Quiet Grey, centered, with generous line-height
- **Spacing:** 8px from eyebrow to headline, 12px from headline to support text, 40px (mb-10) from the whole unit to the content below

### Floating Bottom Bar (Mobile)
- **Fixed bottom, full-width, z-40**
- **White/95 background with backdrop-blur and upward shadow**
- **2-column grid:** Primary CTA (Academy Blue) + WhatsApp CTA (green border)
- **Safe area padding** for notched devices
- **Hidden on md+ screens**

## Do's and Don'ts

### Do:
- **Do** use Academy Blue (#0564C9) as the only accent color on public-facing pages. Its singularity is the brand signal.
- **Do** maintain the 16px/12px radius split between containers and interactive elements. Every rounded corner should be one or the other.
- **Do** use the SectionTitle pattern (eyebrow → headline → optional subtext) for every content section. Consistency in section openings creates a reading rhythm.
- **Do** pair every CTA with a WhatsApp alternative. Parents expect direct human contact alongside any digital action.
- **Do** use font-weight 500+ for all text. Cairo below 500 is too thin for screen Arabic.
- **Do** respect the RTL-first layout: icons trail text (ArrowLeft is "forward" in RTL), phone numbers are `dir="ltr"`, and grid ordering accounts for reading direction.

### Don't:
- **Don't** introduce a second chromatic accent color. No orange for "urgency," no purple for "premium," no green for "success buttons." Trust Green is only for checkmark icons.
- **Don't** use pure black (#000000) for text. Slate Ink (#172033) is the darkest text color in the system.
- **Don't** add structural shadows (hard edges, small blur). Every shadow is ambient (24px+ blur, under 15% opacity).
- **Don't** use letter-spacing or text-transform on Arabic text. Arabic has no uppercase; letter-spacing distorts connected script.
- **Don't** place interactive elements in the bottom 90px of mobile layouts — the fixed CTA bar occupies that space.
- **Don't** fabricate testimonials, student counts, success rates, or institutional claims. Every proof point must come from the admin-managed settings API.
