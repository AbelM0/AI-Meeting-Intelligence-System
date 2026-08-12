---
version: 1
slug: 'apps-web-src-app-page-tsx'
primary_target: 'apps/web/src/app/page.tsx'
related_targets: ['apps/web/src/features/meetings/components/meetings-dashboard.tsx']
---

# Surface Brief: Meetings Dashboard

- **Scope:** `apps/web/src/app/page.tsx` and the existing meetings feature components it composes.
- **Mode:** Operate.
- **Audience:** People creating meeting records, attaching private audio, and scanning processing state.
- **Job:** Find or create a meeting quickly, understand its state, and continue into its detail view.
- **Primary action:** New meeting.
- **Constraints:** Preserve routes, request shapes, search behavior, deletion, validation, and all real API-derived states. Do not add unsupported transcript, participant, quality, storage, or summary data.
- **Direction:** User-pinned Auralis neural-audio instrument world, refined to an all-light component system. Bright studio canvas, indigo action, cyan accents, restrained technical metadata.
- **Approved composition:** `.impeccable/mocks/auralis-dashboard-command.png`.
- **Memorable moment:** The meeting library stays dominant, with audio identity carried through precise iconography, metadata, and pale signal accents rather than a dedicated visualization panel.

## Fidelity Inventory

| Ingredient      | Commitment                                                                      | Medium                                 |
| --------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| Navigation      | One line, 72px maximum, Auralis mark and product context                        | Semantic HTML and Lucide icons         |
| Summary         | Compact ruled rail using only real meeting counts                               | Semantic HTML and CSS Grid             |
| Meeting library | Searchable rows, title-led hierarchy, semantic status, quiet destructive action | Existing React components and Tailwind |
| Processing view | Compact light panel with real status counts                                     | Semantic HTML and CSS Grid             |
| Primary action  | Indigo 8px control, 44px minimum, tactile hover/press                           | Existing React form trigger            |
| Detail page     | Same shell, typography, geometry, and audio vocabulary                          | Existing React components and Tailwind |
| Motion          | State feedback and signal movement only; reduced-motion fallback                | CSS transform and opacity              |
