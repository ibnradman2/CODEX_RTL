param(
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath
$currentPath = Join-Path $root "_codex_rtl_current.txt"
$sourceStatePath = Join-Path $root "_codex_rtl_source.json"
$logPath = Join-Path $root "_handoff\launch-codex-rtl-error.log"
$launchLogPath = Join-Path $root "_handoff\launch-codex-rtl.log"
$userDataDir = Join-Path $root "_codex_rtl_user_data"
$codexTmpPath = Join-Path $env:USERPROFILE ".codex\.tmp"

function Resolve-CurrentLocalRoot {
  if (Test-Path -LiteralPath $currentPath) {
    $localRootName = (Get-Content -LiteralPath $currentPath -TotalCount 1).Trim()
  } else {
    $localRootName = "_codex_rtl_app"
  }

  if ([System.IO.Path]::IsPathRooted($localRootName)) {
    return $localRootName
  }

  return Join-Path $root $localRootName
}

function Find-CodexSourceApp {
  $packages = @(Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue |
    Sort-Object Version -Descending)

  foreach ($package in $packages) {
    $appPath = Join-Path $package.InstallLocation "app"
    if ((Test-Path -LiteralPath (Join-Path $appPath "Codex.exe")) -and
        (Test-Path -LiteralPath (Join-Path $appPath "resources\app.asar"))) {
      return [pscustomobject]@{
        AppPath = $appPath
        PackageVersion = $package.Version.ToString()
        InstallLocation = $package.InstallLocation
      }
    }
  }

  $programFiles = if ([string]::IsNullOrWhiteSpace($env:ProgramFiles)) { "C:\Program Files" } else { $env:ProgramFiles }
  $windowsApps = Join-Path $programFiles "WindowsApps"
  $fallbackPackages = Get-ChildItem -LiteralPath $windowsApps -Directory -Filter "OpenAI.Codex_*" -ErrorAction Stop |
    Sort-Object Name -Descending

  foreach ($package in $fallbackPackages) {
    $appPath = Join-Path $package.FullName "app"
    if ((Test-Path -LiteralPath (Join-Path $appPath "Codex.exe")) -and
        (Test-Path -LiteralPath (Join-Path $appPath "resources\app.asar"))) {
      return [pscustomobject]@{
        AppPath = $appPath
        PackageVersion = $package.Name
        InstallLocation = $package.FullName
      }
    }
  }

  throw "Codex Desktop official package was not found."
}

function Find-NodeExe {
  param([string]$SourceApp)

  function Test-NodeExe {
    param([string]$NodePath)

    try {
      & $NodePath --version *> $null
      return $LASTEXITCODE -eq 0
    } catch {
      return $false
    }
  }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($nodeCommand -and (Test-NodeExe -NodePath $nodeCommand.Source)) {
    return $nodeCommand.Source
  }

  $bundledNode = Join-Path $SourceApp "resources\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $toolDir = Join-Path $root "_codex_rtl_tools"
    New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
    $localNode = Join-Path $toolDir "node.exe"
    Copy-Item -LiteralPath $bundledNode -Destination $localNode -Force
    if (Test-NodeExe -NodePath $localNode) {
      return $localNode
    }
  }

  throw "Node.js was not found. Codex bundled node.exe and system node.exe are both unavailable."
}

function Get-SourceState {
  param($SourceInfo)

  return [pscustomobject]@{
    packageVersion = $SourceInfo.PackageVersion
    installLocation = $SourceInfo.InstallLocation
    appPath = $SourceInfo.AppPath
  }
}

function Test-SourceStateMatches {
  param($Expected)

  if (!(Test-Path -LiteralPath $sourceStatePath)) {
    return $false
  }

  try {
    $current = Get-Content -LiteralPath $sourceStatePath -Raw | ConvertFrom-Json
    return $current.packageVersion -eq $Expected.packageVersion -and
      $current.installLocation -eq $Expected.installLocation -and
      $current.appPath -eq $Expected.appPath
  } catch {
    return $false
  }
}

function Update-DesktopShortcutIcon {
  param([string]$BuildName)

  $desktop = [Environment]::GetFolderPath("Desktop")
  $shell = New-Object -ComObject WScript.Shell
  Get-ChildItem -LiteralPath $desktop -Filter "Codex RTL*.lnk" -ErrorAction SilentlyContinue |
    ForEach-Object {
      $shortcut = $shell.CreateShortcut($_.FullName)
      $shortcut.IconLocation = "$(Join-Path $root $BuildName)\app\resources\icon.ico,0"
      $shortcut.Save()
    }
}

