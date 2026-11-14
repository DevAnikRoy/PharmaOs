# DESIGN_SPEC — PharmaOS

## Principles

- Simple forms, large tap targets for shop counter use.
- shadcn/ui + Tailwind; no custom design system yet.
- Light theme only in foundation — dark mode TO DECIDE.

## Typography & layout

- Default Geist from Next.js template.
- Auth pages: centered `Card`, max width ~md.
- Dashboard: top bar with pharmacy name, language toggle, logout.

## i18n

- Locales: `en` (default), `bn`.
- Cookie: `pharmaos_locale` (`en` | `bn`).
- Toggle on auth pages and dashboard.
- Bangla strings are plain UTF-8 in JSON message files.

## Accessibility

- Use shadcn `Label` + `htmlFor` on inputs.
- TO DECIDE: formal WCAG target.

## Branding

- Product name: **PharmaOS**
- Logo / colors TO DECIDE