$ErrorActionPreference = 'SilentlyContinue'
Unregister-ScheduledTask -TaskName 'toolbox-local' -Confirm:$false
$desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'toolbox.url'
if (Test-Path $desktop) { Remove-Item $desktop -Force }
Write-Host "Arranque automatico sacado."
