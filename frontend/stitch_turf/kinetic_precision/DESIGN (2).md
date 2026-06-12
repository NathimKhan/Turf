---
name: Kinetic Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#006229'
  on-tertiary: '#ffffff'
  tertiary-container: '#007e37'
  on-tertiary-container: '#c1ffc5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  headline-2xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-2xl-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style

The design system is built on the intersection of athletic intensity and architectural precision. It captures the "flow state" of a high-performance athlete—focused, energetic, and effortless. The aesthetic avoids the clutter of traditional sports apps, instead opting for a "Premium Athleticism" style that blends the bold typography of elite sports branding with the airy, refined layouts of modern fintech.

The emotional response should be one of motivation and reliability. Every interaction feels fast (Kinetic) but controlled (Precision). We utilize a "Human-Crafted" approach where whitespace is intentional, and visual weight is used to guide the user through complex booking flows without cognitive fatigue.

## Colors

This design system utilizes a high-octane palette designed to signify action and achievement. 

- **Primary Blue (#2563EB):** The core brand color, used for primary actions and brand presence. It represents trust and professional stability.
- **Electric Cyan (#06B6D4):** Used for highlights, active states, and to provide a sense of modern technology.
- **Vibrant Accents:** Sports Green is reserved for success states and availability; Energy Orange and Yellow are used sparingly for urgent notifications, premium features, or "hot" booking times.
- **Surface Strategy:** The system uses a crisp white base with `section_fill` (#EFF6FF) to define logical groupings. Neutral tones are pulled from the cool-gray spectrum to maintain a clean, tech-forward feel.

## Typography

The typography system relies exclusively on **Inter** to achieve a systematic, highly legible, and modern appearance. The hierarchy is characterized by significant contrast between heavy, tight-tracked headlines and spacious, functional body text.

- **Headlines:** Set in Extra Bold (800) or Bold (700) with negative letter spacing to evoke the feeling of sports posters and high-end editorial magazines.
- **Labels:** Use a slightly increased letter spacing and semi-bold weights to ensure they remain legible even at small sizes on interactive components like chips or meta-data tags.
- **Responsive Scaling:** On mobile, top-level headlines scale down aggressively to maintain impact without forcing awkward line breaks.

## Layout & Spacing

The layout philosophy follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The system emphasizes "Generous Breathing Room," pulling influence from high-end hardware interfaces where white space is as important as content.

- **Grid:** Use a 24px gutter to provide clear separation between cards and content modules.
- **Margins:** Large 40px outer margins on desktop ensure content feels "heroic" and centered.
- **Rhythm:** An 8px baseline grid dictates all internal padding and stacking. Use `section-gap` (80px) to clearly demarcate different phases of the user journey (e.g., Discovery vs. Booking).

## Elevation & Depth

This design system uses **Tonal Glassmorphism** and **Precision Borders** to define hierarchy, moving away from heavy, muddy shadows.

1.  **Base Layer:** Solid white (#FFFFFF) or secondary background (#F8FAFC).
2.  **Interactive Layer (Cards/Modals):** Subtle 1px borders (#E2E8F0) combined with a high-diffusion, low-opacity shadow (4% Alpha Black) to create a sense of the element floating just above the surface.
3.  **Glassmorphism Surfaces:** For overlays and navigation bars, use a backdrop blur (12px to 20px) with a 70% opacity white fill. This maintains the "Alive" feel, allowing background energy to peek through.
4.  **Active States:** Elements being interacted with should utilize a "Magnetic" lift effect—increasing the shadow spread and slightly scaling the element (1.02x) to provide tactile feedback.

## Shapes

The shape language is "Soft-Tech." We use **Rounded (Level 2)** settings to strike a balance between professional precision and approachable sportiness.

- **Standard Elements:** Buttons, inputs, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Hero cards and section containers use `rounded-lg` (16px) or `rounded-xl` (24px) to create a distinct, modern framing for imagery.
- **Interactive Indicators:** Chips and certain action buttons may use pill-shapes to signify high interactability and contrast against the more structured grid.

## Components

- **High-Contrast Buttons:** Primary buttons use the Primary Blue (#2563EB) with white text. Hover states trigger a subtle gradient shift towards Electric Cyan. Use a magnetic hover effect where the button follows the cursor slightly within its container.
- **Interactive Cards:** Large cards feature crisp 1px borders and use high-quality athletic photography. Metadata (price, time, location) is tucked into a glassmorphic footer at the bottom of the card image.
- **Status Chips:** Use a subtle background fill version of the accent colors (e.g., 10% opacity Sports Green for "Available") with bold text in the same hue.
- **Input Fields:** Minimalist design with a 1px #E2E8F0 border that transitions to a 2px Primary Blue border on focus. Labels should float or remain persistent in `label-sm` style.
- **Dynamic Progress Bars:** For booking steps, use a sleek, thin bar using the Electric Cyan to indicate momentum and completion.
- **Booking Lists:** Use generous vertical padding (16px-24px) and divider lines that don't span the full width of the container, maintaining a clean, "Stripe-like" edge.