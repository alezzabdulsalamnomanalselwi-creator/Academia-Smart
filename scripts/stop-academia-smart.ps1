[CmdletBinding()]
param([switch]$NoPause)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StatePath = Join-Path $ProjectRoot 'runtime\launcher-state.json'
function Pause-IfNeeded { if (-not $NoPause) { Read-Host 'اضغط Enter لإغلاق هذه النافذة' | Out-Null } }
function Get-ListenerPid([int]$Port) {
  try { $lines = & "$env:SystemRoot\System32\netstat.exe" -ano -p tcp 2>$null } catch { return $null }
  $line = @($lines | Select-String 'LISTENING' | ForEach-Object { $parts = ($_.Line -split '\s+') | Where-Object { $_ }; if ($parts.Count -ge 5 -and $parts[1] -match ":$Port$") { $parts[-1] } } | Select-Object -First 1)
  if ($line) { return [int]([string]($line | Select-Object -First 1)) }
  return $null
}
if (-not (Test-Path $StatePath)) { Write-Host 'لا توجد عمليات متعقبة بدأها Launcher.' -ForegroundColor Yellow; Pause-IfNeeded; exit 0 }
try {
  $state = Get-Content $StatePath -Raw | ConvertFrom-Json
  $stopped = 0
  $trackedEndpoints = @(
    [pscustomobject]@{ Port=$state.apiPort; Pid=$state.apiPid },
    [pscustomobject]@{ Port=$state.webPort; Pid=$state.webPid }
  )
  foreach ($endpoint in $trackedEndpoints) {
    if (-not $endpoint.Port -or -not $endpoint.Pid) { continue }
    $listenerPid = Get-ListenerPid ([int]$endpoint.Port)
    if ($listenerPid -and $listenerPid -eq [int]$endpoint.Pid) {
      Stop-Process -Id $listenerPid -ErrorAction Stop
      $stopped++
    } elseif ($listenerPid) {
      $listenerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerPid" -ErrorAction SilentlyContinue
      if ($listenerProcess -and $listenerProcess.CommandLine -like "*$ProjectRoot*") {
        Stop-Process -Id $listenerPid -ErrorAction Stop
        $stopped++
      }
    }
  }
  Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  Write-Host "تم إيقاف $stopped عملية متعقبة لـAcademia Smart فقط." -ForegroundColor Green
} catch { Write-Host "تعذر الإيقاف الآمن: $($_.Exception.Message)" -ForegroundColor Red; Pause-IfNeeded; exit 1 }
Pause-IfNeeded

