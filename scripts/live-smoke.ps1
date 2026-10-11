# Live smoke test against a running API. Reads the seeded admin credentials
# from .env without printing them.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:4000/api/v1'

$envMap = @{}
foreach ($line in Get-Content .env) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$password = $envMap['SEED_ADMIN_PASSWORD']
$email = if ($envMap['SEED_ADMIN_EMAIL']) { $envMap['SEED_ADMIN_EMAIL'] } else { 'admin@terramorph.com.eg' }
if (-not $password) { throw 'SEED_ADMIN_PASSWORD not found in .env' }

$fail = 0
function Check($name, $cond, $detail = '') {
  if ($cond) { "  PASS  $name" } else { $script:fail++; "  FAIL  $name $detail" }
}

"== unauthenticated access is refused =="
foreach ($p in @('/dashboard/summary', '/assignments', '/experts', '/activity', '/submissions')) {
  try {
    Invoke-WebRequest -Uri "$base$p" -UseBasicParsing -TimeoutSec 10 | Out-Null
    Check "401 for $p" $false '(got 200)'
  } catch {
    Check "401 for $p" ($_.Exception.Response.StatusCode.value__ -eq 401) "(got $($_.Exception.Response.StatusCode.value__))"
  }
}

"== login =="
$body = @{ email = $email; password = $password } | ConvertTo-Json
try {
  $login = Invoke-WebRequest -Uri "$base/auth/login" -Method POST -ContentType 'application/json' -Body $body -SessionVariable sess -UseBasicParsing -TimeoutSec 15
} catch {
  "  FAIL  login request threw: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { "  body: $($_.ErrorDetails.Message)" }
  exit 1
}
Check 'login returns 200' ($login.StatusCode -eq 200)
$cookie = $sess.Cookies.GetCookies($base) | Where-Object { $_.Name -eq 'tm_session' }
Check 'tm_session cookie set' ($null -ne $cookie)
Check 'cookie is HttpOnly' ($cookie.HttpOnly)

$me = Invoke-RestMethod -Uri "$base/auth/me" -WebSession $sess -TimeoutSec 15
Check 'me returns the seeded admin' ($me.user.email -eq $email) "(got $($me.user.email))"

"== authenticated reads =="
$summary = Invoke-RestMethod -Uri "$base/dashboard/summary" -WebSession $sess -TimeoutSec 15
Check 'summary has activeAssignments' ($null -ne $summary.activeAssignments)
Check 'summary counts experts' ($summary.expertsOnRoster -ge 6) "(experts=$($summary.expertsOnRoster))"
$stageKeys = @($summary.stages.PSObject.Properties.Name)
Check 'summary stages keyed by gate code' ($stageKeys.Count -ge 1 -and ($stageKeys | Where-Object { $_ -notmatch '^G\d+$' }).Count -eq 0) "(keys=$($stageKeys -join ','))"

# The API paginates with 1-based page/pageSize, not limit/offset.
$list = Invoke-RestMethod -Uri "$base/assignments?page=1&pageSize=2" -WebSession $sess -TimeoutSec 15
Check 'assignments paginate' ($null -ne $list.pagination.total) "(total=$($list.pagination.total))"
Check 'assignments honour pageSize' ($list.items.Count -eq 2) "(returned $($list.items.Count))"
Check 'assignment carries stage + lead object' ($list.items[0].stage -match '^G\d+$' -and $null -ne $list.items[0].lead.name)

$p2 = Invoke-RestMethod -Uri "$base/assignments?page=2&pageSize=2" -WebSession $sess -TimeoutSec 15
Check 'second page differs' ($p2.items[0].id -ne $list.items[0].id) "(both $($list.items[0].id))"

$experts = Invoke-RestMethod -Uri "$base/experts?pageSize=50" -WebSession $sess -TimeoutSec 15
Check 'experts roster populated' ($experts.items.Count -ge 6) "(count=$($experts.items.Count))"
Check 'expert status is a code' ($experts.items[0].status -match '^[A-Z_]+$') "(got $($experts.items[0].status))"

$act = Invoke-RestMethod -Uri "$base/activity?limit=2" -WebSession $sess -TimeoutSec 15
Check 'activity feed paginates by limit' ($act.items.Count -eq 2) "(count=$($act.items.Count))"
Check 'activity returns a cursor' ($null -ne $act.nextCursor) "(cursor=$($act.nextCursor))"
Check 'activity resolves user + assignment' ($null -ne $act.items[0].user.name -and $null -ne $act.items[0].assignment.name)

"== public submissions =="
$subBody = @{ kind = 'CONTACT'; email = 'smoke@terramorph.test'; message = 'smoke probe'; source = 'live-smoke' } | ConvertTo-Json
$sub = Invoke-RestMethod -Uri "$base/submissions" -Method POST -ContentType 'application/json' -Body $subBody -TimeoutSec 15
Check 'anonymous submission accepted' ($sub.kind -eq 'CONTACT' -and $sub.status -eq 'NEW') "(got $($sub.kind)/$($sub.status))"
$subList = Invoke-RestMethod -Uri "$base/submissions?kind=CONTACT" -WebSession $sess -TimeoutSec 15
Check 'admin can list submissions' ($subList.pagination.total -ge 1) "(total=$($subList.pagination.total))"

"== wrong password is rejected =="
try {
  Invoke-WebRequest -Uri "$base/auth/login" -Method POST -ContentType 'application/json' `
    -Body (@{ email = $email; password = 'definitely-not-the-password' } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 15 | Out-Null
  Check 'bad password rejected' $false '(got 200)'
} catch {
  Check 'bad password rejected' ($_.Exception.Response.StatusCode.value__ -eq 401) "(got $($_.Exception.Response.StatusCode.value__))"
}

"== logout invalidates the session =="
$null = Invoke-WebRequest -Uri "$base/auth/logout" -Method POST -WebSession $sess -UseBasicParsing -TimeoutSec 15
try {
  Invoke-WebRequest -Uri "$base/dashboard/summary" -WebSession $sess -UseBasicParsing -TimeoutSec 10 | Out-Null
  Check 'session dead after logout' $false '(still authorised)'
} catch {
  Check 'session dead after logout' ($_.Exception.Response.StatusCode.value__ -eq 401)
}

if ($fail -eq 0) { "`nALL CHECKS PASSED" } else { "`n$fail CHECK(S) FAILED"; exit 1 }