# Brain sync (Pipe A): web merges to the company brain

After every merge to `main`, the [Brain sync workflow](../.github/workflows/brain-sync.yml)
records the merged pull request in the private repo
[passionseed/company-brain](https://github.com/passionseed/company-brain), which is
published publicly at [brain.passionseed.org](https://brain.passionseed.org).
There is no human review: the bot commits straight to company-brain `main` as
`web-sync`, as allowed by rule 8 of company-brain's `AGENTS.md`.

App database events (SHIFT rounds, registrations, counts) are a separate pipe
(Pipe B) and are not covered here.

## What a run does

1. Runs on a push to `main` (or by hand, see below). Runs never overlap: they queue in the `brain-sync` concurrency group.
2. Skips with a notice if either secret below is missing, or if the pushed commit has no merged pull request.
3. Checks out this repo and company-brain (into `brain/`), then writes `brain-sync-context/context.md` with the PR title, description, URL, merge date, changed files and a diff capped at 60 KB. Lockfiles, images, fonts, CSV files and generated types are left out of the diff.
4. Runs Claude Code (`anthropics/claude-code-action/base-action`, pinned to a release commit) with the instructions in [`scripts/brain-sync/prompt.md`](../scripts/brain-sync/prompt.md). Claude may only read files and edit files under `brain/`. It has no shell, no web access and cannot push. It cannot read `brain/.git/` or `brain/budgets/`.
5. Claude always adds one line to `product-log.md`. It updates other pages (`shift.md`, `offer.md`, `marketing.md`, `numbers.md`, `decisions/log.md` and so on) only when the PR clearly changes a company fact, and writes `(fill in)` for anything the PR does not say.
6. Fails the job without committing if Claude changed anything other than Markdown pages, or touched `budgets/`, `scripts/` or `.github/`.
7. Runs [`scripts/brain-sync/check-pii.mjs`](../scripts/brain-sync/check-pii.mjs) on the added lines. Emails (except `@passionseed.org`), Thai and international phone numbers, 13-digit ID numbers, card numbers and API keys or tokens fail the job, and nothing is committed.
8. Commits as `web-sync` with the message `[web-sync] <PR title> (<PR url>)` and pushes to company-brain `main`. If the push is rejected because `main` moved, it rebases once and retries.

## Secrets

Both live in this repo under Settings, Secrets and variables, Actions.

| Secret | What it is |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude subscription token for Claude Code. Create it with `claude setup-token`. |
| `BRAIN_GITHUB_TOKEN` | Fine-grained personal access token. Resource owner: `passionseed`. Repository access: only `passionseed/company-brain`. Permissions: Contents read and write (Metadata read is added automatically). Nothing else. |

Until both exist, every run skips cleanly.

## Re-run for a pull request

Actions tab, Brain sync, Run workflow, enter the merged PR number. Or:

```bash
gh workflow run brain-sync.yml -f pr_number=211
```

A re-run does not add a second product-log line for a PR that is already logged.
Leaving `pr_number` empty syncs the PR of the commit at the head of `main`.

## Backfill the product log

Run once by hand to log every PR merged before the pipe existed. It writes
one line per PR from the PR title (no AI), grouped by month, and skips PRs that
are already logged. It does not commit or push.

```bash
node scripts/brain-sync/backfill.mjs ../company-brain --dry-run
```

```bash
node scripts/brain-sync/backfill.mjs ../company-brain
```

```bash
node scripts/brain-sync/check-pii.mjs ../company-brain
```

Then review the diff in company-brain, commit it on a branch and open a pull
request there.

## Revert a bad bot commit

Every bot commit message starts with `[web-sync]` and names its source PR.

```bash
git -C ../company-brain log --oneline --grep '^\[web-sync\]'
```

```bash
git -C ../company-brain revert <commit-sha>
```

Push the revert through a company-brain pull request as usual. To stop the
pipe entirely, disable the Brain sync workflow in the Actions tab or delete
the `BRAIN_GITHUB_TOKEN` secret.

## Changing the pipe

- Instructions for Claude: [`scripts/brain-sync/prompt.md`](../scripts/brain-sync/prompt.md).
- Personal data patterns: [`scripts/brain-sync/check-pii.mjs`](../scripts/brain-sync/check-pii.mjs). Add a case to its self-test and run `node scripts/brain-sync/check-pii.mjs --self-test`.
- This repo is public, so the workflow must never run on `pull_request_target` or fork events, and PR text must never be put inside `${{ }}` in a `run:` script.
