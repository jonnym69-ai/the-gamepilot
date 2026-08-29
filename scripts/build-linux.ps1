#!/usr/bin/env pwsh
# Build GamePilot Linux AppImage from Windows using WSL2
# Run: .\scripts\build-linux.ps1

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$wslProjectPath = "/mnt/c" + ($projectRoot -replace '^C:', '').Replace('\', '/').TrimStart('/')

Write-Host "Project root: $projectRoot"
Write-Host "WSL path: $wslProjectPath"

# Verify WSL is available
$wsl = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wsl) {
    Write-Error "WSL2 is not available. Install it or use a Linux VM to build the AppImage."
}

# Check if the project exists in WSL
$pathCheck = wsl test -d `"$wslProjectPath`" ; echo $?
if ($pathCheck -ne 0) {
    Write-Error "WSL cannot access the project at $wslProjectPath. Make sure WSL2 mounts C:/"
}

# Build inside WSL
Write-Host "Building GamePilot for Linux inside WSL..."
wsl cd $wslProjectPath `&`& npm install
wsl cd $wslProjectPath `&`& npm run build-electron-linux

$appImage = "$projectRoot\dist\GamePilot-1.9.0-x86_64.AppImage"
$destPath = "$projectRoot\GamePilot-1.9.0-x86_64.AppImage"

if (Test-Path $appImage) {
    Write-Host "Linux AppImage built: $appImage"
    Copy-Item $appImage $destPath -Force
    Write-Host "Copied to: $destPath"
} else {
    Write-Warning "AppImage not found at $appImage. Check dist/ for the output."
}
