@echo off
:: Gray Protocol Launcher
:: Double-click this file to start the launcher.

title Gray Protocol Launcher

:: Try to run with ExecutionPolicy bypass so unsigned scripts work
powershell.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0launch.ps1"

:: If PowerShell itself isn't available (very unlikely) fall back with a message
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: PowerShell could not run the launcher.
    echo  Make sure PowerShell 5.1 or later is installed.
    echo.
    pause
)
