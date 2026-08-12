# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Repository-inferred: people who create and manage meeting records, attach private audio recordings, and need to understand each recording's processing state at a glance. The primary workflow is desktop-oriented but must remain fully usable on mobile.

## Product Purpose

The AI Meeting Intelligence System organizes meetings and their source recordings in one workspace. Success means a user can create a meeting, find it again, attach or replace one supported recording, and understand the current processing state without ambiguity.

## Positioning

Repository-confirmed mechanism: each meeting is a durable record with a private Supabase Storage audio attachment and an explicit processing lifecycle shared across the web app and API.

## Operating Context

Users work from a meeting library and a meeting-detail view. They search meeting titles, create and delete meeting records, upload MP3, WAV, or M4A audio, and review uploaded, queued, preprocessing, transcribing, analyzing, completed, or failed states.

## Capabilities and Constraints

- Next.js 16 App Router frontend backed by a NestJS REST API.
- A meeting title is required and limited to 200 characters.
- Each meeting supports one private audio recording at a time.
- Supported audio formats are MP3, WAV, and M4A, with a default 50 MB limit.
- Existing routes, request shapes, validation, storage security, and query behavior must remain stable during visual work.
- Transcription and analysis credentials are documented as future integrations; the UI must not fabricate transcripts, summaries, speakers, benchmarks, or completed intelligence that the current product does not return.

## Brand Commitments

- Product name: AI Meeting Intelligence System.
- The uploaded Auralis Neural Audio Engine brief is the binding visual reference for the frontend: focused audio tooling, a white canvas with light component surfaces, indigo primary controls, cyan signal accents, Geist typography, and JetBrains Mono for technical metadata. The user explicitly removed dark component backgrounds from this adaptation.
- Voice is direct, precise, calm, and operational. Avoid hype and invented performance claims.

## Evidence on Hand

- Product and setup documentation: `README.md`.
- Current frontend workflows: `apps/web/src/features/meetings`.
- Shared meeting and audio contracts: `packages/types/src/index.ts` and `packages/schemas/src/index.ts`.
- Visual reference supplied by the user: `auralis-neural-audio-engine-2-DESIGN.md`.
- No real transcripts, summaries, customer claims, performance metrics, or testimonial assets are present. Future UI work must not invent them.

## Product Principles

- Make recording state legible before adding visual expression.
- Preserve privacy and upload constraints in every audio interaction.
- Keep routine meeting actions fast, familiar, and keyboard accessible.
- Treat audio as the visual and conceptual center of the product.
- Distinguish current functionality from future intelligence capabilities.

## Accessibility & Inclusion

Preserve semantic HTML, visible keyboard focus, readable contrast, reduced-motion behavior, 44px minimum touch targets, and clear inline error recovery across desktop and mobile.
