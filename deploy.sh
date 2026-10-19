#!/usr/bin/env bash
# Deploys the APU GenAI assistant to Cloud Run, calling Claude on Vertex AI.
#
# Usage: ./deploy.sh PROJECT_ID [--public]
# Env overrides: REGION, SERVICE_NAME, CLAUDE_MODEL, MODEL_REGION,
#                APP_USERNAME, APP_PASSWORD (sign-in screen; default is the built-in demo login)
#
# Before the first deploy, enable the Claude model in Vertex AI Model Garden
# for this project (console: Vertex AI > Model Garden > Claude > Enable).
set -euo pipefail

PROJECT_ID="${1:?Usage: ./deploy.sh PROJECT_ID [--public]}"
REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-apu-genai-assistant}"
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-opus-5-5}"
MODEL_REGION="${MODEL_REGION:-global}"
AUTH_FLAG="--no-allow-unauthenticated"
[[ "${2:-}" == "--public" ]] && AUTH_FLAG="--allow-unauthenticated"
SA="apu-genai-run@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Using project ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

echo "==> Enabling APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com

echo "==> Ensuring service account ${SA}"
gcloud iam service-accounts describe "${SA}" >/dev/null 2>&1 ||
  gcloud iam service-accounts create apu-genai-run --display-name "APU GenAI assistant (Cloud Run)"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${SA}" --role roles/aiplatform.user --condition None --quiet >/dev/null

# One signing key shared by all instances, so a sign-in works whichever instance serves you.
SESSION_SECRET="$(openssl rand -hex 32)"
ENV_VARS="ANTHROPIC_VERTEX_PROJECT_ID=${PROJECT_ID},CLOUD_ML_REGION=${MODEL_REGION},CLAUDE_MODEL=${CLAUDE_MODEL},DEMO_MODE=false,SESSION_SECRET=${SESSION_SECRET}"
[[ -n "${APP_USERNAME:-}" ]] && ENV_VARS+=",APP_USERNAME=${APP_USERNAME}"
[[ -n "${APP_PASSWORD:-}" ]] && ENV_VARS+=",APP_PASSWORD=${APP_PASSWORD}"

echo "==> Building and deploying ${SERVICE_NAME} to ${REGION}"
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --service-account "${SA}" \
  --set-env-vars "${ENV_VARS}" \
  --timeout 600 --memory 512Mi --cpu 1 --concurrency 40 \
  --min-instances 0 --max-instances 5 \
  "${AUTH_FLAG}" --quiet

URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')"
echo
echo "Deployed: ${URL}"
if [[ "${AUTH_FLAG}" == "--no-allow-unauthenticated" ]]; then
  echo "The service requires authentication. Open it with:"
  echo "  gcloud run services proxy ${SERVICE_NAME} --region ${REGION} --port 8080"
fi
