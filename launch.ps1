#Requires -Version 5.1
<#
.SYNOPSIS
    Gray Protocol Launcher — checks prerequisites and starts the project.
.DESCRIPTION
    Verifies Node.js, npm, and project dependencies are installed.
    Attempts to install missing requirements with user confirmation.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$MIN_NODE_MAJOR = 18
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_NAME = "Gray Protocol"

# ── Colours ──────────────────────────────────────────────────────────────────

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ██████╗ ██████╗  █████╗ ██╗   ██╗    ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗" -ForegroundColor Cyan
    Write-Host "  ██╔════╝ ██╔══██╗██╔══██╗╚██╗ ██╔╝    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║" -ForegroundColor Cyan
    Write-Host "  ██║  ███╗██████╔╝███████║ ╚████╔╝     ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║" -ForegroundColor DarkCyan
    Write-Host "  ██║   ██║██╔══██╗██╔══██║  ╚██╔╝      ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║" -ForegroundColor DarkCyan
    Write-Host "  ╚██████╔╝██║  ██║██║  ██║   ██║       ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗" -ForegroundColor Blue
    Write-Host "   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  Launcher v1.0  —  $PROJECT_NAME" -ForegroundColor Gray
    Write-Host ""
}

function Write-Step   { param([string]$msg) Write-Host "  [..] $msg" -ForegroundColor Yellow }
function Write-OK     { param([string]$msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail   { param([string]$msg) Write-Host "  [!!] $msg" -ForegroundColor Red }
function Write-Info   { param([string]$msg) Write-Host "  [--] $msg" -ForegroundColor Gray }
function Write-Prompt { param([string]$msg) Write-Host "  [?>] $msg" -ForegroundColor Magenta -NoNewline }

function Confirm-Action {
    param([string]$message)
    Write-Prompt "$message [Y/n] "
    $answer = Read-Host
    return ($answer -eq "" -or $answer -match "^[Yy]")
}

# ── Requirement helpers ───────────────────────────────────────────────────────

function Test-Command {
    param([string]$name)
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-NodeMajorVersion {
    try {
        $raw = & node --version 2>$null
        if ($raw -match "v(\d+)") { return [int]$Matches[1] }
    } catch {}
    return 0
}

function Get-NpmVersion {
    try {
        $raw = & npm --version 2>$null
        return $raw.Trim()
    } catch {}
    return $null
}

# ── Installer strategies ──────────────────────────────────────────────────────

function Install-NodeViaWinget {
    Write-Step "Attempting install via winget..."
    try {
        & winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
        return $?
    } catch { return $false }
}

function Install-NodeViaChocolatey {
    Write-Step "Attempting install via Chocolatey..."
    try {
        & choco install nodejs-lts -y
        return $?
    } catch { return $false }
}

function Install-NodeViaNvmWindows {
    Write-Step "Attempting install via nvm-windows..."
    try {
        & nvm install lts
        & nvm use lts
        return $?
    } catch { return $false }
}

function Open-NodeDownloadPage {
    Write-Info "Opening Node.js download page in your browser..."
    Start-Process "https://nodejs.org/en/download/"
}

function Install-Node {
    Write-Fail "Node.js not found or version is too old (need v$MIN_NODE_MAJOR+)."
    Write-Info ""
    Write-Info "The launcher will try to install Node.js automatically."
    Write-Info ""

    $installed = $false

    # Try winget first (built-in on Windows 10/11)
    if (Test-Command "winget") {
        if (Confirm-Action "Install Node.js LTS via winget?") {
            $installed = Install-NodeViaWinget
            if ($installed) {
                # Refresh PATH
                $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
                            [System.Environment]::GetEnvironmentVariable("PATH", "User")
            }
        }
    }

    # Try Chocolatey
    if (-not $installed -and (Test-Command "choco")) {
        if (Confirm-Action "Install Node.js LTS via Chocolatey?") {
            $installed = Install-NodeViaChocolatey
        }
    }

    # Try nvm-windows
    if (-not $installed -and (Test-Command "nvm")) {
        if (Confirm-Action "Install Node.js LTS via nvm-windows?") {
            $installed = Install-NodeViaNvmWindows
        }
    }

    # Manual fallback
    if (-not $installed) {
        Write-Fail "Automatic installation unavailable or declined."
        if (Confirm-Action "Open nodejs.org download page in browser?") {
            Open-NodeDownloadPage
        }
        Write-Info ""
        Write-Info "After installing Node.js, re-run this launcher."
        Write-Info ""
        Pause-And-Exit 1
    }

    # Verify the install worked
    $ver = Get-NodeMajorVersion
    if ($ver -lt $MIN_NODE_MAJOR) {
        Write-Fail "Installation may have succeeded but Node.js is still not on PATH."
        Write-Info "Please restart your terminal / computer, then re-run this launcher."
        Pause-And-Exit 1
    }

    Write-OK "Node.js v$ver installed successfully."
}

function Install-Npm {
    Write-Fail "npm not found."
    Write-Info "npm is normally bundled with Node.js. Trying to repair..."
    if (Confirm-Action "Run 'npm install -g npm' to reinstall npm?") {
        try {
            & node -e "require('child_process').execSync('npm install -g npm', {stdio:'inherit'})"
        } catch {
            Write-Fail "Could not repair npm automatically."
            Write-Info "Please reinstall Node.js from https://nodejs.org/"
            Pause-And-Exit 1
        }
    } else {
        Pause-And-Exit 1
    }
}

function Pause-And-Exit {
    param([int]$code = 0)
    Write-Host ""
    Write-Info "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit $code
}

# ── Core checks ───────────────────────────────────────────────────────────────

function Test-Prerequisites {
    Write-Host ""
    Write-Host "  Checking prerequisites..." -ForegroundColor White
    Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray

    # Node.js
    Write-Step "Checking Node.js..."
    $nodeMajor = Get-NodeMajorVersion
    if ($nodeMajor -lt $MIN_NODE_MAJOR) {
        Install-Node
        $nodeMajor = Get-NodeMajorVersion
    }
    Write-OK "Node.js v$nodeMajor"

    # npm
    Write-Step "Checking npm..."
    $npmVer = Get-NpmVersion
    if (-not $npmVer) {
        Install-Npm
        $npmVer = Get-NpmVersion
    }
    Write-OK "npm v$npmVer"

    # node_modules
    Write-Step "Checking project dependencies..."
    $modulesPath = Join-Path $SCRIPT_DIR "node_modules"
    $pkgPath     = Join-Path $SCRIPT_DIR "package.json"

    if (-not (Test-Path $modulesPath)) {
        Write-Fail "node_modules not found."
        if (Confirm-Action "Run 'npm install' now?") {
            Write-Step "Installing dependencies (this may take a minute)..."
            Push-Location $SCRIPT_DIR
            try {
                & npm install
                if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
                Write-OK "Dependencies installed."
            } catch {
                Write-Fail "npm install failed: $_"
                Pause-And-Exit 1
            } finally {
                Pop-Location
            }
        } else {
            Write-Fail "Cannot continue without dependencies."
            Pause-And-Exit 1
        }
    } else {
        # Quick stale-check: compare package.json mtime vs node_modules mtime
        $pkgTime     = (Get-Item $pkgPath).LastWriteTime
        $modulesTime = (Get-Item $modulesPath).LastWriteTime
        if ($pkgTime -gt $modulesTime) {
            Write-Info "package.json is newer than node_modules — dependencies may be stale."
            if (Confirm-Action "Run 'npm install' to update?") {
                Push-Location $SCRIPT_DIR
                try {
                    & npm install
                    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
                    Write-OK "Dependencies updated."
                } catch {
                    Write-Fail "npm install failed: $_"
                    Pause-And-Exit 1
                } finally {
                    Pop-Location
                }
            } else {
                Write-Info "Skipping update. Things may not work correctly."
            }
        } else {
            Write-OK "Dependencies present."
        }
    }

    Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Menu ─────────────────────────────────────────────────────────────────────

function Show-Menu {
    Write-Host "  What would you like to do?" -ForegroundColor White
    Write-Host ""
    Write-Host "    [1]  Start dev server          (npm run dev)" -ForegroundColor Cyan
    Write-Host "    [2]  Build for production       (npm run build)" -ForegroundColor Cyan
    Write-Host "    [3]  Preview production build   (npm run preview)" -ForegroundColor Cyan
    Write-Host "    [4]  Run tests                  (npm run test)" -ForegroundColor Cyan
    Write-Host "    [5]  Full health check           (npm run healthcheck)" -ForegroundColor Cyan
    Write-Host "    [6]  Open in VS Code" -ForegroundColor Cyan
    Write-Host "    [Q]  Quit" -ForegroundColor DarkGray
    Write-Host ""
    Write-Prompt "Enter choice: "
    $choice = Read-Host

    Push-Location $SCRIPT_DIR
    try {
        switch ($choice.ToUpper()) {
            "1" {
                Write-Info "Starting dev server... (Ctrl+C to stop)"
                Write-Info "The browser should open automatically at http://localhost:5173"
                Write-Host ""
                & npm run dev
            }
            "2" {
                Write-Info "Building for production..."
                Write-Host ""
                & npm run build
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-OK "Build complete. Output is in the 'dist' folder."
                } else {
                    Write-Host ""
                    Write-Fail "Build failed (exit code $LASTEXITCODE)."
                }
            }
            "3" {
                $distPath = Join-Path $SCRIPT_DIR "dist"
                if (-not (Test-Path $distPath)) {
                    Write-Fail "'dist' folder not found. Run a build first (option 2)."
                } else {
                    Write-Info "Starting preview server... (Ctrl+C to stop)"
                    & npm run preview
                }
            }
            "4" {
                Write-Info "Running tests..."
                Write-Host ""
                & npm run test
            }
            "5" {
                Write-Info "Running full health check (tests + sanity + simulate + build)..."
                Write-Host ""
                & npm run healthcheck
            }
            "6" {
                if (Test-Command "code") {
                    Write-Info "Opening project in VS Code..."
                    & code $SCRIPT_DIR
                } else {
                    Write-Fail "'code' command not found. Is VS Code installed and on PATH?"
                }
            }
            { $_ -in "Q","QUIT","EXIT" } {
                Write-Host ""
                Write-Info "Goodbye."
                exit 0
            }
            default {
                Write-Fail "Invalid choice: '$choice'"
            }
        }
    } finally {
        Pop-Location
    }

    Write-Host ""
    if (Confirm-Action "Return to menu?") {
        Show-Menu
    }
}

# ── Entry point ───────────────────────────────────────────────────────────────

Write-Header
Test-Prerequisites
Show-Menu
