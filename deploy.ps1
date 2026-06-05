#Requires -Version 5.1
<#
.SYNOPSIS
    Smart Workers - Windows PowerShell deployment script.
.DESCRIPTION
    Windows-native replacement for deploy.sh. Covers:
      - Firebase App Distribution (APK)
      - Backend docker-compose lifecycle (first deploy, updates, logs, health)
      - Secret generation (no passlib / WSL required)
      - Environment file scaffolding

    See DEPLOY.md for the full production runbook (VPS, DNS, R2, Caddy).

.EXAMPLE
    # Distribute Flutter APK to testers
    .\deploy.ps1 apk 1:123456789:android:abc tester@email.com

    # First-time backend deploy (copies .env.example files, builds, starts)
    .\deploy.ps1 backend first

    # Pull latest and rebuild (subsequent deployments)
    .\deploy.ps1 backend update

    # Stream logs from all services
    .\deploy.ps1 backend logs

    # Check health of all three API endpoints (production domain)
    .\deploy.ps1 health smartworkers.in

    # Check health on localhost (local dev)
    .\deploy.ps1 health

    # Generate all secrets needed for .env files
    .\deploy.ps1 secrets
#>

param(
    [Parameter(Position = 0, Mandatory)]
    [ValidateSet('apk', 'backend', 'health', 'secrets')]
    [string]$Mode,

    [Parameter(Position = 1)]
    [string]$Arg1 = '',

    [Parameter(Position = 2)]
    [string]$Arg2 = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step { param([string]$msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host " WARN $msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$msg) Write-Host " FAIL $msg" -ForegroundColor Red }

function Assert-Command {
    param([string]$Name, [string]$InstallHint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Fail "'$Name' not found. $InstallHint"
        exit 1
    }
}

function New-RandomSecret {
    param([int]$Bytes = 48)
    $buf = [byte[]]::new($Bytes)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    # URL-safe base64 (no +, /, or = padding)
    return ([Convert]::ToBase64String($buf) -replace '\+', '-' -replace '/', '_' -replace '=', '')
}

function New-BcryptHash {
    param([string]$Password)
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $h = python -c "from passlib.hash import bcrypt; print(bcrypt.hash('$Password'))" 2>$null
        if ($LASTEXITCODE -eq 0 -and $h) { return $h }
        $h = python -c "import bcrypt; print(bcrypt.hashpw(b'$Password', bcrypt.gensalt(12)).decode())" 2>$null
        if ($LASTEXITCODE -eq 0 -and $h) { return $h }
    }
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $js = "try{const b=require('bcryptjs');console.log(b.hashSync('$Password',12));}catch{const b=require('bcrypt');console.log(b.hashSync('$Password',12));}"
        $h = node -e $js 2>$null
        if ($LASTEXITCODE -eq 0 -and $h) { return $h }
    }
    Write-Warn "Could not auto-generate bcrypt hash."
    Write-Warn "Install Python + passlib:  pip install passlib[bcrypt]"
    Write-Warn "  or Node.js + bcryptjs:   npm i -g bcryptjs"
    return '<REPLACE: run python -c "from passlib.hash import bcrypt; print(bcrypt.hash(input()))">'
}

# ---------------------------------------------------------------------------
# Mode: secrets
# ---------------------------------------------------------------------------

function Invoke-Secrets {
    Write-Step "Generating secrets for all .env files"
    Write-Host ""

    $jwtNode     = New-RandomSecret 48
    $adminSecret = New-RandomSecret 48
    $encKey      = New-RandomSecret 32
    $pgPassword  = New-RandomSecret 32
    $custAdmin   = New-RandomSecret 48
    $jwtAdmin    = New-RandomSecret 48

    Write-Host "--- Copy these values into your .env.* files ---" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "# .env  (root - docker-compose postgres credentials)"
    Write-Host "POSTGRES_PASSWORD=$pgPassword"
    Write-Host ""
    Write-Host "# .env.node  (Node.js customer API)"
    Write-Host "JWT_SECRET=$jwtNode"
    Write-Host "ENCRYPTION_KEY=$encKey"
    Write-Host "ADMIN_SECRET=$adminSecret"
    Write-Host ""
    Write-Host "# .env.worker  (Worker backend FastAPI - ADMIN_SECRET must match .env.node)"
    Write-Host "ADMIN_SECRET=$adminSecret"
    Write-Host ""
    Write-Host "# .env.admin  (Admin backend FastAPI)"
    Write-Host "JWT_SECRET=$jwtAdmin"
    Write-Host "CUSTOMER_BACKEND_ADMIN_SECRET=$custAdmin"
    Write-Host ""
    Write-Host "# .env.node  - also set this to match CUSTOMER_BACKEND_ADMIN_SECRET above:"
    Write-Host "ADMIN_SECRET=$custAdmin"
    Write-Host ""

    $adminPass = Read-Host "Enter admin portal password to bcrypt-hash (leave blank to skip)"
    if ($adminPass -ne '') {
        $hash = New-BcryptHash $adminPass
        Write-Host ""
        Write-Host "# .env.admin"
        Write-Host "ADMIN_PASSWORD_HASH=$hash"
    }

    Write-Host ""
    Write-Ok "Secrets generated. Never commit these to git."
}

# ---------------------------------------------------------------------------
# Mode: apk
# ---------------------------------------------------------------------------

function Invoke-Apk {
    param([string]$AppId, [string]$Testers)

    if ($AppId -eq '') {
        Write-Fail "Usage: .\deploy.ps1 apk <FIREBASE_APP_ID> <tester@email.com>"
        Write-Host "  Get App ID: Firebase Console > Project > Android app > App ID"
        exit 1
    }

    Assert-Command 'firebase' 'Install Firebase CLI: npm install -g firebase-tools'

    $apk = Join-Path $PSScriptRoot 'smart_workers_customer\build\app\outputs\flutter-apk\app-release.apk'

    if (-not (Test-Path $apk)) {
        Write-Fail "APK not found at: $apk"
        Write-Host "Build first:  cd smart_workers_customer; flutter build apk --release"
        exit 1
    }

    $notes = 'Smart Workers Customer App v1.0 - Kerala edition. ' +
             'Features: Dashboard, Location search, Worker booking, Payment summary, Feedback.'

    Write-Step "Distributing APK via Firebase App Distribution..."

    $firebaseArgs = @(
        'appdistribution:distribute', $apk,
        '--app', $AppId,
        '--release-notes', $notes
    )
    if ($Testers -ne '') {
        $firebaseArgs += '--testers'
        $firebaseArgs += $Testers
    }

    & firebase @firebaseArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "firebase distribute failed (exit $LASTEXITCODE)"
        exit 1
    }

    Write-Host ""
    Write-Ok "Deployment complete! Testers will receive an email with the download link."
}

