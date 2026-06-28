# Weekly security audit — AIRLUXO

You are running headless in CI. Perform a focused security + code-quality audit of
this repository and write your findings to `security-report.md` in the repo root.
Do **not** open PRs or issues yourself — the workflow does that with your output.

## Scope — review across four angles

1. **Edge-function access control** (`supabase/functions/`): missing/weak auth,
   broken authorization / IDOR, SSRF on any remote `fetch` (check that
   `_shared/safefetch.ts` is used for attacker-influenceable URLs), CORS, injection,
   secret leakage, unbounded operations.
2. **SQL / RLS** (`supabase/migrations/`): tables missing `enable row level security`,
   permissive `using (true)` / `with check (true)` policies, `SECURITY DEFINER`
   functions that don't pin `search_path` or don't gate on `is_admin()` / ownership,
   `EXECUTE` granted to `anon` on privileged RPCs, dynamic SQL without `%I/%L`.
3. **Payments** (`supabase/functions/stripe-*`, `booking-*`, `src/lib/stripe.js`,
   `src/lib/bookings.js`): webhook signature verification, server-side price
   integrity, PaymentIntent↔booking binding, idempotency/replay, refund clamping.
4. **Frontend + optimizations** (`src/`): bundled secrets (only `VITE_*` public keys
   allowed), XSS (`dangerouslySetInnerHTML`), client-only auth gates not backed by
   RLS, plus high-impact bundle/perf wins (eager heavy imports, missing code-split).

## Method
- Re-derive findings from the current code; do not assume prior fixes hold.
- For each finding give: **severity** (Critical/High/Medium/Low), `file:line`, a
  one-line summary, why it's exploitable/costly, and a concrete fix.
- Be precise and avoid false positives — when unsure, mark it "needs confirmation".

## Output: `security-report.md`
Structure it as:
- A short summary line: counts by severity.
- Sections `## Critical`, `## High`, `## Medium`, `## Low`, `## Optimizations`.
- A final `## Suggested fixes applied` section listing any changes you made.

## Optional mechanical fixes
If — and only if — a fix is small, self-contained, and clearly correct (e.g. add a
`revoke ... from anon`, add an SSRF guard call, fail-closed a check), apply it to the
working tree and note it under "Suggested fixes applied". Do **not** attempt large
refactors or anything that changes the booking/payment flow shape — describe those in
the report for human review instead.
