#!/usr/bin/env bash
set -euo pipefail

# Create GitHub milestones referenced by the issues export file.
# Usage:
#   GITHUB_REPO=owner/repo ./scripts/create_milestones.sh
# If GITHUB_REPO is not set, the script will attempt to infer it from git remote origin.

ISSUES_FILE=${ISSUES_FILE:-docs/Native/GITHUB_PROJECTS/issues-export.json}
REPO=${GITHUB_REPO:-}

if [ "${DRY_RUN:-0}" != "1" ]; then
  command -v gh >/dev/null 2>&1 || { echo "gh (GitHub CLI) not found in PATH" >&2; exit 1; }
fi
command -v jq >/dev/null 2>&1 || { echo "jq not found in PATH" >&2; exit 1; }

if [ -z "$REPO" ]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    url=$(git remote get-url origin 2>/dev/null || true)
    if [ -n "$url" ]; then
      # convert git@github.com:owner/repo.git or https://github.com/owner/repo.git -> owner/repo
      REPO=$(echo "$url" | sed -E 's#git@github.com:(.*)\.git#\1#; s#https://github.com/(.*)\.git#\1#; s#git://github.com/(.*)\.git#\1#')
    fi
  fi
fi

if [ -z "$REPO" ]; then
  echo "Missing repository. Set GITHUB_REPO=owner/repo or run inside a git repo with origin set." >&2
  exit 1
fi

if [ ! -f "$ISSUES_FILE" ]; then
  echo "Issues file not found: $ISSUES_FILE" >&2
  exit 1
fi

echo "Using repo: $REPO"
echo "Reading issues from: $ISSUES_FILE"

# Extract unique, non-empty milestone titles from the export in a portable way
milestones=()
while IFS= read -r line; do
  # skip empty lines
  if [ -z "$(echo "$line" | sed -e 's/^[[:space:]]*//;s/[[:space:]]*$//')" ]; then
    continue
  fi
  milestones+=("$line")
done < <(jq -r '.[] | .milestone // empty' "$ISSUES_FILE" | sed '/^\s*$/d' | sort -u)

if [ "${#milestones[@]}" -eq 0 ]; then
  echo "No milestones found in $ISSUES_FILE"
  exit 0
fi

echo "Found milestones to ensure exist:"
for m in "${milestones[@]}"; do
  echo " - $m"
done

echo
echo "Checking existing milestones in GitHub..."
# Fetch all milestones from the repo (all states)
existing_json=$(gh api "/repos/$REPO/milestones?state=all")

created=0
skipped=0

for m in "${milestones[@]}"; do
  if [ -z "$m" ]; then
    continue
  fi
  if echo "$existing_json" | jq -e --arg title "$m" '.[] | select(.title == $title)' >/dev/null 2>&1; then
    echo "Milestone exists, skipping: $m"
    skipped=$((skipped+1))
    continue
  fi

  echo "Creating milestone: $m"
  # Create milestone with minimal payload; it's okay if this fails due to permissions
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "  DRY_RUN: gh api -X POST /repos/$REPO/milestones -f title=\"$m\""
    created=$((created+1))
  else
    if gh api -X POST "/repos/$REPO/milestones" -f title="$m" >/dev/null 2>&1; then
      echo "  Created: $m"
      created=$((created+1))
    else
      echo "  Failed to create milestone: $m" >&2
    fi
  fi
done

echo
echo "Done. Created: $created, Skipped (already existed): $skipped"

exit 0
