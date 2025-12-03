param(
  [string]$SqlInstance = 'localhost',
  [string]$Database = 'CraftAutomation',
  [string]$NasPath = "\\NAS\Backups\CraftDB",
  [int]$RetentionDays = 30
)

$DateStamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$BackupFile = Join-Path $NasPath "$Database-$DateStamp.bak"

if (!(Test-Path $NasPath)) { New-Item -ItemType Directory -Path $NasPath | Out-Null }

$sql = "BACKUP DATABASE [$Database] TO DISK = N'$BackupFile' WITH INIT, COMPRESSION" 
& sqlcmd -S $SqlInstance -Q $sql

Get-ChildItem $NasPath -Filter "$Database-*.bak" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
