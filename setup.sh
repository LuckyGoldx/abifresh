#!/bin/bash

# =============================================================
# ABIFRESH & KIDDIES VENTURES - Quick Setup Script for macOS/Linux
# =============================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║    ABIFRESH & KIDDIES VENTURES PWA                        ║"
echo "║    Quick Setup Script for macOS/Linux                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js is installed"
node --version

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "Please reinstall Node.js"
    exit 1
fi

echo "✅ npm is installed"
npm --version

echo ""
echo "============================================================="
echo "Step 1: Setting up Backend"
echo "============================================================="
echo ""

if [ ! -d "backend" ]; then
    echo "❌ Error: backend folder not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

cd backend

echo "Installing backend dependencies..."
echo "(This may take 1-2 minutes)"

npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend setup failed!"
    exit 1
fi

echo "✅ Backend dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please create a .env file in the backend folder with:"
    echo ""
    echo "NODE_ENV=development"
    echo "PORT=5000"
    echo "SUPABASE_URL=your-supabase-url"
    echo "SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "JWT_SECRET=your-secret-key-min-32-chars"
    echo "FRONTEND_URL=http://localhost:3000"
    echo ""
    echo "See LOCAL_DEVELOPMENT.md for detailed setup"
else
    echo "✅ .env file found"
fi

echo ""
echo "============================================================="
echo "Step 2: Setting up Frontend"
echo "============================================================="
echo ""

cd ..
cd frontend

if [ ! -d "." ]; then
    echo "❌ Error: frontend folder not found!"
    exit 1
fi

echo "Installing frontend dependencies..."
echo "(This may take 2-3 minutes)"

npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend setup failed!"
    exit 1
fi

echo "✅ Frontend dependencies installed"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚠️  .env.local file not found!"
    echo ""
    echo "Please create a .env.local file in the frontend folder with:"
    echo ""
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000"
    echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
    echo "See LOCAL_DEVELOPMENT.md for detailed setup"
else
    echo "✅ .env.local file found"
fi

echo ""
echo "============================================================="
echo "Setup Complete! ✅"
echo "============================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure Backend:"
echo "   - Open backend/.env"
echo "   - Add your Supabase credentials"
echo "   - See LOCAL_DEVELOPMENT.md for details"
echo ""
echo "2. Configure Frontend:"
echo "   - Open frontend/.env.local"
echo "   - Add your Supabase credentials"
echo "   - See LOCAL_DEVELOPMENT.md for details"
echo ""
echo "3. Start Backend:"
echo "   - Open terminal"
echo "   - Run: cd backend"
echo "   - Run: npm run dev"
echo "   - Should see: Backend server running on http://localhost:5000"
echo ""
echo "4. Start Frontend:"
echo "   - Open new terminal"
echo "   - Run: cd frontend"
echo "   - Run: npm run dev"
echo "   - Should see: http://localhost:3000"
echo ""
echo "5. Open Browser:"
echo "   - Go to http://localhost:3000"
echo "   - Login with demo credentials (see LOCAL_DEVELOPMENT.md)"
echo ""
echo "Documentation:"
echo "- Quick Setup: LOCAL_DEVELOPMENT.md"
echo "- Testing: LOCALHOST_TESTING.md"
echo "- AI Features: AI_INTEGRATION.md"
echo "- API Docs: docs/API_DOCUMENTATION.md"
echo ""
echo "For help, see: COMPREHENSIVE_GUIDE.md"
echo ""
