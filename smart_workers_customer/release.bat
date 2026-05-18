@echo off
REM Windows wrapper that runs release.ps1 with proper PowerShell flags.
REM Usage: release.bat [-NoRegister] [-Tester "..."] [-ReleaseNotes "..."]
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
)
