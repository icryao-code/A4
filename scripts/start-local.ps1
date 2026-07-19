$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$wasmPath = Join-Path $projectRoot "node_modules\@next\swc-wasm-nodejs"
if (-not (Test-Path $wasmPath)) {
  Write-Error "Dependencies are missing. Run npm install first."
}

$env:NEXT_TEST_WASM_DIR = $wasmPath
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run start
