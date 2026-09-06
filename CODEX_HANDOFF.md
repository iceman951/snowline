# Codex parallel work — 2026-09-06

Read `HANDOFF.md` first for architecture and acceptance criteria.

## Active ownership — second pass

Codex is implementing `/portfolio/categories`, its category-edit core module,
API editor endpoints and SvelteKit form actions. Please leave this route and
`packages/core/src/category-edits.ts` to Codex. Small integration edits also touch
the API route/client and reference extraction/parity files. Holdings and its
drawer remain available to Claude.

Codex also owns `apps/api/test/integration.test.ts` and corrected the existing API
error handler to preserve 422 validation / 400 malformed-body responses.

## Completed: regression coverage for the existing engine

Codex added only these files in this pass:

- `packages/core/test/scenarios.test.ts`
- `CODEX_HANDOFF.md`

The new suite adds 20 scenarios alongside the original 19 tests:

- Every ported holding field, with open and sold positions.
- Category regrouping, empty buckets, deleted bucket assignments, duplicate or
  blank names, target rounding/clamping, and fallback to the seed. Checks both
  category orderings plus downstream holdings and portfolio totals.
- Payment amounts and ticker ordering for every calendar month; complete forward
  payment statuses and rollover from January, August and December.
- Full goal configurations and projections under nine combinations of income/value
  targets, contribution growth, reinvestment, taxes, inflation, falling returns,
  unreachable targets and input clamps.
- Shared formatters: fractional shares, rounding and signs, including currency prefixes.

The suite runs the design bundle directly as an independent oracle with isolated
in-memory browser storage for each case. It does not change global browser state,
the prototype, the generated fixtures, or SQLite. Numeric comparison uses absolute
tolerance below `1e-7`; prototype-only fields omitted by the port are not required.
No new engine functions were ported, so the extraction script was not changed.

## Verification at completion

```sh
bun test packages/core
# 39 pass, 0 fail; 27,381 assertions across two files

bun run check
# svelte-check: 0 errors, 0 warnings
```

On this Windows host, the filesystem sandbox prevented esbuild from resolving the
Vite config. The successful Svelte check above ran outside that sandbox with a
non-login shell. No project configuration was changed to work around the host.

These results cover core parity and Svelte diagnostics at the time of the run;
they do not certify a production build, browser interactions, or API persistence.

## Coordination

Concurrent edits were observed in `packages/core/src/derive.ts`, `index.ts`,
`types.ts`, and a new `ledger.ts`. Codex left those edits to their current owner.
No Holdings route or table was created in this pass. The existing handoff's
suggested Holdings implementation remains available to the screen implementer.

The new suite covers the previously ported engine surface. The ledger functions,
corporate actions, price series and transaction detail still need their own parity
coverage as they are implemented, following `HANDOFF.md` section 5.
