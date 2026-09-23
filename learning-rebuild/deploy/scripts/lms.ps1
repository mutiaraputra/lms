# =============================================================================
# Wrapper PowerShell (Windows) untuk operasi LMS via WSL + Docker.
# Jalankan dari folder repo di PowerShell:
#   .\deploy\scripts\lms.ps1 start
#   .\deploy\scripts\lms.ps1 stop
#   .\deploy\scripts\lms.ps1 update
#   .\deploy\scripts\lms.ps1 backup
#   .\deploy\scripts\lms.ps1 restore backups/db-XXXX.sql.gz
#   .\deploy\scripts\lms.ps1 logs
#   .\deploy\scripts\lms.ps1 status
#
# Prasyarat: Docker Desktop (dengan integrasi WSL2) aktif.
# =============================================================================
param(
  [Parameter(Mandatory = $true)][string]$Command,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Args
)

# Pindah ke root repo (dua level di atas folder skrip).
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

function Invoke-Wsl($bashCmd) {
  # Jalankan perintah bash di dalam WSL pada direktori repo saat ini.
  wsl bash -lc "cd `"$(wsl wslpath -a '$($RepoRoot.Path)')`" && $bashCmd"
}

switch ($Command.ToLower()) {
  "start"   { Invoke-Wsl "bash deploy/scripts/start.sh" }
  "stop"    { Invoke-Wsl "bash deploy/scripts/stop.sh $($Args -join ' ')" }
  "update"  { Invoke-Wsl "bash deploy/scripts/update.sh" }
  "backup"  { Invoke-Wsl "bash deploy/scripts/backup.sh" }
  "restore" { Invoke-Wsl "bash deploy/scripts/restore.sh $($Args -join ' ')" }
  "logs"    { Invoke-Wsl "docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=100" }
  "status"  { Invoke-Wsl "docker compose -f docker-compose.prod.yml --env-file .env.production ps" }
  default   {
    Write-Host "Perintah tidak dikenal: $Command"
    Write-Host "Gunakan: start | stop | update | backup | restore <file> | logs | status"
  }
}
