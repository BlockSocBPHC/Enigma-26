# Backend Review v2 — Enigma-26

Re-checked all 32 files. You've made **significant progress** since the last review. Here's the updated status.

---

## ✅ Fixed Since Last Review

| # | Issue | Status |
|---|-------|--------|
| 1 | `getDefenseScore.ts` — broken import path + wrong function casing | ✅ **Fixed** — import now points to `../../TeamScore/getTeamScore`, function name matches |
| 2 | `calculateFinalTeamScore.tsx` — `"use server"` with browser client | ✅ **Fixed** — removed `"use server"`, removed unused import, renamed to `.ts` |
| 3 | All DB ops client-side | ✅ **Fixed** — all utility files now use `createServerClient` via `@/utils/supabase/server` with cookies |
| 4 | `googleAuth.ts` — hardcoded `localhost` redirect | ✅ **Fixed** — now uses `${window.location.origin}/auth/callback` |
| 5 | Auth callback — errors silently swallowed | ✅ **Fixed** — now handles OAuth errors, missing code, and exchange failures with proper redirects |
| 6 | `.tsx` extensions with no JSX | ✅ **Fixed** — `applyRebuild.ts` and `calculateFinalTeamScore.ts` now use `.ts` |

---

## 🔴 Critical — Still Remaining

### 1. Missing root `middleware.ts`

Your [`utils/supabase/middleware.ts`](file:///d:/Websites/enigma-26/utils/supabase/middleware.ts) now has a properly written `updateSession()` function — great! But there's still **no `middleware.ts` at the project root** to actually call it.

You need to create `d:\Websites\enigma-26\middleware.ts`:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Without this, **auth sessions will never refresh** via middleware and your `supabase.auth.getUser()` calls in Server Components/Actions will eventually get stale tokens.

---

## 🟠 Significant — Still Remaining

### 2. `"use server"` directive on non-exported helper files

You added `"use server"` to many utility files:
- [`getDefenseScore.ts`](file:///d:/Websites/enigma-26/app/utils/attack/ValuesGetter/getDefenseScore.ts)
- [`isAttackSuccessful.ts`](file:///d:/Websites/enigma-26/app/utils/attack/isAttackSuccessful.ts)
- [`attackingTeamChanges.ts`](file:///d:/Websites/enigma-26/app/utils/attack/attackingTeamChanges.ts)
- [`applyRebuild.ts`](file:///d:/Websites/enigma-26/app/utils/Rebuild/applyRebuild.ts)
- [`applyEventChanges.ts`](file:///d:/Websites/enigma-26/app/utils/GlobalEvents/applyEventChanges.ts)
- [`getLeaderboard.ts`](file:///d:/Websites/enigma-26/app/utils/Leaderboard/getLeaderboard.ts)

`"use server"` marks **every exported function** as a Server Action — meaning they become callable directly from the client over HTTP. This is correct for top-level orchestrator functions (like `applyRebuild`, `applyEventChanges`, `afterAttack`) that you want the client to invoke. But **internal helpers** like `getDefenseScore`, `isAttackSuccessful`, `attackingTeamChanges`, and the DB query functions don't need to be Server Actions — they should just be regular server-only functions imported by the Server Actions.

> [!WARNING]
> When `"use server"` is at the file level, **any user can call any exported function** from that file as an HTTP endpoint. For example, `attackingTeamChanges` could be called with arbitrary team names and attack types from the browser, bypassing your game flow. Consider removing `"use server"` from internal helpers and only keeping it on the functions you explicitly want the client to call.

### 3. `afterAttack.ts` and `applyUpgradePhase.ts` — Missing `"use server"` directive

[`afterAttack.ts`](file:///d:/Websites/enigma-26/app/components/afterAttack.ts) and [`applyUpgradePhase.ts`](file:///d:/Websites/enigma-26/app/components/applyUpgradePhase.ts) call server-side functions (`getTeamScore`, `updateTeamScore` etc. which use `cookies()`) but don't have `"use server"` themselves. These **must** be Server Actions (or called from a Server Action) because they transitively call `cookies()` from `next/headers`, which only works on the server.

If `page.tsx` (a `"use client"` component) tries to call `afterAttack()` or `applyUpgradePhase()` directly, it will fail because `cookies()` isn't available client-side.

### 4. Redundant auth check in dashboard page

[`(protected)/layout.tsx`](file:///d:/Websites/enigma-26/app/(protected)/layout.tsx) already checks for auth and redirects to `/`. Then [`(protected)/dashboard/page.tsx`](file:///d:/Websites/enigma-26/app/(protected)/dashboard/page.tsx) checks auth **again** and redirects to `/login?error=unauthorized`. These redirect to different places — inconsistent behavior. The page-level check is redundant since the layout already guards.

### 5. `page.tsx` imports Server Actions into a `"use client"` component

[`page.tsx`](file:///d:/Websites/enigma-26/app/page.tsx) is `"use client"` but directly imports `getTeamScore`, `getDefenseScore`, `isAttackSuccessful`, `afterAttack`, `applyRebuild`, `applyEventChanges`, and `getLeaderboard`. For this to work, each of these **must** be a proper Server Action (with `"use server"` in their file or on the function). Currently `afterAttack` and `applyUpgradePhase` are missing the directive (see #3 above).

---

## 🟡 Minor — Still Remaining

### 6. `decentralization` missing from final score formula

[`calculateFinalTeamScore.ts`](file:///d:/Websites/enigma-26/app/utils/TeamScore/calculateFinalTeamScore.ts#L10):

```typescript
const final_Score = (0.30 * adoption)+(0.30 * security)+(0.20 * treasury)+(0.20 * stability)
```

The function accepts `decentralization` as a parameter but **doesn't use it** in the formula. Weights add to 1.0 without it — is this intentional? If not, the formula needs adjusting.

### 7. Typo: `calulateFinalTeamScore`

Still spelled `calulate` instead of `calculate` in [`calculateFinalTeamScore.ts`](file:///d:/Websites/enigma-26/app/utils/TeamScore/calculateFinalTeamScore.ts#L2) and the import in [`updateTeamScore.ts`](file:///d:/Websites/enigma-26/app/utils/TeamScore/updateTeamScore.ts#L2). Not a bug (the names match), but worth fixing for readability.

### 8. `console.log` remaining

[`applyEventChanges.ts`](file:///d:/Websites/enigma-26/app/utils/GlobalEvents/applyEventChanges.ts#L18) still has `console.log(data)`. Minor, but clean up before production.

### 9. Empty component: `postAttack.tsx`

[`postAttack.tsx`](file:///d:/Websites/enigma-26/app/components/postAttack.tsx) — still an empty function returning nothing. Dead code.

### 10. Unused `AttackCategory` import

[`getAttackDetails.ts`](file:///d:/Websites/enigma-26/app/utils/attack/ValuesGetter/getAttackDetails.ts#L2) still imports `AttackCategory` but doesn't use it.

---

## 📊 Overall Status

| Category | Last Review | Now |
|----------|-------------|-----|
| 🔴 Critical | 3 | **1** |
| 🟠 Significant | 5 | **4** |
| 🟡 Minor | 8 | **5** |
| **Total** | **16** | **10** |

> [!TIP]
> The biggest remaining item is creating the root `middleware.ts` file — that's a quick one-liner fix. After that, the most impactful change would be cleaning up the `"use server"` directives so only the intended entry-point functions are exposed as Server Actions.
