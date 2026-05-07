param(
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath
$currentPath = Join-Path $root "_codex_rtl_current.txt"
if (Test-Path -LiteralPath $currentPath) {
  $localRootName = (Get-Content -LiteralPath $currentPath -TotalCount 1).Trim()
} else {
  $localRootName = "_codex_rtl_app"
}

if ([System.IO.Path]::IsPathRooted($localRootName)) {
  $localRoot = $localRootName
} else {
  $localRoot = Join-Path $root $localRootName
}

$localApp = Join-Path $localRoot "app"
$localExe = Join-Path $localApp "Codex.exe"
$localAsar = Join-Path $localApp "resources\app.asar"
$logPath = Join-Path $root "_handoff\launch-codex-rtl-error.log"

try {
  if (Test-Path $logPath) {
    Remove-Item -LiteralPath $logPath -Force
  }

  if (!(Test-Path $localExe)) {
    throw "Codex RTL executable was not found: $localExe"
  }

  if (!(Test-Path $localAsar)) {
    throw "Codex RTL app.asar was not found: $localAsar"
  }

  if ($SelfTest) {
    "OK"
    exit 0
  }

  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -ieq "Codex.exe" -and
      $_.ExecutablePath -and
      $_.ExecutablePath -match "\\app\\Codex\.exe$"
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Milliseconds 900
  Start-Process -FilePath $localExe -ArgumentList "--lang=ar" -WorkingDirectory $localApp
} catch {
  New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
  $_ | Out-String | Set-Content -LiteralPath $logPath -Encoding UTF8
  throw
}
