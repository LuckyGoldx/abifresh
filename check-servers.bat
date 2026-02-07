@echo off
REM AKV System - Quick Server Status Check
echo.
echo === AKV System - Server Status ===
echo.

echo Checking if servers are running...
netstat -ano | findstr ":5000" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend appears to be running on port 5000
) else (
    echo [ERROR] Backend NOT running on port 5000
    echo Try: cd backend ^&^& npm start
)

netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend appears to be running on port 3000
) else (
    echo [ERROR] Frontend NOT running on port 3000
    echo Try: cd frontend ^&^& npm run dev
)

echo.
echo Open in browser:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:5000/health
echo.
pause
