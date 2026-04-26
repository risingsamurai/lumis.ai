# LUMIS.AI ML backend — Windows-friendly launcher
# Uses `py -m` so `pip` / `uvicorn` do not need to be on PATH.
#
# Usage (from ml-backend folder):
#   powershell -ExecutionPolicy Bypass -File .\run.ps1
# Optional: set port (default 8081)
#   powershell -File .\run.ps1 -Port 8082

param(
    [int]$Port = 8081
)

Set-Location $PSScriptRoot
Write-Host "Installing dependencies (if needed)..."
py -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Starting API on http://127.0.0.1:$Port ..."
py -m uvicorn main:app --host 127.0.0.1 --port $Port
