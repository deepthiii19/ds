@echo off
cd /d "%~dp0\frontend"
if not exist "node_modules" (
  echo Run setup_windows.bat first.
  pause
  exit /b 1
)
call npm run dev
pause
