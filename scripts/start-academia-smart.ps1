[CmdletBinding()]
param(
  [switch]$CheckOnly,
  [switch]$NoBrowser,
  [switch]$NoPause,
  [int]$WebPort = 3015,
  [int]$ApiPort = 5050
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $ProjectRoot 'runtime'
$StatePath = Join-Path $RuntimeDir 'launcher-state.json'
$ApiUrl = "http://localhost:$ApiPort/api/health"
$WebHealthUrl = "http://localhost:$WebPort/"
$WebUrl = "http://localhost:$WebPort/login"
$KnownCredentialPath = Join-Path $env:USERPROFILE 'Documents\ChatGPT\مشروع التخرج\SENSITIVE-PRODUCTION-BACKUP\my-project-51bb7\credentials\firebase-admin-service-account.json'
$PublicFirebaseConfigPath = Join-Path $ProjectRoot 'config\firebase-web.public.env'
$FrontendEnvPath = Join-Path $ProjectRoot '.env.local'
$RequiredFirebaseKeys = @('REACT_APP_FIREBASE_API_KEY','REACT_APP_FIREBASE_AUTH_DOMAIN','REACT_APP_FIREBASE_PROJECT_ID','REACT_APP_FIREBASE_STORAGE_BUCKET','REACT_APP_FIREBASE_MESSAGING_SENDER_ID','REACT_APP_FIREBASE_APP_ID','REACT_APP_FIREBASE_MEASUREMENT_ID')

function Write-Step([string]$Text) { Write-Host $Text -ForegroundColor Cyan }
function Write-Notice([string]$Text) { Write-Host $Text -ForegroundColor Yellow }
function Write-Failure([string]$Text) { Write-Host "`nفشل التشغيل: $Text" -ForegroundColor Red }
function Pause-IfNeeded { if (-not $NoPause) { Read-Host 'اضغط Enter لإغلاق هذه النافذة' | Out-Null } }
function Get-NodeCommand {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node -and (Test-Path (Join-Path $env:ProgramFiles 'nodejs\node.exe'))) {
    $env:Path = "$(Join-Path $env:ProgramFiles 'nodejs');$env:Path"
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
  }
  return $node
}
function Test-NodeCompatible($Node) {
  if (-not $Node) { return $false }
  $version = (& $Node.Source --version).Trim().TrimStart('v')
  $major = [int]($version.Split('.')[0])
  if ($major -lt 20) { Write-Notice "تم العثور على Node.js $version لكنه يحتاج Node.js 20 LTS أو أحدث."; return $false }
  Write-Host "Node.js $version جاهز."
  return $true
}
function Install-NodeLts {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) { throw 'Node.js غير موجود وwinget غير متاح. ثبّت Node.js LTS من https://nodejs.org ثم أعد التشغيل.' }
  Write-Notice 'Node.js غير موجود. سيطلب Windows التأكيد إن لزم لتثبيت Node.js LTS الرسمي.'
  & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw 'تعذر تثبيت Node.js LTS عبر winget. راجع رسالة Windows ثم ثبّت النسخة الرسمية من nodejs.org.' }
  $node = Get-NodeCommand
  if (-not (Test-NodeCompatible $node)) { throw 'اكتمل أمر التثبيت، لكن Node.js 20 LTS لم يصبح متاحًا لهذه الجلسة. أغلق النافذة وافتح START-ACADEMIA-SMART.cmd مجددًا.' }
  return $node
}
function Get-PortOwner([int]$Port) {
  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $ownerPid = if ($connection) { $connection.OwningProcess } else { $null }
  if (-not $ownerPid) {
    try { $netstatLines = & "$env:SystemRoot\System32\netstat.exe" -ano -p tcp 2>$null } catch { $netstatLines = @() }
    $line = @($netstatLines | Select-String 'LISTENING' | ForEach-Object {
      $parts = ($_.Line -split '\s+') | Where-Object { $_ }
      if ($parts.Count -ge 5 -and $parts[1] -match ":$Port$") { $parts[-1] }
    } | Select-Object -First 1)
    $ownerPid = [int]($line | Select-Object -First 1)
  }
  if (-not $ownerPid) { return $null }
  $process = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
  [pscustomobject]@{ Port=$Port; Pid=$ownerPid; Name=if ($process) { $process.ProcessName } else { 'unknown' } }
}
function Test-TrackedAcademiaProcess($Owner) {
  if (-not $Owner) { return $false }
  if (Test-Path $StatePath) {
    try {
      $state = Get-Content $StatePath -Raw | ConvertFrom-Json
      if (@($state.apiPid, $state.webPid) -contains [int]$Owner.Pid) { return $true }
    } catch { }
  }
  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($Owner.Pid)" -ErrorAction Stop
    return $process.CommandLine -like "*$ProjectRoot*"
  } catch { return $false }
}
function Wait-ForUrl([string]$Url, [int]$Attempts = 120) {
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { return $response }
    } catch { Start-Sleep -Seconds 1; continue }
    Start-Sleep -Seconds 1
  }
  return $null
}
function Test-FirebaseConfigFile([string]$Path) {
  if (-not (Test-Path $Path -PathType Leaf)) { return $false }
  $keys = Get-Content -LiteralPath $Path | ForEach-Object { if ($_ -match '^\s*([^#=]+)=') { $matches[1].Trim() } }
  return @($RequiredFirebaseKeys | Where-Object { $_ -notin $keys }).Count -eq 0
}
function Ensure-FrontendFirebaseConfig {
  if (Test-FirebaseConfigFile $FrontendEnvPath) {
    Write-Host 'Firebase frontend configuration ready.' -ForegroundColor Green
    return
  }
  if (-not (Test-FirebaseConfigFile $PublicFirebaseConfigPath)) {
    throw 'إعداد Firebase Web العام غير موجود أو غير مكتمل. يلزم config\firebase-web.public.env قبل تشغيل الواجهة.'
  }
  Copy-Item -LiteralPath $PublicFirebaseConfigPath -Destination $FrontendEnvPath -Force
  if (-not (Test-FirebaseConfigFile $FrontendEnvPath)) { throw 'تعذر إنشاء .env.local من إعداد Firebase Web العام.' }
  Write-Host 'Firebase frontend configuration ready.' -ForegroundColor Green
}

