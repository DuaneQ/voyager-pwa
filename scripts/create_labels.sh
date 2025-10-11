#!/usr/bin/env bash
set -euo pipefail

# Create labels referenced in the issues export file.
# Usage:
#   GITHUB_REPO=owner/repo ./scripts/create_labels.sh
# Supports DRY_RUN=1 to only print gh commands.

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
echo "Reading labels from: $ISSUES_FILE"

# Extract unique labels in a portable way
labels=()
while IFS= read -r line; do
  if [ -z "$(echo "$line" | sed -e 's/^[[:space:]]*//;s/[[:space:]]*$//')" ]; then
    continue
  fi
  labels+=("$line")
done < <(jq -r '.[] | .labels[]? // empty' "$ISSUES_FILE" | sed '/^\s*$/d' | sort -u)

if [ "${#labels[@]}" -eq 0 ]; then
  echo "No labels found in $ISSUES_FILE"
  exit 0
fi

echo "Found labels:"
for l in "${labels[@]}"; do
  echo " - $l"
done

echo
echo "Fetching existing labels from GitHub..."
existing_json=$(gh api "/repos/$REPO/labels" 2>/dev/null || echo '[]')

created=0
skipped=0

# helper to pick a color
pick_color() {
  label="$1"
  case "$label" in
    milestone:*) echo "c2e0ff" ;; # pale blue
    type:task) echo "0e8a16" ;;   # green
    type:story) echo "1d76db" ;;  # blue
    type:epic) echo "5319e7" ;;   # purple
    S2_*|S3_*|S4_*|S5_*) echo "bfdadc" ;;
    *) echo "ededed" ;;
  esac
}

for l in "${labels[@]}"; do
  if [ -z "$l" ]; then continue; fi
  if echo "$existing_json" | jq -e --arg name "$l" '.[] | select(.name == $name)' >/dev/null 2>&1; then
    echo "Label exists, skipping: $l"
    skipped=$((skipped+1))
    continue
  fi

  color=$(pick_color "$l")
  echo "Creating label: $l (color #$color)"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "  DRY_RUN: gh api -X POST /repos/$REPO/labels -f name=\"$l\" -f color=\"$color\""
    created=$((created+1))
  else
    if gh api -X POST "/repos/$REPO/labels" -f name="$l" -f color="$color" >/dev/null 2>&1; then
      echo "  Created: $l"
      created=$((created+1))
    else
      echo "  Failed to create label: $l" >&2
    fi
  fi
done

echo
echo "Done. Created: $created, Skipped: $skipped"

exit 0
