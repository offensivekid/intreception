@echo off
echo ========================================
echo   OFFENSIVE Forum - Starting...
echo ========================================
echo.

if not exist node_modules (
    echo [1/2] Installing dependencies...
    call npm install
    echo.
)

echo [2/2] Starting server...
echo.
echo Server will run on: http://localhost:8080
echo Press Ctrl+C to stop
echo.

node server.js
pause