function Update-CodexRtlBuildIfNeeded {
  $sourceInfo = Find-CodexSourceApp
  $expectedState = Get-SourceState -SourceInfo $sourceInfo

  if (Test-SourceStateMatches -Expected $expectedState) {
    "Official Codex source unchanged: $($expectedState.packageVersion)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
    return
  }

  "Official Codex source changed or unknown. Rebuilding RTL from $($expectedState.packageVersion)." | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
  $nodeExe = Find-NodeExe -SourceApp $sourceInfo.AppPath
  $buildName = "_codex_rtl_app_" + (Get-Date -Format "yyyyMMddHHmmss")
  $localRoot = Join-Path $root $buildName

  $env:CODEX_RTL_SOURCE_APP = $sourceInfo.AppPath
  $env:CODEX_RTL_SOURCE_VERSION = $sourceInfo.PackageVersion
  $env:CODEX_RTL_LOCAL_ROOT = $localRoot

  & $nodeExe (Join-Path $root "build-codex-rtl-local.mjs")
  if ($LASTEXITCODE -ne 0) {
    throw "Codex RTL auto rebuild failed."
  }

  Set-Content -LiteralPath $currentPath -Value $buildName -Encoding ASCII
  $expectedState | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $sourceStatePath -Encoding UTF8
  Update-DesktopShortcutIcon -BuildName $buildName
  "Auto rebuild completed: $buildName" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
}

function Repair-CodexTemporaryPlugins {
  if (!(Test-Path -LiteralPath $codexTmpPath)) {
    return
  }

  Get-ChildItem -LiteralPath $codexTmpPath -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "plugins" -or $_.Name -like "plugins-clone-*" } |
    ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

try {
  if (Test-Path $logPath) {
    Remove-Item -LiteralPath $logPath -Force
  }
  New-Item -ItemType Directory -Path (Split-Path $launchLogPath) -Force | Out-Null
  New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null

  @(
    "Codex RTL launch: $(Get-Date -Format o)"
    "Auto update: enabled"
    "User data dir: $userDataDir"
  ) | Set-Content -LiteralPath $launchLogPath -Encoding UTF8

  try {
    Update-CodexRtlBuildIfNeeded
  } catch {
    "Auto rebuild failed; falling back to the current RTL build. $($_.Exception.Message)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
  }

  $localRoot = Resolve-CurrentLocalRoot
  $localApp = Join-Path $localRoot "app"
  $localExe = Join-Path $localApp "Codex.exe"
  $localAsar = Join-Path $localApp "resources\app.asar"

  if (!(Test-Path $localExe)) {
    throw "Codex RTL executable was not found: $localExe"
  }

  if (!(Test-Path $localAsar)) {
    throw "Codex RTL app.asar was not found: $localAsar"
  }

  Repair-CodexTemporaryPlugins

  if ($SelfTest) {
    "OK"
    exit 0
  }

  @(
    "Local exe: $localExe"
    "Working directory: $localApp"
  ) | Add-Content -LiteralPath $launchLogPath -Encoding UTF8

  function Get-ConflictingCodexProcess {
    Get-CimInstance Win32_Process |
      Where-Object {
      $_.ExecutablePath -and
      (
        $_.ExecutablePath -match "\\WindowsApps\\OpenAI\.Codex_[^\\]+\\app\\Codex\.exe$" -or
        $_.ExecutablePath -match "\\WindowsApps\\OpenAI\.Codex_[^\\]+\\app\\resources\\codex\.exe$" -or
        (
          $_.ExecutablePath -match "\\_codex_rtl_app_[^\\]+\\app\\Codex\.exe$" -and
          $_.ExecutablePath -ne $localExe
        ) -or
        $_.ExecutablePath -match "\\_codex_rtl_app_[^\\]+\\app\\resources\\codex\.exe$"
      )
      }
  }

  @(Get-ConflictingCodexProcess) |
    ForEach-Object {
      "Stopping conflicting process: $($_.ProcessId) $($_.ExecutablePath)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  $deadline = (Get-Date).AddSeconds(10)
  do {
    $remainingProcesses = @(Get-ConflictingCodexProcess)
    if ($remainingProcesses.Count -eq 0) {
      break
    }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)

  "Remaining conflicting processes: $($remainingProcesses.Count)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8

  $arguments = @(
    "--lang=ar"
    "--user-data-dir=`"$userDataDir`""
  )
  $process = Start-Process -FilePath $localExe -ArgumentList $arguments -WorkingDirectory $localApp -PassThru

  $repairCommand = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$tmp = Join-Path `$env:USERPROFILE '.codex\.tmp'
for (`$i = 0; `$i -lt 120; `$i++) {
  if (Test-Path -LiteralPath `$tmp) {
    Get-ChildItem -LiteralPath `$tmp -Directory |
      Where-Object { `$_.Name -eq 'plugins' -or `$_.Name -like 'plugins-clone-*' } |
      ForEach-Object {
        Remove-Item -LiteralPath `$_.FullName -Recurse -Force
      }
  }
  Start-Sleep -Seconds 1
}
"@
  Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $repairCommand
  )

  Start-Sleep -Seconds 4

  if ($process.HasExited) {
    "Local Codex exited early with code: $($process.ExitCode)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
  } else {
    "Local Codex started: $($process.Id)" | Add-Content -LiteralPath $launchLogPath -Encoding UTF8
  }
} catch {
  New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
  $_ | Out-String | Set-Content -LiteralPath $logPath -Encoding UTF8
  throw
}
