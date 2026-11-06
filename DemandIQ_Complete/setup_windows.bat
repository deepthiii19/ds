@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo DemandIQ - One-time Windows setup
echo ========================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.11 or 3.12 and enable Add Python to PATH.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js LTS, then reopen this window.
  pause
  exit /b 1
)
if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv backend\.venv
  if errorlevel 1 goto failed
)
echo Installing Python dependencies. Prophet may take a few minutes...
backend\.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto failed
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto failed
echo Installing frontend dependencies...
pushd frontend
call npm install
if errorlevel 1 (popd & goto failed)
popd
echo.
echo Setup complete! Run start_backend.bat and start_frontend.bat in separate terminals/windows.
pause
exit /b 0
:failed
echo.
echo Setup failed. Read the error above and share it for troubleshooting.
pause
exit /b 1