try {
  Write-Step '[1/6] Checking Node.js...'
  $node = Get-NodeCommand
  if (-not (Test-NodeCompatible $node)) {
    if ($CheckOnly) { throw 'Node.js 20 LTS أو أحدث غير متوفر.' }
    $node = Install-NodeLts
  }
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npm) { throw 'npm غير متاح بعد اكتشاف Node.js.' }

  Write-Step '[2/6] Checking dependencies...'
  $dependencyMarker = Join-Path $ProjectRoot 'node_modules\.package-lock.json'
  $dependenciesReady = (Test-Path $dependencyMarker) -and (Test-Path (Join-Path $ProjectRoot 'node_modules\react'))
  if (-not $dependenciesReady) {
    if ($CheckOnly) { Write-Notice 'الحزم غير موجودة؛ سيجري START تنزيلها عبر npm ci في أول تشغيل.' }
    else {
    Write-Notice 'يجري تنزيل حزم المشروع من package-lock.json. يحدث ذلك في أول تشغيل فقط.'
    Push-Location $ProjectRoot
    try { & $npm.Source ci --no-audit --no-fund } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'تعذر تنزيل الحزم عبر npm ci. تحقق من الاتصال وpackage-lock.json ثم أعد التشغيل.' }
    $dependenciesReady = $true
    }
  } else { Write-Host 'الحزم المحلية جاهزة.' }

  Write-Step '[3/6] Checking Firebase Web configuration...'
  $publicConfigReady = Test-FirebaseConfigFile $PublicFirebaseConfigPath
  if ($CheckOnly) {
    if (-not $publicConfigReady) { throw 'إعداد Firebase Web العام غير موجود أو غير مكتمل.' }
    Write-Host 'Firebase frontend configuration can be created automatically.' -ForegroundColor Green
  } else { Ensure-FrontendFirebaseConfig }

  Write-Step '[4/6] Checking secure credentials...'
  $credentialPath = $env:GOOGLE_APPLICATION_CREDENTIALS
  if (-not $credentialPath -or -not (Test-Path $credentialPath -PathType Leaf)) { $credentialPath = $KnownCredentialPath }
  if ($credentialPath -and (Test-Path $credentialPath -PathType Leaf)) {
    $env:GOOGLE_APPLICATION_CREDENTIALS = $credentialPath
    $env:FIREBASE_PROJECT_ID = 'my-project-51bb7'
    Write-Host 'تم العثور على بيانات اعتماد خدمة الملفات محليًا.' -ForegroundColor Green
    $credentialReady = $true
  } else {
    Write-Notice 'بيانات اعتماد خدمة الملفات غير موجودة. ستعمل الواجهة، لكن عرض/رفع الملفات المحمية يحتاج إعداد Firebase Admin المحلي.'
    $credentialReady = $false
  }

  $apiOwner = Get-PortOwner $ApiPort
  $webOwner = Get-PortOwner $WebPort
  if ($CheckOnly) {
    Write-Step '[5/6] Checking ports and project files...'
    if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) { throw 'package.json غير موجود في مجلد المشروع.' }
    if ($apiOwner) { Write-Notice "المنفذ $ApiPort مستخدم بواسطة PID $($apiOwner.Pid) ($($apiOwner.Name))." }
    if ($webOwner) { Write-Notice "المنفذ $WebPort مستخدم بواسطة PID $($webOwner.Pid) ($($webOwner.Name))." }
    $browser = Get-Command msedge.exe -ErrorAction SilentlyContinue
    $portsReady = -not (($apiOwner -and -not (Test-TrackedAcademiaProcess $apiOwner)) -or ($webOwner -and -not (Test-TrackedAcademiaProcess $webOwner)))
    $ready = [bool]$node -and [bool]$npm -and $publicConfigReady -and $portsReady
    $status = if (-not $ready) { 'NO' } elseif ($dependenciesReady) { 'YES' } else { 'READY_AFTER_FIRST_START' }
    Write-Host "`nDEMO_MACHINE_READY = $status"
    Write-Host "Credential configured: $(if ($credentialReady) { 'YES' } else { 'NO (UI-only mode)' })"
    Write-Host "Default browser available: $(if ($browser) { 'YES' } else { 'Use the system default browser when START runs' })"
    exit $(if ($ready) { 0 } else { 1 })
  }

  foreach ($owner in @($apiOwner, $webOwner)) {
    if ($owner -and -not (Test-TrackedAcademiaProcess $owner)) {
      throw "المنفذ $($owner.Port) مستخدم بواسطة PID $($owner.Pid) ($($owner.Name)) وليس تشغيلًا متعقبًا لـAcademia Smart. لا سيتم إيقافه تلقائيًا. أوقفه يدويًا أو حرر المنفذ ثم أعد التشغيل."
    }
  }

  Write-Step '[5/6] Starting Academia Smart...'
  New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
  $env:PORT = "$WebPort"
  $env:FILE_API_PORT = "$ApiPort"
  $apiLog = Join-Path $RuntimeDir 'api.log'
  $apiErrorLog = Join-Path $RuntimeDir 'api-error.log'
  $webLog = Join-Path $RuntimeDir 'web.log'
  $webErrorLog = Join-Path $RuntimeDir 'web-error.log'
  if (-not $apiOwner) {
    $apiProcess = Start-Process -FilePath $node.Source -ArgumentList @('server/index.js') -WorkingDirectory $ProjectRoot -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrorLog -PassThru -WindowStyle Hidden
  }
  if (-not $webOwner) {
    $webProcess = Start-Process -FilePath $node.Source -ArgumentList @('node_modules/react-scripts/bin/react-scripts.js', 'start') -WorkingDirectory $ProjectRoot -RedirectStandardOutput $webLog -RedirectStandardError $webErrorLog -PassThru -WindowStyle Hidden
  }
  $state = [pscustomobject]@{ projectRoot=$ProjectRoot; apiPort=$ApiPort; webPort=$WebPort; apiPid=if ($apiProcess) { $apiProcess.Id } elseif ($apiOwner) { $apiOwner.Pid } else { $null }; webPid=if ($webProcess) { $webProcess.Id } elseif ($webOwner) { $webOwner.Pid } else { $null }; startedAt=(Get-Date).ToString('o') }
  $state | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
  if (-not (Wait-ForUrl $ApiUrl)) { throw "خدمة API لم تصبح جاهزة على $ApiPort. راجع runtime\api.log." }
  $health = Invoke-RestMethod -Uri $ApiUrl -TimeoutSec 3
  if (-not $health.ok) { throw 'خدمة API استجابت لكنها غير جاهزة للكتابة المحلية. راجع runtime\api.log.' }
  if ($health.adminCredentialsConfigured) { Write-Host 'خدمة الملفات الآمنة جاهزة.' -ForegroundColor Green } else { Write-Notice 'خدمة الملفات تعمل، لكن Firebase Admin credentials غير مهيأة للملفات المحمية.' }
  if (-not (Wait-ForUrl $WebHealthUrl)) { throw "واجهة الويب لم تصبح جاهزة على $WebPort. راجع runtime\web.log." }
  $apiListener = Get-PortOwner $ApiPort
  $webListener = Get-PortOwner $WebPort
  if ($apiListener) { $state.apiPid = $apiListener.Pid }
  if ($webListener) { $state.webPid = $webListener.Pid }
  $state | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8

  Write-Step '[6/6] Opening browser...'
  if (-not $NoBrowser) { Start-Process $WebUrl }
  Write-Host "`nAcademia Smart جاهز: $WebUrl" -ForegroundColor Green
  Write-Host 'اترك هذه النافذة مفتوحة أثناء العرض. استخدم STOP-ACADEMIA-SMART.cmd للإيقاف الآمن.'
} catch {
  Write-Failure $_.Exception.Message
  Pause-IfNeeded
  exit 1
}

