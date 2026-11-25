@echo off
REM Medibot for PC: opens the app in its own window. Works offline.
REM Needs Python (already installed for Medibot). Close this window to stop Medibot.
cd /d "%~dp0www"
start "" /min python -m http.server 8080 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://127.0.0.1:8080/index.html
) else (
  start "" http://127.0.0.1:8080/index.html
)
echo Medibot is running at http://127.0.0.1:8080  (tip: click "Install app" in Edge or Chrome to add it to your Start menu)
