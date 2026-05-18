param(
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath
$logPath = Join-Path $root "_handoff\launch-codex-official.log"

function Find-OfficialCodexApp {
  $package = Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue |
    Sort-Object Version -Descending |
    Select-Object -First 1

  if (!$package) {
    throw "OpenAI Codex official AppX package was not found."
  }

  $app = Join-Path $package.InstallLocation "app"
  $exe = Join-Path $app "Codex.exe"
  $asar = Join-Path $app "resources\app.asar"

  if (!(Test-Path -LiteralPath $exe)) {
    throw "Official Codex.exe was not found: $exe"
  }

  if (!(Test-Path -LiteralPath $asar)) {
    throw "Official app.asar was not found: $asar"
  }

  return [pscustomobject]@{
    App = $app
    Exe = $exe
    Version = $package.Version.ToString()
  }
}

try {
  New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
  $official = Find-OfficialCodexApp

  @(
    "Codex Official launch: $(Get-Date -Format o)"
    "Official version: $($official.Version)"
    "Official exe: $($official.Exe)"
  ) | Set-Content -LiteralPath $logPath -Encoding UTF8

  if ($SelfTest) {
    "OK"
    exit 0
  }

  Get-CimInstance Win32_Process |
    Where-Object {
      $_.ExecutablePath -and
      $_.ExecutablePath -match "\\_codex_rtl_app_[^\\]+\\app\\(Codex|resources\\codex)\.exe$"
    } |
    ForEach-Object {
      "Stopping RTL process: $($_.ProcessId) $($_.ExecutablePath)" | Add-Content -LiteralPath $logPath -Encoding UTF8
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Milliseconds 900
  $process = Start-Process -FilePath $official.Exe -WorkingDirectory $official.App -PassThru
  Start-Sleep -Seconds 3

  if ($process.HasExited) {
    "Official Codex exited early with code: $($process.ExitCode)" | Add-Content -LiteralPath $logPath -Encoding UTF8
  } else {
    "Official Codex started: $($process.Id)" | Add-Content -LiteralPath $logPath -Encoding UTF8
  }
} catch {
  $_ | Out-String | Set-Content -LiteralPath $logPath -Encoding UTF8
  throw
}
