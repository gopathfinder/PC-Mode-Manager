$ErrorActionPreference = 'Stop'

Write-Host 'PC Mode Manager — Windows installer build' -ForegroundColor Red

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing. Install the current Node.js LTS release first.'
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'Rust/Cargo is missing. Install Rust stable using rustup.rs first.'
}

npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }

Push-Location (Join-Path $PSScriptRoot 'src-tauri')
cargo test
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Rust tests failed.' }
Pop-Location

npm run build:windows
if ($LASTEXITCODE -ne 0) { throw 'Tauri Windows packaging failed. Review the build output above.' }

$bundle = Join-Path $PSScriptRoot 'src-tauri\target\release\bundle'
Write-Host "`nBuild completed. Installer files:" -ForegroundColor Green
Get-ChildItem $bundle -Recurse -File | Where-Object { $_.Extension -in '.exe', '.msi' } | Select-Object -ExpandProperty FullName
