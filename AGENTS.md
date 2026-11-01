# A&W Laundry — Codex Instructions

## Project

A&W Laundry is a responsive laundry management web application for customers and administrators.

The project uses:

- React Router Framework Mode with SPA Mode
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Supabase Edge Functions where trusted server-side execution is required
- npm
- Vercel

---

## Source of Truth

Before making substantial changes, read the relevant project documentation:

- `docs/PRD.md` — product requirements and business rules
- `docs/DESIGN.md` — UI/UX and design system
- `docs/DATABASE.md` — database model, relationships, and security rules
- `docs/ARCHITECTURE.md` — technical architecture and code organization

Do not silently invent requirements that conflict with these documents.

If implementation requires a major requirement, schema, design, or architecture change, explain the conflict before making the change.

---

## Development Approach

Work incrementally.

Do not attempt to build the entire application in one task.

For every task:

1. Inspect the existing project before editing.
2. Read the relevant documentation.
3. Keep the change limited to the requested scope.
4. Reuse existing patterns and components.
5. Avoid modifying unrelated files.
6. Run relevant checks after implementation.
7. Report what changed and any remaining issues.

---

## Code Quality

Use TypeScript with strict typing.

Avoid `any` unless there is a clear reason.

Prefer small, readable, reusable functions and components.

Use feature-oriented organization according to `docs/ARCHITECTURE.md`.

Do not add unnecessary dependencies.

Before adding a package, check whether the existing stack already provides the needed capability.

---

## UI Rules

Follow `docs/DESIGN.md`.

Prefer shadcn/ui components before creating custom generic UI components.

Use Tailwind CSS for styling.

Use Lucide React for icons.

Maintain responsive behavior.

Customer UI is mobile-first.

Admin UI is desktop-first but must remain responsive.

Do not redesign unrelated pages while implementing a feature.

---

## Data and Supabase Rules

Follow `docs/DATABASE.md`.

Use Supabase Auth for authentication.

Use PostgreSQL foreign keys and constraints.

Use Row Level Security for customer-owned data.

Never rely only on frontend route guards for authorization.

Do not expose:

- Supabase service role keys
- Supabase secret keys
- AI provider API keys
- other server secrets

to browser code.

Do not place secrets in variables prefixed with `VITE_`.

Do not allow customers to modify operational fields such as:

- final price
- actual quantity
- payment confirmation
- operational order status
- admin notes
- user roles

unless explicitly allowed by the documented business logic.

---

## Order Rules

Orders are a core business domain.

Preserve:

- order history
- price snapshots
- status history
- payment history
- auditability

Do not hard-delete important transaction history.

Use `CANCELLED` or other documented states where appropriate.

---

## AI Chatbot Rules

The A&W Laundry Assistant is read-oriented for transactional data in MVP.

It may read:

- public service information
- authenticated customer's profile
- authenticated customer's orders
- authenticated customer's order timeline
- authenticated customer's payment status

It must not:

- access another customer's private data
- change order status
- change final price
- confirm payment
- change user roles
- expose secrets
- perform admin-only actions

AI provider calls requiring secrets must run in trusted server-side code, not directly in the browser.

---

## Validation

Handle:

- loading
- success
- empty
- validation errors
- authorization errors
- network/server errors

Do not display raw database errors to end users.

Important calculations and sensitive mutations must not trust browser-provided values blindly.

---

## Before Finishing a Task

When applicable, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Run relevant tests when tests exist.

If a command does not exist yet, do not invent a fake successful result. State that it is not configured.

---

## Git Safety

Do not commit or expose `.env` or `.env.local`.

Do not perform destructive Git operations unless explicitly requested.

Do not overwrite unrelated user work.

---

## Response Style

When completing a coding task, summarize:

1. What was changed
2. Important files changed
3. Checks that were run
4. Any errors or follow-up work

Keep the summary concise.