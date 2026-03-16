# PWA Download Page - Windows Test Script
# Run this in PowerShell to verify all fixes are working
# Usage: .\test-download-page.ps1

Write-Host "🧪 PWA Download Page - Quick Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend API
Write-Host "Test 1: Backend API Check" -ForegroundColor Yellow
Write-Host "Checking if backend is running on port 5000..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Backend is running" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend not responding" -ForegroundColor Red
    Write-Host "  Start backend: cd backend && npm start" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Download Stats API
Write-Host "Test 2: Download Stats API" -ForegroundColor Yellow
Write-Host "Fetching stats from /api/download/stats..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/download/stats" -TimeoutSec 3 -ErrorAction Stop
    $stats = $response.Content | ConvertFrom-Json
    Write-Host "✓ Stats API is working" -ForegroundColor Green
    Write-Host "  Total Downloads: $($stats.totalDownloads)" -ForegroundColor Green
    Write-Host "  Today Downloads: $($stats.todayDownloads)" -ForegroundColor Green
    Write-Host "  Recent Downloads: $($stats.recentDownloads)" -ForegroundColor Green
} catch {
    Write-Host "✗ Stats API not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Frontend
Write-Host "Test 3: Frontend Check" -ForegroundColor Yellow
Write-Host "Checking if frontend is accessible on port 3000..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/download" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Download page is accessible" -ForegroundColor Green
    Write-Host "  Visit: http://localhost:3000/download" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend not responding" -ForegroundColor Red
    Write-Host "  Start frontend: cd frontend && npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Download Tracking
Write-Host "Test 4: Download Tracking" -ForegroundColor Yellow
Write-Host "Testing download tracking endpoint..."

try {
    $body = @{
        platform = "test"
        userAgent = "Test Browser - Windows"
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/download/track" `
        -Method Post `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -TimeoutSec 3 `
        -ErrorAction Stop
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✓ Download tracking is working" -ForegroundColor Green
    Write-Host "  Success: $($result.success)" -ForegroundColor Green
    Write-Host "  Record ID: $($result.id)" -ForegroundColor Green
} catch {
    Write-Host "✗ Download tracking not working" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Yellow
Write-Host "Test Summary" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ All test checks completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000/download in browser" -ForegroundColor White
Write-Host "2. Test scrolling - should work smoothly" -ForegroundColor White
Write-Host "3. Click download button - should prompt install" -ForegroundColor White
Write-Host "4. Check browser console (F12) - should see no errors" -ForegroundColor White
Write-Host "5. Open DevTools Network tab - should see API requests" -ForegroundColor White
Write-Host ""

# Additional info
Write-Host "Database Check:" -ForegroundColor Cyan
Write-Host "Run in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "  SELECT COUNT(*) FROM pwa_downloads;" -ForegroundColor Gray
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor Cyan
Write-Host "• If scrolling doesn't work: Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor Yellow
Write-Host "• If button doesn't respond: Try incognito mode" -ForegroundColor Yellow
Write-Host "• If stats don't load: Check backend is running" -ForegroundColor Yellow
Write-Host ""
