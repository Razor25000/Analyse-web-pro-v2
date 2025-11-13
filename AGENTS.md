# Repository Guidelines

## Project Structure & Module Organization

The Next.js 15 App Router lives in `app/` for routes, layouts, API handlers, and auth. Shared code sits in `src/` with `components/ui` (shadcn primitives), `components/nowts` (custom UI), `features/` (vertical slices), `hooks/`, and `lib/` utilities like `auth.ts` and `safe-actions.ts`. Persistent assets sit in `prisma/`, `content/`, `docs/`, `emails/`, and `scripts/`. Tests split between `__tests__/` (Vitest) and `e2e/` (Playwright).

## Technology & Key Capabilities

The stack combines strict TypeScript, TailwindCSS v4, Prisma/PostgreSQL, Better Auth multi-tenant orgs, TanStack Query, Stripe, and React Email; server actions and the dialog system (`src/features/dialog-manager/`) drive most flows.

## Build, Test, and Development Commands

Run `pnpm install` and stay on pnpm scripts. `pnpm dev` (or `pnpm dev:keep-session`) starts the local server after cache cleanup; `pnpm build` and `pnpm start` ship production assets. Run `pnpm lint`, `pnpm lint:ci`, `pnpm format`, `pnpm ts`, `pnpm test`, `pnpm test:ci`, and `pnpm test:e2e:ci` before pushing. Reach for `pnpm prisma:seed`, `pnpm clean:*`, or `pnpm better-auth:migrate` when iterating on schema or seeded data.

## Coding Style & Naming Conventions

Prettier (`.prettierrc.yaml`) enforces 80-character lines, two-space indentation, sorted Tailwind classes, and semicolons; ESLint (`eslint.config.mjs`) layers strict TypeScript/React rules, Unix line endings, and no tabs. Name components in `PascalCase`, hooks in `useCamelCase`, server actions `<feature>.action.ts`, and tests `<feature>.test.tsx`. Favor server components, add "use client" only when necessary, group Tailwind classes layout > spacing > color, and reuse shared typography/card primitives.

## Testing Guidelines

Vitest suites mirror source structure with setup in `test/vitest.setup.ts`; store helpers in `__tests__/lib` or `src/lib/__mocks__`. Playwright specs live in `e2e/` with fixtures under `e2e/utils/`; run CI via `pnpm test:e2e:ci`, iterate locally with `pnpm test:e2e`, and adjust the global teardown when specs mutate shared data.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, etc.) and keep subjects imperative, mirroring history such as `feat: implement batch audit upload page`. PRs should link issues, flag migrations or config shifts, attach screenshots or recordings for UI work, and show lint, type, and relevant test runs.

## Environment & Workflow Expectations

Copy `.env.local.template` to `.env.local`, populate `DATABASE_URL` and `DIRECT_URL`, then run `pnpm prisma generate` after schema edits. Keep `.env*` and `test-results/` out of Git. Before editing, read at least three relevant files (similar features plus imported helpers) to stay aligned. Use path aliases (`@/*`, `@email/*`, `@app/*`), prefer `up-fetch.ts` over raw `fetch`, and default to `??` for fallbacks.
