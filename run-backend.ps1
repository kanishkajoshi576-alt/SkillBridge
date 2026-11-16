$ErrorActionPreference = 'Stop'

$databasePassword = Read-Host 'Enter the SkillBridge MySQL database password' -AsSecureString
$credential = [System.Management.Automation.PSCredential]::new('skillbridge', $databasePassword)
$plainPassword = $credential.GetNetworkCredential().Password
$mailHost = Read-Host 'SMTP host for email password reset (press Enter to skip)'
$plainMailPassword = $null

$env:DATABASE_URL = 'jdbc:mysql://localhost:3307/skillbridge?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
$env:DATABASE_USERNAME = 'skillbridge'
$env:DATABASE_PASSWORD = $plainPassword
$env:SKILLBRIDGE_JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')

if (-not [string]::IsNullOrWhiteSpace($mailHost)) {
    $env:MAIL_HOST = $mailHost
    $mailPort = Read-Host 'SMTP port (press Enter for 587)'
    $env:MAIL_PORT = if ([string]::IsNullOrWhiteSpace($mailPort)) { '587' } else { $mailPort }
    $env:MAIL_USERNAME = Read-Host 'SMTP username/email'
    $secureMailPassword = Read-Host 'SMTP password or app password' -AsSecureString
    $mailCredential = [System.Management.Automation.PSCredential]::new('smtp', $secureMailPassword)
    $plainMailPassword = $mailCredential.GetNetworkCredential().Password
    $env:MAIL_PASSWORD = $plainMailPassword
    $mailFrom = Read-Host 'Sender email (press Enter to use SMTP username)'
    $env:MAIL_FROM = if ([string]::IsNullOrWhiteSpace($mailFrom)) { $env:MAIL_USERNAME } else { $mailFrom }
    $env:MAIL_SMTP_AUTH = 'true'
    $env:MAIL_SMTP_STARTTLS = 'true'
}

try {
    & java -jar (Join-Path $PSScriptRoot 'backend\target\skillbridge-api-runtime.jar')
    if ($LASTEXITCODE -ne 0) {
        throw "SkillBridge backend exited with code $LASTEXITCODE."
    }
}
finally {
    Remove-Item Env:DATABASE_URL, Env:DATABASE_USERNAME, Env:DATABASE_PASSWORD, Env:SKILLBRIDGE_JWT_SECRET, Env:MAIL_HOST, Env:MAIL_PORT, Env:MAIL_USERNAME, Env:MAIL_PASSWORD, Env:MAIL_FROM, Env:MAIL_SMTP_AUTH, Env:MAIL_SMTP_STARTTLS -ErrorAction SilentlyContinue
    $plainPassword = $null
    $plainMailPassword = $null
}
