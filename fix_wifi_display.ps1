# Run this script as Administrator to fix Wi-Fi display issue
# Right-click on PowerShell and select "Run as Administrator"

Write-Host "Fixing Wi-Fi display issue in Windows 11..." -ForegroundColor Green

# Step 1: Disable and re-enable adapter
Write-Host "`nStep 1: Toggling Wi-Fi adapter..." -ForegroundColor Cyan
try {
    Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
    Write-Host "  ✓ Wi-Fi adapter disabled" -ForegroundColor Green
    Start-Sleep -Seconds 3
    Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false
    Write-Host "  ✓ Wi-Fi adapter re-enabled" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Could not toggle adapter: $_" -ForegroundColor Yellow
}

# Step 2: Restart Wi-Fi services
Write-Host "`nStep 2: Restarting Wi-Fi services..." -ForegroundColor Cyan
try {
    Restart-Service -Name "WlanSvc" -Force
    Write-Host "  ✓ WlanSvc restarted" -ForegroundColor Green
    Restart-Service -Name "dot3svc" -Force
    Write-Host "  ✓ Wired AutoConfig restarted" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error restarting services: $_" -ForegroundColor Yellow
}

# Step 3: Clear network cache
Write-Host "`nStep 3: Clearing network cache..." -ForegroundColor Cyan
try {
    Get-NetRoute | Where-Object {$_.Protocol -eq "Local"} | Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "  ✓ Network cache cleared" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error clearing cache: $_" -ForegroundColor Yellow
}

Write-Host "`n✓ Complete! Your Wi-Fi settings should now be visible." -ForegroundColor Green
Write-Host "  You may need to restart Windows Settings app or reboot your computer." -ForegroundColor Yellow
Write-Host "`nCurrent Wi-Fi Status:" -ForegroundColor Cyan
Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -eq "Wi-Fi"} | Format-Table Name, InterfaceAlias, NetworkCategory, IPv4Connectivity
