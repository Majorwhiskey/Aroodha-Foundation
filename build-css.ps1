# Rebuilds assets/site.css from src/input.css + the classes used in the *.html pages.
# Run after editing any page:   .\build-css.ps1          (add -Watch to rebuild on save)
# Needs no Node: downloads Tailwind's standalone CLI into .tools/ on first run.
param([switch]$Watch)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$version = 'v3.4.17'
$cli = Join-Path $PSScriptRoot '.tools\tailwindcss.exe'
if (-not (Test-Path $cli)) {
    New-Item -ItemType Directory -Force (Split-Path $cli) | Out-Null
    $url = "https://github.com/tailwindlabs/tailwindcss/releases/download/$version/tailwindcss-windows-x64.exe"
    Write-Host "Downloading Tailwind CSS $version standalone CLI..."
    Invoke-WebRequest -Uri $url -OutFile $cli
}

$cliArgs = @('-c', 'tailwind.config.js', '-i', 'src/input.css', '-o', 'assets/site.css', '--minify')
if ($Watch) { $cliArgs += '--watch' }

# The CLI logs progress to stderr, which Windows PowerShell treats as an error under 'Stop'.
$env:BROWSERSLIST_IGNORE_OLD_DATA = '1'
$ErrorActionPreference = 'Continue'
& $cli @cliArgs 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -and $_ -ne 'System.Management.Automation.RemoteException' }
if ($LASTEXITCODE -ne 0) { throw "Tailwind build failed (exit $LASTEXITCODE)" }