# ---------------------------------------------------------------------------
# Mode: backend
# ---------------------------------------------------------------------------

function Invoke-Backend {
    param([string]$SubCmd)

    Assert-Command 'docker' 'Install Docker Desktop from https://docs.docker.com/desktop/windows/'

    $root = $PSScriptRoot

    switch ($SubCmd) {

        'first' {
            Write-Step "First-time backend deployment"

            $copies = @(
                [PSCustomObject]@{ Src = '.env.example';        Dst = '.env'        },
                [PSCustomObject]@{ Src = '.env.worker.example'; Dst = '.env.worker' },
                [PSCustomObject]@{ Src = '.env.admin.example';  Dst = '.env.admin'  },
                [PSCustomObject]@{ Src = '.env.node.example';   Dst = '.env.node'   }
            )

            $needsEdit = $false
            foreach ($c in $copies) {
                $src = Join-Path $root $c.Src
                $dst = Join-Path $root $c.Dst
                if (-not (Test-Path $dst)) {
                    if (Test-Path $src) {
                        Copy-Item $src $dst
                        Write-Warn "Created $($c.Dst) from $($c.Src) -- EDIT before continuing!"
                        $needsEdit = $true
                    } else {
                        Write-Warn "$($c.Src) not found -- create $($c.Dst) manually."
                        $needsEdit = $true
                    }
                } else {
                    Write-Ok "$($c.Dst) already exists."
                }
            }

            if ($needsEdit) {
                Write-Host ""
                Write-Warn "Fill in all .env.* files, then re-run: .\deploy.ps1 backend first"
                Write-Warn "Run '.\deploy.ps1 secrets' to generate random secret values."
                Write-Host "Press Enter after editing, or Ctrl+C to abort..."
                $null = Read-Host
            }

            $missing = @('.env', '.env.node', '.env.worker', '.env.admin') |
                Where-Object { -not (Test-Path (Join-Path $root $_)) }
            if ($missing.Count -gt 0) {
                Write-Fail "Missing env files: $($missing -join ', '). Create them first."
                exit 1
            }

            Write-Step "Building images..."
            Push-Location $root
            try {
                docker compose build
                if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

                Write-Step "Starting services..."
                docker compose up -d
                if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

                Write-Host ""
                Write-Ok "All services started. Streaming logs (Ctrl+C to stop watching):"
                docker compose logs -f
            } finally {
                Pop-Location
            }
        }

        'update' {
            Write-Step "Pulling latest code and rebuilding..."
            Push-Location $root
            try {
                git pull --ff-only
                docker compose up -d --build
                if ($LASTEXITCODE -ne 0) { throw "docker compose up --build failed" }
                Write-Host ""
                docker compose ps
                Write-Ok "Update complete."
            } finally {
                Pop-Location
            }
        }

        'stop' {
            Write-Step "Stopping all services..."
            Push-Location $root
            try { docker compose down } finally { Pop-Location }
            Write-Ok "Stopped."
        }

        'logs' {
            Push-Location $root
            try { docker compose logs -f --tail=100 } finally { Pop-Location }
        }

        'ps' {
            Push-Location $root
            try { docker compose ps } finally { Pop-Location }
        }

        default {
            Write-Host "Usage: .\deploy.ps1 backend <subcommand>"
            Write-Host ""
            Write-Host "  first    Copy .env files, build images, start services (first run)"
            Write-Host "  update   git pull + rebuild running containers"
            Write-Host "  logs     Stream logs from all services"
            Write-Host "  ps       Show container status"
            Write-Host "  stop     docker compose down"
        }
    }
}

