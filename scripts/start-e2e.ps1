$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:NEXT_TEST_WASM_DIR = (Resolve-Path ".\node_modules\@next\swc-wasm-nodejs").Path
$env:NEXT_PUBLIC_DISABLE_SUPABASE = "true"
$env:NEXT_DIST_DIR = ".next-e2e"
$env:PORT = "3002"

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run start
