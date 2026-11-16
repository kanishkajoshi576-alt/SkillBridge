$ErrorActionPreference = 'Stop'

$javaHome = $env:JAVA_HOME
if ([string]::IsNullOrWhiteSpace($javaHome) -or -not (Test-Path (Join-Path $javaHome 'bin\jlink.exe'))) {
    $java = (Get-Command java.exe -ErrorAction Stop).Source
    $javaHome = Split-Path (Split-Path $java -Parent) -Parent
}

$jlink = Join-Path $javaHome 'bin\jlink.exe'
$output = Join-Path $PSScriptRoot '..\build\desktop-runtime'
$output = [System.IO.Path]::GetFullPath($output)
if (Test-Path -LiteralPath $output) {
    Remove-Item -LiteralPath $output -Recurse -Force
}

$modules = 'java.base,java.compiler,java.desktop,java.instrument,java.logging,java.management,java.naming,java.net.http,java.prefs,java.scripting,java.security.jgss,java.security.sasl,java.sql,java.transaction.xa,java.xml,jdk.crypto.ec,jdk.management,jdk.unsupported'
& $jlink --add-modules $modules --strip-debug --no-header-files --no-man-pages --compress=2 --output $output
if ($LASTEXITCODE -ne 0) {
    throw 'Could not package the Java runtime required by the desktop app.'
}

$java = Join-Path $output 'bin\java.exe'
if (-not (Test-Path $java)) {
    throw 'The packaged Java runtime does not contain java.exe.'
}

Write-Output "Packaged desktop Java runtime to $output"
