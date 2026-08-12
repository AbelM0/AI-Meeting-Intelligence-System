# Design System: Auralis Meeting Intelligence

**Source:** User-supplied Auralis Neural Audio Engine brief, adapted for an Operate-mode meeting workspace.

## Configuration

| Dial          | Level | Application                                                           |
| ------------- | ----: | --------------------------------------------------------------------- |
| Creativity    |     6 | Distinctive audio-instrument identity without obscuring routine tasks |
| Density       |     6 | Compact meeting operations with deliberate breathing room             |
| Variance      |     6 | Asymmetric page composition, consistent component geometry            |
| Motion intent |     4 | State feedback and restrained signal movement only                    |

## 1. Visual Theme & Atmosphere

Auralis feels like a precise neural-audio instrument in a bright studio: a clean white canvas, layered light surfaces, crisp indigo controls, and cyan signal accents. The interface is technical without becoming a terminal, premium without glass effects, and expressive through strong type, fine rules, and measured asymmetry. This is an operating surface, so state and task clarity always outrank spectacle.

## 2. Color Palette & Roles

- **Canvas** (`#F7F8FC`) - page background with a cool near-white cast.
- **Surface** (`#FFFFFF`) - primary working panels and form surfaces.
- **Ink depth** (`#1C1C1E`) - optional high-contrast text and icon color only. Do not use it as a component background.
- **Ink** (`#111827`) - primary text and strong icons.
- **Muted ink** (`#4B5563`) - descriptions, secondary labels, and helper text.
- **Hairline** (`#E5E7EB`) - structural borders and dividers.
- **Primary indigo** (`#4F46E5`) - primary actions, selected state, and keyboard focus.
- **Signal cyan** (`#06B6D4`) - audio signal, upload progress, and informational processing states. It supports indigo and is not used as a competing CTA color.
- **Success** (`#047857`) - completed or uploaded state.
- **Warning** (`#B45309`) - queued or preprocessing state.
- **Danger** (`#B91C1C`) - failed state and destructive actions.

Use flat color fields and low-contrast ambient radial light only. No purple-blue gradient text, neon outer glow, or mixed warm and cool neutral systems.

## 3. Typography Rules

- **Display and UI:** Geist, loaded locally through Next.js when available, with a system sans fallback.
- **Technical metadata:** Geist Mono or JetBrains Mono, with a system monospace fallback.
- **Page title:** 48-64px on wide screens, 36-44px on compact screens, weight 500-600, tight tracking, 1.04-1.1 line height.
- **Section title:** 18-24px, weight 600, tight tracking.
- **Body:** 14-16px, weight 400, 1.55-1.65 line height, 65-75ch maximum for prose.
- **Labels and metadata:** 11-12px mono, weight 600, modest positive tracking. Use uppercase sparingly for true technical labels only.
- Enable tabular figures for counts, durations, dates, and file sizes.

## 4. Shape, Borders & Elevation

- Cards and major panels use an 8px radius.
- Inputs and buttons use an 8px radius.
- Status chips may use a full pill only because they communicate compact state.
- Borders are 1px hairlines. Dashed borders belong only to drop targets.
- Shadows are rare, wide, and cool-tinted. Prefer border and contrast over card-on-card elevation.
- The modal may use stronger elevation because it changes interaction context.

## 5. Layout Principles

- Content is contained within a 1440px maximum width.
- The dashboard uses an asymmetric grid: the meeting library occupies the main column and a restrained processing overview occupies the secondary column.
- Summary values are a compact horizontal rail, not three equal floating cards.
- Meeting rows behave like a library/list, separated by whitespace and hairlines rather than nested cards.
- The detail view preserves the same shell and visual grammar as the dashboard.
- Mobile below 768px collapses to one column with 16px page padding and no horizontal scrolling.
- Touch targets are at least 44px. Desktop navigation stays on one line and below 80px high.

## 6. Component Styling

- **Navigation:** white surface with a pale indigo Auralis mark, thin bottom border, and concise mono product context.
- **Primary buttons:** indigo fill, white text, 8px radius, slight upward hover shift and 1px pressed translation.
- **Secondary buttons:** white or transparent fill with a hairline border. No generic ghost treatment over an undefined background.
- **Inputs:** label above, cool-white inset surface, indigo focus border and visible focus ring, error message below.
- **Meeting rows:** title and creation time lead; status and duration remain scannable; destructive action stays visually quiet until hover or focus.
- **Status chips:** semantic color is restrained to text, border, and a light fill. Animated indicators appear only for genuinely active processing states.
- **Audio dropzone:** light inset upload bay with a dashed hairline, supported formats, and a clear selected-file state.
- **Loading:** skeletons match the final row geometry. No circular loading spinner for page content.
- **Empty:** show the workflow and a direct creation action, not only a generic icon and message.
- **Errors:** inline, specific, and paired with a recovery path when one exists.

## 7. Motion & Interaction

- Default interaction timing is 180-240ms with an ease-out curve.
- Motion communicates hover, press, focus, upload progress, modal entry, or processing state.
- Motion is limited to modal entry and direct interaction feedback, and must stop under `prefers-reduced-motion: reduce`.
- Animate transform and opacity only. Do not animate layout dimensions or attach raw scroll listeners.
- No orchestrated dashboard page-load sequence.

## 8. Responsive & Accessibility Rules

- Verify at 375px, 768px, 1024px, and 1440px.
- Keep body copy at 14px minimum and controls at 44px minimum height.
- Preserve logical focus order, visible focus rings, accessible dialog labels, and keyboard dismissal.
- Never rely on color alone for meeting status; always include a text label.
- Maintain WCAG AA contrast for body text, controls, placeholders, and focus indicators.
- Respect reduced motion and avoid decorative autoplay that cannot be disabled by system preference.

## 9. Anti-Patterns

- No generic three-card metric row.
- No glassmorphism, neon glow, gradient text, or oversized blur blobs.
- No centered marketing hero inside the authenticated workspace.
- No card-inside-card-inside-card hierarchy.
- No default browser, Inter, or decorative serif typography.
- No pure black or pure white as a text/background pair.
- No dark component backgrounds. Use white, cool gray, or pale indigo surfaces throughout.
- No inconsistent radii or icon families.
- No emojis, decorative status dots, fake transcripts, fake insights, or invented precision.
- No AI copy clichés such as "Elevate," "Seamless," "Unleash," or "Next-Gen."
- No em dashes or en dashes in visible UI copy.
