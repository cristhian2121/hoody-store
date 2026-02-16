# Kame Hoody Constitution

This constitution defines the non-negotiable engineering and product standards for **Kame Hoody**: a Vite + React + TypeScript storefront for **hoodies & t-shirts** with **ES/EN i18n**, **light/dark theme**, a **local cart**, and a **client-side personalization editor** (image/text + simulated AI placeholder).

## Core Principles

### 1) Product-quality UX over “just works”
- The storefront must feel premium: fast, clear, mobile-first, and visually consistent.
- Reuse existing UI primitives in `src/components/ui/` (shadcn + Radix) before introducing new components.
- Avoid disruptive browser primitives (`alert`, `confirm`, blocking flows). Prefer `sonner` toasts for errors/success and inline validation.

### 2) Type-safe domain model is the source of truth
- `src/lib/types.ts` is the canonical domain model for products, cart items, and personalization.
- Do not duplicate domain types in pages/components; import and extend as needed.
- Changes to the domain model must include updates to all affected flows (product detail → cart → checkout summary).

### 3) Routing and information architecture must stay stable
- Routes are part of the product contract:
  - `/` home
  - `/categoria/:category`
  - `/producto/:slug`
  - `/checkout`
- Do not introduce breaking route changes without a migration plan (redirects, updated links, and tests).

### 4) i18n is mandatory for user-visible strings
- Default language is **Spanish**; English must be kept feature-complete.
- All UI copy must come from `useLanguage().t(...)` in `src/lib/i18n.tsx` unless it is:
  - Product data that is already localized (e.g., `product.name[language]`)
  - Non-user-facing developer strings (rare)
- Keep translation keys stable and semantic (e.g., `checkout.placeOrder`, not `button7`).

### 5) State is explicit, minimal, and persistent where appropriate
- The app uses Providers in `src/App.tsx` (theme, language, cart, query client). Keep global state inside these contexts unless a clear new cross-cutting need arises.
- Persistence contracts must remain consistent:
  - Cart storage key: `app-cart`
  - Language storage key: `app-language`
- Avoid storing sensitive user data in `localStorage`. Checkout data should remain in-memory only.

### 6) Personalization is safe-by-default and performance-aware
- Personalization is client-side and must remain robust:
  - Enforce file type allowlist and size limits.
  - Constrain image dimensions (resize) and compress where practical.
- Treat uploaded content as untrusted:
  - Do not render untrusted SVG/HTML via `dangerouslySetInnerHTML`.
  - If SVG support is expanded, sanitize first.
- “AI generation” must not call external services without an explicit API design, secrets management, and privacy review. Placeholder generation is acceptable.

### 7) Styling & theming follow existing conventions
- Tailwind is the primary styling tool; keep custom CSS minimal.
- Theme is controlled by `next-themes` (`ThemeProvider attribute="class"`). Components must respect CSS variables and avoid hard-coded colors when possible.

### 8) Quality gates are enforced continuously
- Must pass locally:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- When changing cart math, price formatting, or personalization behavior, add/extend tests in `src/test/`.

## Architecture & Conventions

### File structure (keep it predictable)
- **Pages / routing**: `src/pages/*`
- **Reusable components**: `src/components/*`
- **UI primitives**: `src/components/ui/*` (do not fork lightly)
- **Domain logic & data**: `src/lib/*` (`types`, `products`, `cart`, `i18n`)
- **Hooks**: `src/hooks/*`

### Data conventions
- Currency is **COP**; formatting must use `formatPrice` from `src/lib/i18n.tsx`.
- Product catalog currently lives in `src/lib/products.ts`. If adding a backend later, keep the UI contract stable and isolate data fetching behind a single module.

## Security, Privacy, and Compliance
- Do not persist PII (names, email, phone, address) to `localStorage` or logs.
- Avoid adding analytics, tracking pixels, or external scripts without explicit product approval and a privacy note.
- Checkout/payment is currently a UI simulation; do not imply real payment processing unless the full integration exists.

## Development Workflow

### Definition of Done (every change)
- Feature works in both **ES and EN** where applicable.
- Keyboard and screen-reader basics are respected (labels, `aria-*`, focus, no traps).
- No console errors; no broken routes; no obvious layout regressions on mobile.
- Tests updated/added when behavior changes.

### PR / review checklist
- Does this change touch translations? Add keys in `src/lib/i18n.tsx`.
- Does this change touch cart persistence (`app-cart`)? Confirm backward compatibility.
- Does this change touch personalization? Re-verify file limits and safe rendering.
- Did you run `lint`, `test`, and `build`?

## Governance
- This constitution supersedes individual preferences and “quick hacks.”
- Amendments require:
  - A written reason (what problem we’re solving)
  - Scope of impact (routes, storage keys, translations, domain types)
  - Migration plan if breaking

**Version**: 1.0.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-02-13
