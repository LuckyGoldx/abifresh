# Comprehensive Wi-Fi diagnostics
Write-Host "=== WIFI INTERMITTENT ISSUE DIAGNOSTIC ===" -ForegroundColor Cyan

Write-Host "`n1. ADAPTER STATUS:" -ForegroundColor Yellow
Get-NetAdapter -Name "Wi-Fi" -ErrorAction SilentlyContinue | Format-Table Name, Status, AdminStatus, InterfaceDescription

Write-Host "`n2. NETWORK CONNECTION PROFILE:" -ForegroundColor Yellow
Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -eq "Wi-Fi"} | Format-Table Name, NetworkCategory, IPv4Connectivity, IPv6Connectivity

Write-Host "`n3. WIRELESS NETWORKS DETECTED:" -ForegroundColor Yellow
netsh wlan show interfaces

Write-Host "`n4. DEVICE MANAGER - NETWORK ADAPTERS:" -ForegroundColor Yellow
Get-PnpDevice -Class Net | Format-Table Name, Status, InstanceId

Write-Host "`n5. CHECKING FOR DRIVER ISSUES:" -ForegroundColor Yellow
Get-PnpDevice | Where-Object {$_.Name -match "Realtek.*WiFi|IEEE 802.11"} | Format-Table Name, Status, Driver, InstanceId

Write-Host "`n6. NETWORK SERVICES STATUS:" -ForegroundColor Yellow
$services = @("WlanSvc", "dot3svc", "UnistoreSvc_1d1a3", "RasMan", "iphlpsvc", "NlaSvc", "Dhcp")
foreach ($svc in $services) {
    $s = Get-Service $svc -ErrorAction SilentlyContinue
    if ($s) {
        Write-Host "$($s.Name): $($s.Status)" -ForegroundColor $(if($s.Status -eq "Running") {"Green"} else {"Red"})
    }
}

Write-Host "`n7. POWER SETTINGS - CHECK IF ADAPTER GOES TO SLEEP:" -ForegroundColor Yellow
powercfg /devicequery wake_armed

Write-Host "`n8. NETWORK DRIVERS:" -ForegroundColor Yellow
Get-PnpDevice -Class Net | Where-Object {$_.Name -match "Realtek"} | Get-PnpDeviceProperty -Keyname DEVPKEY_Device_DriverVersion 2>$null

Write-Host "`n=== END DIAGNOSTIC ===" -ForegroundColor Cyan
