@echo off
rem ArchLab easy start - installs webapp deps on first run, then opens the browser.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "webapp\node_modules" (
  echo Installing dependencies - first run only, this takes a minute...
  call npm install --prefix webapp
  if errorlevel 1 (
    echo npm install failed - see the error above.
    pause
    exit /b 1
  )
)

echo Starting ArchLab - your browser will open in a moment. Ctrl+C here to stop.
npm run dev
if errorlevel 1 pause
