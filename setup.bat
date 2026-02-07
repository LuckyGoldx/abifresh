@echo off
REM =============================================================
REM ABIFRESH & KIDDIES VENTURES - Quick Setup Script for Windows
REM =============================================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║    ABIFRESH & KIDDIES VENTURES PWA                        ║
echo ║    Quick Setup Script for Windows                          ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed!
    echo Please reinstall Node.js
    pause
    exit /b 1
)

echo ✅ npm is installed
npm --version

echo.
echo =============================================================
echo Step 1: Setting up Backend
echo =============================================================
echo.

if not exist "backend" (
    echo ❌ Error: backend folder not found!
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

cd backend

echo Installing backend dependencies...
echo (This may take 1-2 minutes)

call npm install
if %errorlevel% neq 0 (
    echo ❌ Backend setup failed!
    pause
    exit /b 1
)

echo ✅ Backend dependencies installed

REM Check if .env exists
if not exist ".env" (
    echo.
    echo ⚠️  .env file not found!
    echo.
    echo Please create a .env file in the backend folder with:
    echo.
    echo NODE_ENV=development
    echo PORT=5000
    echo SUPABASE_URL=your-supabase-url
    echo SUPABASE_ANON_KEY=your-anon-key
    echo SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    echo JWT_SECRET=your-secret-key-min-32-chars
    echo FRONTEND_URL=http://localhost:3000
    echo.
    echo See LOCAL_DEVELOPMENT.md for detailed setup
) else (
    echo ✅ .env file found
)

echo.
echo =============================================================
echo Step 2: Setting up Frontend
echo =============================================================
echo.

cd ..
cd frontend

if not exist "." (
    echo ❌ Error: frontend folder not found!
    pause
    exit /b 1
)

echo Installing frontend dependencies...
echo (This may take 2-3 minutes)

call npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend setup failed!
    pause
    exit /b 1
)

echo ✅ Frontend dependencies installed

REM Check if .env.local exists
if not exist ".env.local" (
    echo.
    echo ⚠️  .env.local file not found!
    echo.
    echo Please create a .env.local file in the frontend folder with:
    echo.
    echo NEXT_PUBLIC_API_URL=http://localhost:5000
    echo NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    echo.
    echo See LOCAL_DEVELOPMENT.md for detailed setup
) else (
    echo ✅ .env.local file found
)

echo.
echo =============================================================
echo Setup Complete! ✅
echo =============================================================
echo.
echo Next steps:
echo.
echo 1. Configure Backend:
echo    - Open backend\.env
echo    - Add your Supabase credentials
echo    - See LOCAL_DEVELOPMENT.md for details
echo.
echo 2. Configure Frontend:
echo    - Open frontend\.env.local
echo    - Add your Supabase credentials
echo    - See LOCAL_DEVELOPMENT.md for details
echo.
echo 3. Start Backend:
echo    - Open PowerShell
echo    - Run: cd backend
echo    - Run: npm run dev
echo    - Should see: Backend server running on http://localhost:5000
echo.
echo 4. Start Frontend:
echo    - Open new PowerShell
echo    - Run: cd frontend
echo    - Run: npm run dev
echo    - Should see: http://localhost:3000
echo.
echo 5. Open Browser:
echo    - Go to http://localhost:3000
echo    - Login with demo credentials (see LOCAL_DEVELOPMENT.md)
echo.
echo Documentation:
echo - Quick Setup: LOCAL_DEVELOPMENT.md
echo - Testing: LOCALHOST_TESTING.md
echo - AI Features: AI_INTEGRATION.md
echo - API Docs: docs/API_DOCUMENTATION.md
echo.
echo For help, see: COMPREHENSIVE_GUIDE.md
echo.

pause
