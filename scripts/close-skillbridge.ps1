param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDirectory
)

$ErrorActionPreference = 'Stop'
$installRoot = [System.IO.Path]::GetFullPath($InstallDirectory).TrimEnd('\') + '\'
$applicationPath = Join-Path $installRoot 'SkillBridge.exe'
$backendPath = Join-Path $installRoot 'resources\runtime\bin\java.exe'

function Get-SkillBridgeProcesses {
  @(Get-CimInstance -ClassName Win32_Process | Where-Object {
    if (-not $_.ExecutablePath) {
      return $false
    }

    [System.StringComparer]::OrdinalIgnoreCase.Equals($_.ExecutablePath, $applicationPath) -or
      [System.StringComparer]::OrdinalIgnoreCase.Equals($_.ExecutablePath, $backendPath)
  })
}

try {
  $applicationProcesses = @(Get-SkillBridgeProcesses | Where-Object {
    [System.StringComparer]::OrdinalIgnoreCase.Equals($_.ExecutablePath, $applicationPath)
  })

  foreach ($process in $applicationProcesses) {
    $runningApplication = Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
    if ($runningApplication -and $runningApplication.MainWindowHandle -ne 0) {
      [void]$runningApplication.CloseMainWindow()
    }
  }

  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  do {
    $remainingProcesses = @(Get-SkillBridgeProcesses)
    if ($remainingProcesses.Count -eq 0) {
      exit 0
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)

  foreach ($process in $remainingProcesses) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }

  $deadline = [DateTime]::UtcNow.AddSeconds(3)
  do {
    $remainingProcesses = @(Get-SkillBridgeProcesses)
    if ($remainingProcesses.Count -eq 0) {
      exit 0
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)

  Write-Error 'SkillBridge or its bundled local service is still running.'
  exit 1
}
catch {
  Write-Error "Could not safely close SkillBridge: $($_.Exception.Message)"
  exit 1
}
