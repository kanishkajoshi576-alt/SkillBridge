$ErrorActionPreference = 'Stop'

$jar = Join-Path $PSScriptRoot 'backend\target\skillbridge-api-runtime.jar'
if (-not (Test-Path -LiteralPath $jar)) {
    throw 'Backend jar not found. Build it first with: cd backend; mvn -DskipTests package'
}

$mailHost = Read-Host 'SMTP server [smtp.gmail.com]'
if ([string]::IsNullOrWhiteSpace($mailHost)) { $mailHost = 'smtp.gmail.com' }
$mailPort = Read-Host 'SMTP port [587]'
if ([string]::IsNullOrWhiteSpace($mailPort)) { $mailPort = '587' }
if ($mailPort -notmatch '^\d{1,5}$' -or [int]$mailPort -lt 1 -or [int]$mailPort -gt 65535) {
    throw 'Enter a valid SMTP port between 1 and 65535.'
}
$mailUsername = Read-Host 'SMTP username (your full email address)'
if ([string]::IsNullOrWhiteSpace($mailUsername)) { throw 'An SMTP username is required to send OTP emails.' }
$mailFrom = Read-Host "Sender email address [$mailUsername]"
if ([string]::IsNullOrWhiteSpace($mailFrom)) { $mailFrom = $mailUsername }
$demoOtpRecipient = Read-Host "Inbox for demo-account OTPs [$mailUsername]"
if ([string]::IsNullOrWhiteSpace($demoOtpRecipient)) { $demoOtpRecipient = $mailUsername }
$mailPasswordSecure = Read-Host 'SMTP app password (input hidden; do not use your regular Gmail password)' -AsSecureString
$passwordPointer = [IntPtr]::Zero

if ($mailPasswordSecure.Length -eq 0) { throw 'An SMTP app password is required to send OTP emails.' }

$env:SKILLBRIDGE_JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:SKILLBRIDGE_DEMO_SEED_ENABLED = 'true'
$env:MAIL_HOST = $mailHost.Trim()
$env:MAIL_PORT = $mailPort
$env:MAIL_USERNAME = $mailUsername.Trim()
$env:MAIL_FROM = $mailFrom.Trim()
$env:MAIL_SMTP_AUTH = 'true'
$env:MAIL_SMTP_STARTTLS = 'true'
$env:DEMO_OTP_RECIPIENT = $demoOtpRecipient.Trim()

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($mailPasswordSecure)
    $env:MAIL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Write-Host 'Starting SkillBridge in isolated DEMO mode with 44 sample learners.'
    Write-Host "Demo sign-in codes will be sent to $($demoOtpRecipient.Trim()). The SMTP app password is not saved to disk."
    $logPath = Join-Path $PSScriptRoot 'backend\demo-backend.log'
    & java -jar $jar 2>&1 | Tee-Object -FilePath $logPath
    $backendExitCode = $LASTEXITCODE
    if ($backendExitCode -ne 0) { throw "SkillBridge demo backend exited with code $backendExitCode. See backend\demo-backend.log for the cause." }
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $mailPasswordSecure = $null
    Remove-Item Env:SKILLBRIDGE_JWT_SECRET, Env:SPRING_PROFILES_ACTIVE, Env:SKILLBRIDGE_DEMO_SEED_ENABLED,
        Env:MAIL_HOST, Env:MAIL_PORT, Env:MAIL_USERNAME, Env:MAIL_FROM, Env:MAIL_PASSWORD,
        Env:MAIL_SMTP_AUTH, Env:MAIL_SMTP_STARTTLS, Env:DEMO_OTP_RECIPIENT -ErrorAction SilentlyContinue
}
