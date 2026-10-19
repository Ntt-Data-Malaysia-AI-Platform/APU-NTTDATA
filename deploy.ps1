<#
.SYNOPSIS
  Deploys the APU GenAI assistant to Cloud Run, calling Claude on Vertex AI.

.EXAMPLE
  ./deploy.ps1 -ProjectId my-gcp-project
  ./deploy.ps1 -ProjectId my-gcp-project -Region asia-southeast1 -Public

.NOTES
  Before the first deploy, enable the Claude model in Vertex AI Model Garden
  for this project (console: Vertex AI > Model Garden > Claude > Enable).
#>
param(
  [Parameter(Mandatory = $true)] [string] $ProjectId,
  [string] $Region = "asia-southeast1",          # Cloud Run region (Singapore, closest to KL)
  [string] $ServiceName = "apu-genai-assistant",
  [string] $Model = "claude-opus-5-5",
  [string] $ModelRegion = "global",              # Vertex AI endpoint for Claude
  [string] $AppUsername = "",                    # sign-in screen; defaults to the built-in demo login
  [string] $AppPassword = "",
  [switch] $Public                               # skip Cloud Run IAM; the app's own sign-in still applies
)

$ErrorActionPreference = "Stop"
function Invoke-Gcloud { & gcloud @args; if ($LASTEXITCODE -ne 0) { throw "gcloud $($args -join ' ') failed" } }

$ServiceAccount = "apu-genai-run@$ProjectId.iam.gserviceaccount.com"

Write-Host "==> Using project $ProjectId"
Invoke-Gcloud config set project $ProjectId

Write-Host "==> Enabling APIs (Cloud Run, Cloud Build, Artifact Registry, Vertex AI)"
Invoke-Gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com

Write-Host "==> Ensuring service account $ServiceAccount"
# Windows PowerShell turns redirected native stderr into errors, so relax the preference for this probe.
$ErrorActionPreference = "Continue"
& gcloud iam service-accounts describe $ServiceAccount 2>$null | Out-Null
$exists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"
if (-not $exists) {
  Invoke-Gcloud iam service-accounts create apu-genai-run --display-name "APU GenAI assistant (Cloud Run)"
}
Invoke-Gcloud projects add-iam-policy-binding $ProjectId `
  --member "serviceAccount:$ServiceAccount" --role "roles/aiplatform.user" --condition None --quiet --format none

$auth = if ($Public) { "--allow-unauthenticated" } else { "--no-allow-unauthenticated" }

# One signing key shared by all instances, so a sign-in works whichever instance serves you.
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$sessionSecret = -join ($bytes | ForEach-Object { $_.ToString("x2") })

$envVars = "ANTHROPIC_VERTEX_PROJECT_ID=$ProjectId,CLOUD_ML_REGION=$ModelRegion,CLAUDE_MODEL=$Model,DEMO_MODE=false,SESSION_SECRET=$sessionSecret"
if ($AppUsername) { $envVars += ",APP_USERNAME=$AppUsername" }
if ($AppPassword) { $envVars += ",APP_PASSWORD=$AppPassword" }

Write-Host "==> Building and deploying $ServiceName to $Region"
Invoke-Gcloud run deploy $ServiceName `
  --source . `
  --region $Region `
  --service-account $ServiceAccount `
  --set-env-vars $envVars `
  --timeout 600 `
  --memory 512Mi `
  --cpu 1 `
  --concurrency 40 `
  --min-instances 0 `
  --max-instances 5 `
  $auth `
  --quiet

$url = & gcloud run services describe $ServiceName --region $Region --format "value(status.url)"
Write-Host ""
Write-Host "Deployed: $url"
if (-not $Public) {
  Write-Host "The service requires authentication. To open it locally, run:"
  Write-Host "  gcloud run services proxy $ServiceName --region $Region --port 8080"
  Write-Host "then browse to http://localhost:8080"
}
