#!/usr/bin/env bash
# Create GitHub issues from a JSON export using the `gh` CLI
# Usage: GITHUB_REPO=owner/repo ./scripts/create_github_issues.sh docs/Native/GITHUB_PROJECTS/issues-export.json

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <issues-json-path>"
  exit 2
fi

ISSUES_JSON="$1"
GITHUB_REPO="${GITHUB_REPO:-DuaneQ/voyager-pwa}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI required. Install: https://cli.github.com/"
  exit 3
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required. Install: e.g. brew install jq"
  exit 4
fi

# Optionally create milestones referenced in the export before creating issues.
# Set SKIP_MILESTONES=1 to skip this step.
if [ "${SKIP_MILESTONES:-0}" != "1" ]; then
  if [ -x "./scripts/create_milestones.sh" ]; then
    echo "Ensuring milestones exist (run create_milestones.sh)..."
    # Forward DRY_RUN if set
    if [ "${DRY_RUN:-0}" = "1" ]; then
      DRY_RUN=1 GITHUB_REPO="$GITHUB_REPO" ./scripts/create_milestones.sh || echo "create_milestones.sh returned non-zero; continuing"
    else
      GITHUB_REPO="$GITHUB_REPO" ./scripts/create_milestones.sh || echo "create_milestones.sh returned non-zero; continuing"
    fi
  else
    echo "./scripts/create_milestones.sh not found or not executable; skipping milestone creation"
  fi
fi

# Optionally create labels referenced in export before creating issues.
if [ "${SKIP_LABELS:-0}" != "1" ]; then
  if [ -x "./scripts/create_labels.sh" ]; then
    echo "Ensuring labels exist (run create_labels.sh)..."
    if [ "${DRY_RUN:-0}" = "1" ]; then
      DRY_RUN=1 GITHUB_REPO="$GITHUB_REPO" ./scripts/create_labels.sh || echo "create_labels.sh returned non-zero; continuing"
    else
      GITHUB_REPO="$GITHUB_REPO" ./scripts/create_labels.sh || echo "create_labels.sh returned non-zero; continuing"
    fi
  else
    echo "./scripts/create_labels.sh not found or not executable; skipping label creation"
  fi
fi

CREATED_FILE="${CREATED_ISSUES_FILE:-docs/Native/GITHUB_PROJECTS/created-issues.json}"
echo "Creating issues in repo: $GITHUB_REPO"

# prepare created file
mkdir -p "$(dirname "$CREATED_FILE")"
echo "[]" > "$CREATED_FILE"

jq -c '.[]' "$ISSUES_JSON" | while read -r item; do
  title=$(echo "$item" | jq -r '.title')
  body=$(echo "$item" | jq -r '.body')
  labels=$(echo "$item" | jq -r '.labels // [] | join(",")')
  milestone=$(echo "$item" | jq -r '.milestone // empty')

  cmd=(gh issue create --repo "$GITHUB_REPO" --title "$title" --body "$body")
  if [ -n "$labels" ]; then
    cmd+=(--label "$labels")
  fi
  if [ -n "$milestone" ]; then
    cmd+=(--milestone "$milestone")
  fi

  echo "Running: ${cmd[*]}"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "  DRY_RUN: ${cmd[*]}"
    url="DRY_RUN: ${title}"
  else
    url=$("${cmd[@]}")
    echo "Created: $url"
  fi
  # append to created file
  tmp=$(mktemp)
  jq ". + [\"$url\"]" "$CREATED_FILE" > "$tmp" && mv "$tmp" "$CREATED_FILE"
done

echo "Done."
