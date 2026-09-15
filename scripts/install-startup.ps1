# Arranca toolbox al iniciar sesion (127.0.0.1:3460) y deja un acceso en el Escritorio.
$ErrorActionPreference = 'Stop'
$Toolbox = Resolve-Path (Join-Path $PSScriptRoot '..')
$Run = Join-Path $Toolbox 'scripts\run-server.ps1'
$TaskName = 'toolbox-local'

$ps = (Get-Command powershell.exe).Source
$action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Run`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
	-AllowStartIfOnBatteries `
	-DontStopIfGoingOnBatteries `
	-RestartCount 3 `
	-RestartInterval (New-TimeSpan -Minutes 1) `
	-ExecutionTimeLimit ([TimeSpan]::Zero) `
	-StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = Join-Path $desktop 'toolbox.url'
@(
	'[InternetShortcut]'
	'URL=http://toolbox.localhost:3460/'
) | Set-Content -Path $shortcut -Encoding ASCII

Write-Host "Listo. toolbox arranca al iniciar sesion."
Write-Host "Acceso: $shortcut"
Write-Host "URL:    http://toolbox.localhost:3460/"
Write-Host "Desde el Explorador: doble click en 'Abrir toolbox.cmd' (carpeta toolbox)."
Write-Host "Sacar el arranque: bun run autostart:off"
