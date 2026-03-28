# Onboarding Account Phase — Skip & Link Design

**Date:** 2026-03-25

## Problem

Two cases in onboarding are broken or suboptimal:

1. Users who are already logged in with a real account (non-anonymous) are shown the account phase unnecessarily — they already have an account.
2. Anonymous users who enter an email that belongs to an existing account get a dead-end error ("Account already exists. Sign in instead.") instead of being able to link their onboarding data to that account.

## Solution

### Case 1 — Skip account phase for non-anonymous users

In `onboard-client.tsx`, when `advance` is called with `nextStep === "account"` and `isAnonymous === false`, redirect to `/me` instead of rendering the account phase. The onboarding state is still saved before redirecting.

### Case 2 — Link onboarding data to existing account

In `/api/onboarding/complete`, when an anonymous user submits email + password and the email already exists (currently a 409), instead of returning an error:

1. Call `supabase.auth.signInWithPassword({ email, password })`
2. If sign-in fails → return `401` with `{ error: "Wrong password" }`
3. If sign-in succeeds → run profile upsert + career goals insert against the existing user's ID, return `{ ok: true }`

The anonymous session is replaced by the real account's session after successful sign-in.

### Client error handling

In `account.tsx`, update the error handling to show "Wrong password" on a `401` response. The 409 branch no longer needs a user-facing message since it no longer surfaces.

## Files Changed

| File | Change |
|------|--------|
| `app/onboard/onboard-client.tsx` | Skip to `/me` when advancing to `account` and not anonymous |
| `app/api/onboarding/complete/route.ts` | Replace 409 early-return with sign-in fallback |
| `app/onboard/phases/account.tsx` | Show "Wrong password" on 401 |

## Data Flow

```
Anonymous user, existing email:
  submit(email, password)
    → email exists? → signInWithPassword()
      → wrong password → 401 → show "Wrong password"
      → correct → upsert profile to existing user → redirect /me

Non-anonymous user:
  ResultsPhase calls advance("account", ...)
    → isAnonymous === false → redirect("/me") immediately
```
