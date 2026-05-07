param(
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath

if ([string]::IsNullOrWhiteSpace($env:SystemDrive)) {
  $env:SystemDrive = "C:"
}

if ([string]::IsNullOrWhiteSpace($env:ProgramData)) {
  $env:ProgramData = Join-Path $env:SystemDrive "ProgramData"
}

function Find-CodexSourceApp {
  if ($env:CODEX_RTL_SOURCE_APP) {
    $explicit = Resolve-Path -LiteralPath $env:CODEX_RTL_SOURCE_APP -ErrorAction Stop
    $explicitApp = $explicit.Path
    if ((Test-Path -LiteralPath (Join-Path $explicitApp "Codex.exe")) -and
        (Test-Path -LiteralPath (Join-Path $explicitApp "resources\app.asar"))) {
      return $explicitApp
    }
    throw "CODEX_RTL_SOURCE_APP does not point to a Codex app folder: $explicitApp"
  }

  $appxPackages = @(Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue |
    Sort-Object Version -Descending)

  foreach ($package in $appxPackages) {
    $appPath = Join-Path $package.InstallLocation "app"
    if ((Test-Path -LiteralPath (Join-Path $appPath "Codex.exe")) -and
        (Test-Path -LiteralPath (Join-Path $appPath "resources\app.asar"))) {
      return $appPath
    }
  }

  $programFiles = $env:ProgramFiles
  if ([string]::IsNullOrWhiteSpace($programFiles)) {
    $programFiles = $env:ProgramW6432
  }
  if ([string]::IsNullOrWhiteSpace($programFiles)) {
    $programFiles = "C:\Program Files"
  }

  $windowsApps = Join-Path $programFiles "WindowsApps"
  $packages = Get-ChildItem -LiteralPath $windowsApps -Directory -Filter "OpenAI.Codex_*" -ErrorAction Stop |
    Sort-Object Name -Descending

  foreach ($package in $packages) {
    $appPath = Join-Path $package.FullName "app"
    if ((Test-Path -LiteralPath (Join-Path $appPath "Codex.exe")) -and
        (Test-Path -LiteralPath (Join-Path $appPath "resources\app.asar"))) {
      return $appPath
    }
  }

  throw "Codex Desktop was not found under $windowsApps. Install Codex first."
}

function Find-NodeExe {
  param([string]$SourceApp)

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  $bundledNode = Join-Path $SourceApp "resources\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $toolDir = Join-Path $root "_codex_rtl_tools"
    New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
    $localNode = Join-Path $toolDir "node.exe"
    Copy-Item -LiteralPath $bundledNode -Destination $localNode -Force
    return $localNode
  }

  throw "Node.js was not found. Codex bundled node.exe and system node.exe are both unavailable."
}

$sourceApp = Find-CodexSourceApp
$nodeExe = Find-NodeExe -SourceApp $sourceApp
$buildName = "_codex_rtl_app_" + (Get-Date -Format "yyyyMMddHHmmss")
$localRoot = Join-Path $root $buildName
$env:CODEX_RTL_SOURCE_APP = $sourceApp
$env:CODEX_RTL_LOCAL_ROOT = $localRoot

& $nodeExe (Join-Path $root "build-codex-rtl-local.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "Codex RTL build failed."
}

Set-Content -LiteralPath (Join-Path $root "_codex_rtl_current.txt") -Value $buildName -Encoding ASCII

& "$env:SystemRoot\System32\wscript.exe" (Join-Path $root "create-codex-rtl-shortcut.vbs")
if ($LASTEXITCODE -ne 0) {
  throw "Desktop shortcut creation failed."
}

if ($SelfTest) {
  & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "launch-codex-rtl-local.ps1") -SelfTest
  if ($LASTEXITCODE -ne 0) {
    throw "Codex RTL launcher self-test failed."
  }
}

Write-Host "Codex RTL setup completed."
Write-Host "Source app: $sourceApp"
Write-Host "Local app: $(Join-Path $localRoot 'app')"
Write-Host "Shortcut: $([Environment]::GetFolderPath('Desktop'))\Codex RTL.lnk"
