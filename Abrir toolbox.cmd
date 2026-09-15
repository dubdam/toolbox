@echo off
setlocal
cd /d "%~dp0"
set URL=http://toolbox.localhost:3460/

curl -s -o NUL --max-time 1 http://127.0.0.1:3460/ >NUL 2>&1
if errorlevel 1 (
  echo Arrancando toolbox...
  start "toolbox" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0scripts\run-server.ps1"
  timeout /t 3 /nobreak >NUL
)

start "" "%URL%"
