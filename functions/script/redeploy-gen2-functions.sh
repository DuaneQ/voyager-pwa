#!/usr/bin/env bash
# scripts/redeploy-gen2-functions.sh
# Redeploy selected GEN_2 Cloud Functions and inject DATABASE_URL from Secret Manager.
#
# Usage:
#   # Dry-run (prints commands)
#   bash scripts/redeploy-gen2-functions.sh
#
#   # Actually run the deployments (non-interactive)
#   bash scripts/redeploy-gen2-functions.sh --apply
#
#   # Override project/region/secret via env vars:
#   PROJECT=mundo1-1 SECRET_RESOURCE=projects/mundo1-1/secrets/voyager-itinerary-db:latest \
#     bash scripts/redeploy-gen2-functions.sh --apply
#
set -euo pipefail

# Configurable defaults (override with env vars if desired)
PROJECT="${PROJECT:-mundo1-1}"
REGION="${REGION:-us-central1}"
RUNTIME="${RUNTIME:-nodejs20}"
SOURCE_DIR="${SOURCE_DIR:-functions}"
SECRET_RESOURCE="${SECRET_RESOURCE:-projects/${PROJECT}/secrets/voyager-itinerary-db:latest}"
# Functions to redeploy (update this list as needed). These are the DB-using GEN_2 functions.
FNS="${FNS:-createItinerary updateItinerary listItinerariesForUser searchItineraries deleteItinerary generateItinerary generateItineraryWithAI}"

APPLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true; shift ;;
    --project) PROJECT="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --secret) SECRET_RESOURCE="$2"; shift 2 ;;
    --help|-h) echo "Usage: $0 [--apply] [--project PROJECT] [--region REGION] [--secret SECRET_RESOURCE]"; exit 0 ;;
    *) echo "Unknown arg: $1"; echo "Usage: $0 [--apply] [--project PROJECT] [--region REGION] [--secret SECRET_RESOURCE]"; exit 1 ;;
  esac
done

echo "Project: $PROJECT"
echo "Region: $REGION"
echo "Runtime: $RUNTIME"
echo "Secret resource mapped to DATABASE_URL: $SECRET_RESOURCE"
echo "Source dir: $SOURCE_DIR"
echo
if [ "$APPLY" = false ]; then
  echo "DRY-RUN mode. Will print commands only. Add --apply to execute."
fi
echo

# Pre-checks
if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI is required but not found in PATH." >&2
  exit 2
fi

# Verify secret exists
if ! gcloud secrets describe "$(echo "$SECRET_RESOURCE" | awk -F'[:/]' '{print $NF}' )" --project="$PROJECT" >/dev/null 2>&1; then
  echo "Warning: Secret referenced by SECRET_RESOURCE not found in project $PROJECT."
  echo "Secret resource value: $SECRET_RESOURCE"
  echo "If the secret name is correct, make sure you have permission to read secrets or create the secret first."
  echo
fi

# Confirm gcloud project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -n "$CURRENT_PROJECT" ]; then
  echo "gcloud current project: $CURRENT_PROJECT"
  if [ "$CURRENT_PROJECT" != "$PROJECT" ]; then
    echo "Note: gcloud project differs from script PROJECT. You may want to run:"
    echo "  gcloud config set project $PROJECT"
    echo
  fi
fi

# Function to check if function is GEN_2
is_gen2() {
  local fn="$1"
  # use gcloud functions describe and extract 'environment' field if present
  env_field=$(gcloud functions describe "$fn" --project="$PROJECT" --region="$REGION" --format='value(environment)' 2>/dev/null || true)
  if [ "$env_field" = "GEN_2" ]; then
    return 0
  fi
  # Some older gcloud versions might return nothing for Gen1; in that case we consider it not GEN_2
  return 1
}

# Build list to actually deploy (skip non-GEN_2)
TO_DEPLOY=()
SKIPPED=()
for fn in $FNS; do
  echo "Checking function: $fn"
  if is_gen2 "$fn"; then
    echo "  -> Detected GEN_2 (will deploy)"
    TO_DEPLOY+=("$fn")
  else
    echo "  -> Not GEN_2 or not found (skipping to avoid unsupported upgrade)."
    SKIPPED+=("$fn")
  fi
done

echo
echo "Will deploy ${#TO_DEPLOY[@]} functions: ${TO_DEPLOY[*]:-<none>}"
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "Skipped ${#SKIPPED[@]} functions (non-GEN_2): ${SKIPPED[*]}"
fi
echo

if [ "${#TO_DEPLOY[@]}" -eq 0 ]; then
  echo "No GEN_2 functions to deploy. Exiting."
  exit 0
fi

# Deploy loop
for fn in "${TO_DEPLOY[@]}"; do
  echo "----"
  echo "Preparing deploy for: $fn"
  # Compose the gcloud deploy command
  CMD=(gcloud functions deploy "$fn"
    --gen2
    --region="$REGION"
    --runtime="$RUNTIME"
    --entry-point="$fn"
    --source="$SOURCE_DIR"
    --set-secrets="DATABASE_URL=${SECRET_RESOURCE}"
    --project="$PROJECT"
    --quiet
  )

  # Print the command for visibility
  printf 'Command: %s\n' "${CMD[*]}"

  if [ "$APPLY" = true ]; then
    echo "Running deploy..."
    if "${CMD[@]}"; then
      echo "Deploy succeeded for $fn"
    else
      echo "Deploy failed for $fn (continuing to next). See above for error."
    fi
    # Give a short pause to allow logs / revisions to settle
    sleep 2
  else
    echo "(dry-run) not executing. Re-run with --apply to perform the deploy."
  fi
done

echo "----"
echo "Done. Redeploy attempted for ${#TO_DEPLOY[@]} functions (APPLY=$APPLY)."
if [ "$APPLY" = false ]; then
  echo "To execute these commands, re-run with --apply (and make sure your gcloud is authenticated and project is set)."
fi