# FIX: Enable stopped network services causing Wi-Fi display issues
# Run as Administrator

Write-Host "Fixing Wi-Fi intermittent display issue..." -ForegroundColor Green
Write-Host ""

# Services that must be running
$criticalServices = @{
    "dot3svc" = "Wired AutoConfig (802.1X Authentication)"
    "NlaSvc" = "Network Location Awareness"
    "iphlpsvc" = "IP Helper Service"
    "Dhcp" = "DHCP Client"
}

Write-Host "Step 1: Starting critical network services..." -ForegroundColor Cyan
foreach ($svcName in $criticalServices.Keys) {
    try {
        $svc = Get-Service $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            if ($svc.Status -ne "Running") {
                Write-Host "  Starting $svcName..." -NoNewline
                Set-Service -Name $svcName -StartupType Automatic
                Start-Service -Name $svcName -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
                $status = (Get-Service $svcName).Status
                Write-Host " [OK] ($status)" -ForegroundColor Green
            } else {
                Write-Host "  $svcName : Already running [OK]" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  [ERROR] Error with $svcName : $_" -ForegroundColor Red
    }
}

Write-Host "`nStep 2: Restarting Wi-Fi service..." -ForegroundColor Cyan
try {
    Restart-Service -Name "WlanSvc" -Force
    Write-Host "  [OK] WlanSvc restarted" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] $_" -ForegroundColor Red
}

Write-Host "`nStep 3: Clearing network configuration cache..." -ForegroundColor Cyan
try {
    ipconfig /flushdns | Out-Null
    Write-Host "  [OK] DNS cache flushed" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] flushing DNS" -ForegroundColor Red
}

Write-Host "`nStep 4: Resetting network settings..." -ForegroundColor Cyan
try {
    netsh winsock reset catalog | Out-Null
    Write-Host "  [OK] Winsock reset complete" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] $_" -ForegroundColor Red
}

Write-Host "`nStep 5: Checking Wi-Fi adapter power management..." -ForegroundColor Cyan
try {
    Get-NetAdapter -Name "Wi-Fi" | Set-NetAdapterAdvancedProperty -DisplayName "Power Saving Mode" -RegistryValue 0 -ErrorAction SilentlyContinue
    Write-Host "  [OK] Disabled power saving mode on Wi-Fi adapter" -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] Could not modify power settings" -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "[OK] COMPLETE! Your Wi-Fi adapter should now work properly." -ForegroundColor Green
Write-Host "============================================================"
Write-Host ""
Write-Host "IMPORTANT: Please restart your computer for changes to take full effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "Current Status:" -ForegroundColor Cyan
Get-NetAdapter -Name "Wi-Fi" | Format-Table Name, Status, AdminStatus
Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -eq "Wi-Fi"} | Format-Table Name, NetworkCategory, IPv4Connectivity -AutoSize
