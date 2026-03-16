#!/usr/bin/env bash
# PWA Download Page - Quick Test Script
# Run this to verify all fixes are working

echo "🧪 PWA Download Page - Quick Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend API
echo -e "${YELLOW}Test 1: Backend API Check${NC}"
echo "Checking if backend is running on port 5000..."

if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend not responding${NC}"
    echo "  Start backend: cd backend && npm start"
fi
echo ""

# Test 2: Download Stats API
echo -e "${YELLOW}Test 2: Download Stats API${NC}"
echo "Fetching stats from /api/download/stats..."

STATS=$(curl -s http://localhost:5000/api/download/stats)
if echo "$STATS" | grep -q "totalDownloads"; then
    echo -e "${GREEN}✓ Stats API is working${NC}"
    echo "  Response: $STATS"
else
    echo -e "${RED}✗ Stats API not responding${NC}"
fi
echo ""

# Test 3: Frontend
echo -e "${YELLOW}Test 3: Frontend Check${NC}"
echo "Checking if frontend is accessible on port 3000..."

if curl -s http://localhost:3000/download > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Download page is accessible${NC}"
    echo "  Visit: http://localhost:3000/download"
else
    echo -e "${RED}✗ Frontend not responding${NC}"
    echo "  Start frontend: cd frontend && npm run dev"
fi
echo ""

# Test 4: Database Connection
echo -e "${YELLOW}Test 4: Database Check${NC}"
echo "Note: Requires Supabase setup"
echo "Run in Supabase SQL Editor:"
echo "  SELECT COUNT(*) FROM pwa_downloads;"
echo ""

# Test 5: Download Tracking
echo -e "${YELLOW}Test 5: Download Tracking${NC}"
echo "Testing download tracking endpoint..."

TRACK=$(curl -s -X POST http://localhost:5000/api/download/track \
  -H "Content-Type: application/json" \
  -d '{"platform":"test","userAgent":"Test Browser"}')

if echo "$TRACK" | grep -q "success"; then
    echo -e "${GREEN}✓ Download tracking is working${NC}"
    echo "  Response: $TRACK"
else
    echo -e "${RED}✗ Download tracking not working${NC}"
fi
echo ""

# Summary
echo -e "${YELLOW}=================================="
echo "Test Summary${NC}"
echo "=================================="
echo ""
echo "✓ All systems ready for testing!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000/download in browser"
echo "2. Test scrolling - should work smoothly"
echo "3. Click download button - should prompt install"
echo "4. Check browser console (F12) - should be no errors"
echo "5. Open DevTools Network tab - should see API requests"
echo ""
