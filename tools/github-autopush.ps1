param(
  [switch]$Commit,
  [switch]$PushOnly,
  [switch]$FromHook,
  [string]$Message = "Update Codex RTL solution",
  [string]$Remote = "origin",
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $scriptDir "..")).Path
$logDir = Join-Path $repoRoot "_handoff"
$logPath = Join-Path $logDir "github-autopush.log"

function Write-AutoPushLog {
  param([string]$Text)
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $line = "$(Get-Date -Format s) $Text"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  if (-not $FromHook) {
    Write-Host $Text
  }
}

function Invoke-Git {
  param([string[]]$GitArgs)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & git @GitArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    throw "git $($GitArgs -join ' ') failed:`n$output"
  }
  return $output
}

try {
  Set-Location -LiteralPath $repoRoot
  if (!(Test-Path -LiteralPath ".git")) {
    throw "Not a git repository: $repoRoot"
  }

  if ($Commit) {
    Invoke-Git @("add", "--", ".") | Out-Null
    $staged = @(git diff --cached --name-only)
    $forbidden = @($staged | Where-Object {
      $_ -match "^_codex_rtl_app" -or
      $_ -match "\.(asar|exe|dll|pak|node|dat|bin|wav)$"
    })

    if ($forbidden.Count -gt 0) {
      & git reset -- @forbidden | Out-Null
      throw "Refusing to commit generated or binary app files:`n$($forbidden -join [Environment]::NewLine)"
    }

    if ($staged.Count -eq 0) {
      Write-AutoPushLog "No staged changes to commit."
    } else {
      Invoke-Git @("commit", "-m", $Message) | Out-Null
      Write-AutoPushLog "Committed: $Message"
    }
  } elseif (-not $PushOnly) {
    Write-AutoPushLog "Nothing to do. Use -Commit or -PushOnly."
  }

  $remotes = @(git remote)
  if ($remotes -notcontains $Remote) {
    Write-AutoPushLog "Remote '$Remote' is not configured. Skipping GitHub push."
    exit 0
  }

  $branchName = $Branch
  if ([string]::IsNullOrWhiteSpace($branchName)) {
    $branchName = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).Trim()
  }
  if ([string]::IsNullOrWhiteSpace($branchName)) {
    throw "Cannot determine current branch."
  }

  & git rev-parse --abbrev-ref --symbolic-full-name "@{u}" *> $null
  if ($LASTEXITCODE -eq 0) {
    Invoke-Git @("push") | Out-Null
  } else {
    Invoke-Git @("push", "-u", $Remote, $branchName) | Out-Null
  }
  Write-AutoPushLog "Pushed '$branchName' to '$Remote'."
} catch {
  Write-AutoPushLog "ERROR: $($_.Exception.Message)"
  if ($FromHook) {
    exit 0
  }
  throw
}
