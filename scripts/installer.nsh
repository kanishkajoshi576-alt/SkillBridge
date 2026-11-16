!macro customCheckAppRunning
  retrySkillBridgeClose:
  File /oname=$PLUGINSDIR\close-skillbridge.ps1 "${PROJECT_DIR}\scripts\close-skillbridge.ps1"
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\close-skillbridge.ps1" -InstallDirectory "$INSTDIR"' $0
  Delete "$PLUGINSDIR\close-skillbridge.ps1"
  ${if} $0 != 0
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "SkillBridge could not close its app and local service. Close SkillBridge and click Retry to continue." /SD IDCANCEL IDRETRY retrySkillBridgeClose
    Quit
  ${endIf}
!macroend