# ---------------------------------------------------------------------------
# Mode: health
# ---------------------------------------------------------------------------

function Invoke-Health {
    param([string]$Domain)

    Write-Step "Checking service health..."

    if ($Domain -ne '') {
        $endpoints = @(
            "https://api.$Domain/health",
            "https://workers-api.$Domain/health",
            "https://admin-api.$Domain/health"
        )
    } else {
        Write-Warn "No domain given -- checking localhost ports."
        Write-Warn "For production:  .\deploy.ps1 health smartworkers.in"
        $endpoints = @(
            'http://localhost:3000/health',
            'http://localhost:8000/health',
            'http://localhost:8001/health'
        )
    }

    $allOk = $true
    foreach ($url in $endpoints) {
        try {
            $resp = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
            if ($resp.StatusCode -eq 200) {
                Write-Ok "$url  ->  $($resp.StatusCode) OK"
            } else {
                Write-Warn "$url  ->  $($resp.StatusCode)"
                $allOk = $false
            }
        } catch {
            Write-Fail "$url  ->  $($_.Exception.Message)"
            $allOk = $false
        }
    }

    Write-Host ""
    if ($allOk) {
        Write-Ok "All services healthy."
    } else {
        Write-Fail "One or more services are unhealthy. Run: .\deploy.ps1 backend logs"
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

switch ($Mode) {
    'apk'     { Invoke-Apk     -AppId $Arg1 -Testers $Arg2 }
    'backend' { Invoke-Backend -SubCmd $Arg1 }
    'health'  { Invoke-Health  -Domain $Arg1 }
    'secrets' { Invoke-Secrets }
}
