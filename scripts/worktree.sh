#!/usr/bin/env bash
# Worktree helper for parallel agents. See "Branches and worktrees" in AGENTS.md.
#
#   scripts/worktree.sh new <branch> [base]  new worktree in ../web-worktrees/<branch>, env linked, deps installed
#   scripts/worktree.sh setup                link env files and install deps in the current worktree
#   scripts/worktree.sh done [branch]        remove a merged branch's worktree and delete the branch
#   scripts/worktree.sh sweep                list merged branches and stale worktrees (changes nothing)
set -euo pipefail

ENV_FILES=(.env .env.local .env.production)

main_root() { dirname "$(git rev-parse --path-format=absolute --git-common-dir)"; }
wt_root() { echo "$(dirname "$(main_root)")/web-worktrees"; }
wt_path_for() { git worktree list --porcelain | awk -v b="refs/heads/$1" '/^worktree /{p=substr($0,10)} $0=="branch "b{print p}'; }

# A branch is merged when its PR is merged, or when it has commits and each one already has an equal patch
# on origin/main. A branch with no commits of its own is new work, not merged work.
is_merged() {
  local b=$1
  [ "$(gh pr list --head "$b" --state merged --json number --jq length 2>/dev/null || echo 0)" != 0 ] && return 0
  [ "$(git rev-list --count "origin/main..$b")" != 0 ] && [ -z "$(git cherry origin/main "$b" | grep '^+')" ]
}

# A worktree is busy when it has uncommitted changes or a running process sits in it.
is_busy() {
  local p=$1
  [ -n "$(git -C "$p" status --porcelain)" ] && { echo "uncommitted changes"; return 0; }
  grep -qx "n$p" <<<"$(lsof -d cwd -Fn 2>/dev/null)" && { echo "a process is running in it"; return 0; }
  return 1
}

cmd_setup() {
  local root here
  root=$(main_root); here=$(git rev-parse --show-toplevel)
  if [ "$root" = "$here" ]; then echo "This is the main checkout; nothing to link."; return; fi
  for f in "${ENV_FILES[@]}"; do
    if [ -e "$root/$f" ] && [ ! -e "$here/$f" ]; then ln -s "$root/$f" "$here/$f"; echo "linked $f"; fi
  done
  (cd "$here" && pnpm install --frozen-lockfile --prefer-offline --config.strict-dep-builds=false)
}

cmd_new() {
  local b=${1:?usage: new <branch> [base]} base=${2:-origin/main} p
  git fetch -q origin
  p="$(wt_root)/${b//\//-}"
  if git show-ref -q --verify "refs/heads/$b"; then git worktree add "$p" "$b"
  else git worktree add -b "$b" "$p" "$base"; git -C "$p" branch --unset-upstream 2>/dev/null || true; fi
  (cd "$p" && cmd_setup)
  echo; echo "Ready: cd $p"
}

cmd_done() {
  local b=${1:-$(git branch --show-current)} p reason
  [ "$b" = main ] && { echo "Refusing to delete main."; exit 1; }
  git fetch -q --prune origin
  if ! is_merged "$b"; then
    [ "${2:-}" = --force-archive ] || { echo "$b is not merged. To drop it and keep its commits as tag archive/$b, add --force-archive."; exit 1; }
    git tag -f "archive/$b" "$b"; echo "Saved $b as tag archive/$b"
  fi
  p=$(wt_path_for "$b")
  if [ -n "$p" ]; then
    [ "$p" = "$(main_root)" ] && { echo "$b is checked out in the main checkout; switch it to main first."; exit 1; }
    if reason=$(is_busy "$p"); then echo "Keeping $p: $reason."; exit 1; fi
    [ "$PWD" = "$p" ] || [[ "$PWD" == "$p"/* ]] && cd "$(main_root)"
    git worktree remove "$p"
  fi
  git branch -D "$b"
  echo "Done: $b"
}

cmd_sweep() {
  git fetch -q --prune origin
  echo "Merged local branches (safe for: scripts/worktree.sh done <branch>):"
  git for-each-ref refs/heads --format='%(refname:short)' | while read -r b; do
    [ "$b" = main ] && continue
    if is_merged "$b"; then p=$(wt_path_for "$b"); echo "  $b${p:+  [$p]}"; fi
  done
  echo; echo "Worktrees (last commit, branch, state):"
  git worktree list --porcelain | awk '/^worktree /{print substr($0,10)}' | while read -r p; do
    [ -d "$p" ] || continue
    state=$(is_busy "$p") || state="idle"
    printf '  %s  %s  %s  (%s)\n' "$(git -C "$p" log -1 --format=%cs)" "$(git -C "$p" branch --show-current || echo detached)" "$p" "$state"
  done | sort
  git worktree prune
}

case "${1:-}" in
  new) shift; cmd_new "$@" ;;
  setup) cmd_setup ;;
  done) shift; cmd_done "$@" ;;
  sweep) cmd_sweep ;;
  *) sed -n '2,6p' "$0"; exit 1 ;;
esac
