#!/usr/bin/env bash
# Promote staging → production for AIRLUXO.
#
# Fast-forwards `main` to whatever `staging` points at and pushes it, which
# triggers Vercel's production deploy. Refuses to run unless the move is a clean
# fast-forward (staging = main + new commits), so production never receives
# anything that wasn't first deployed to https://staging.airluxo.ch.
#
# Usage:  ./scripts/promote.sh [--tag vX.Y.Z]
set -euo pipefail

TAG=""
if [ "${1:-}" = "--tag" ]; then
  TAG="${2:?--tag needs a version, e.g. --tag v0.2.0}"
fi

# Must be inside the repo, working tree clean.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "✗ not a git repo"; exit 1; }
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ working tree is dirty — commit or stash first."; exit 1
fi

echo "→ fetching origin…"
git fetch --quiet origin

STAGING="$(git rev-parse origin/staging)"
MAIN="$(git rev-parse origin/main)"

if [ "$STAGING" = "$MAIN" ]; then
  echo "✓ main already matches staging ($STAGING) — nothing to promote."; exit 0
fi

# staging must be a descendant of main → clean fast-forward.
if ! git merge-base --is-ancestor "$MAIN" "$STAGING"; then
  echo "✗ origin/main is NOT an ancestor of origin/staging."
  echo "  main has commits staging doesn't — refusing non-fast-forward promote."
  echo "  Reconcile by merging main into staging first, then re-run."
  exit 1
fi

echo "→ commits being promoted (main..staging):"
git --no-pager log --oneline "$MAIN".."$STAGING"
echo

# Fast-forward main to staging without needing a local checkout switch.
echo "→ pushing origin/staging → origin/main (fast-forward)…"
git push origin "${STAGING}:refs/heads/main"

# Keep the local main ref in sync if it exists.
if git show-ref --verify --quiet refs/heads/main; then
  git update-ref refs/heads/main "$STAGING"
fi

if [ -n "$TAG" ]; then
  echo "→ tagging $TAG…"
  git tag -a "$TAG" "$STAGING" -m "Release $TAG"
  git push origin "$TAG"
fi

echo "✓ Promoted. Vercel is now deploying production (airluxo.ch)."
