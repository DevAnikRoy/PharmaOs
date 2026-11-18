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

## Stock and onboarding recovery

- Dashboard navigation includes Stock. Tables scroll horizontally on narrow screens.
- Stock always labels quantities as whole packs and prices as per pack.
- Expired and sellable stock are shown separately; expiry status includes text.
- Each receipt lists batch number, expiry, received/remaining packs, buy price,
  receipt date, and status. FEFO ordering is shown without deducting stock.
- `/setup` offers pharmacy-name entry and sign out for interrupted onboarding.
- Confirmation failures and setup errors use localized messages. Login includes
  confirmation email resend; the email field is reused without requiring a password.


## Cash counter and receipts

- Sales navigation opens search, a persistent-in-navigation cart, and the latest 20 receipts.
- Whole packs and per-pack prices are explicit. The confirmation button records full cash payment.
- An uncertain checkout keeps its lines fixed and offers Retry this checkout.
- Receipts show the shop, unique reference, Bangladesh timestamp, product/price snapshots,
  line totals, grand total, and allocated batches. Printing hides navigation and controls.
- The dashboard shows today's cash total and receipt count with a link to the counter.
