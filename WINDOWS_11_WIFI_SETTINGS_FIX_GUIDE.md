# Windows 11 Wi-Fi Settings Disappearing - Complete Fix Guide

## Problem Summary
Wi-Fi option was missing from Windows Settings, even though the laptop was connected to internet via Wi-Fi. The issue appeared intermittently, causing confusion as the network was working but settings weren't visible.

---

## Root Cause Analysis

### What Caused This Issue?
Two critical Windows network services were **disabled or stopped**:

1. **NlaSvc (Network Location Awareness)**
   - Responsible for detecting and identifying network types
   - When disabled, Windows can't recognize Wi-Fi networks properly
   - Prevents Wi-Fi settings from displaying in Settings app

2. **dot3svc (Wired AutoConfig / 802.1X Authentication)**
   - Handles network authentication protocols
   - Manages secure Wi-Fi connections
   - When disabled, Wi-Fi adapter settings become unavailable

### Why Did This Happen?
These services were likely:
- Disabled during security hardening
- Stopped by a Windows update
- Disabled by malware/antivirus cleanup
- Manually disabled previously and never re-enabled

---

## How to Fix (If Problem Recurs)

### Option 1: Quick Fix Script (Recommended)

A PowerShell script has been created to automatically fix this issue.

**File Location:** `C:\Users\LuckyGold\Desktop\AKV\fix_wifi_services.ps1`

**Steps:**
1. Right-click **PowerShell** → Select **"Run as Administrator"**
2. Copy and paste this command:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Users\LuckyGold\Desktop\AKV\fix_wifi_services.ps1"
   ```
3. Press Enter and wait for completion
4. **Restart your computer**

**What the script does:**
- ✅ Enables NlaSvc service (Network Location Awareness)
- ✅ Enables dot3svc service (802.1X Authentication)  
- ✅ Restarts WlanSvc (Wi-Fi Auto Config)
- ✅ Flushes DNS cache
- ✅ Resets Winsock settings
- ✅ Disables power-saving mode on Wi-Fi adapter

---

### Option 2: Manual Fix (If Script Doesn't Work)

#### Step 1: Open Services Management
1. Press **Windows Key + R**
2. Type: `services.msc`
3. Click OK

#### Step 2: Enable NlaSvc
1. Find **"Network Location Awareness"** in the list
2. Right-click → **Properties**
3. Set **Startup type** to **"Automatic"**
4. Click **Start** button
5. Click **OK**

#### Step 3: Enable dot3svc
1. Find **"Wired AutoConfig"** in the list
2. Right-click → **Properties**
3. Set **Startup type** to **"Automatic"**
4. Click **Start** button
5. Click **OK**

#### Step 4: Restart Services
1. Right-click **WLAN AutoConfig (WlanSvc)** → **Restart**
2. Close Services window

#### Step 5: Reset Network Settings
1. Right-click **PowerShell** → **"Run as Administrator"**
2. Run these commands one by one:
   ```powershell
   ipconfig /flushdns
   netsh winsock reset catalog
   netsh int ip reset
   ```
3. **Restart your computer**

---

### Option 3: Using Settings App (Alternative)

If you can access Settings:

1. Go to **Settings** → **Network & Internet** → **Wi-Fi**
2. Toggle Wi-Fi **OFF** then **ON**
3. If that doesn't work, go to **Settings** → **System** → **Recovery**
4. Click **"Reset this PC"** → **"Keep my files"** (performs network reset without data loss)

---

## Prevention Tips

To prevent this issue from happening again:

### 1. **Protect Critical Services**
- Never disable NlaSvc or dot3svc manually
- Avoid "system cleaning" programs that disable services

### 2. **Update Drivers Regularly**
```powershell
# Check for Wi-Fi driver updates
# Use Device Manager or manufacturer's support website
```

### 3. **Monitor Service Status**
Create a monthly check by running this command:
```powershell
Get-Service NlaSvc, dot3svc, WlanSvc | Format-Table Name, Status, StartType
```

All three should show:
- **Status:** Running
- **StartType:** Automatic or AutomaticDelayedStart

### 4. **Whitelist Services in Security Software**
- Don't let antivirus disable NlaSvc or dot3svc
- Add these to your antivirus whitelist if needed

### 5. **Avoid Problematic Utilities**
Be cautious with these tools that may disable network services:
- Old "Windows Optimizer" programs
- Aggressive debloater scripts
- Certain "privacy" tools
- System "cleaners"

---

## Verification

After applying the fix and restarting, verify everything is working:

### Check Service Status
```powershell
# Run in PowerShell (as Admin)
Get-Service NlaSvc, dot3svc, WlanSvc | Format-Table Name, Status
```

Expected output:
```
Name     Status
----     ------
NlaSvc   Running
dot3svc  Running
WlanSvc  Running
```

### Check Wi-Fi Connection
```powershell
Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -eq "Wi-Fi"}
```

Expected output:
```
Name        : [Your Network Name]
NetworkCategory : Public/Private
IPv4Connectivity: Internet
```

---

## Troubleshooting

**Problem:** Settings app still doesn't show Wi-Fi  
**Solution:** Restart your computer completely (not just sleep mode)

**Problem:** Services won't stay enabled  
**Solution:** Check for malware/bloatware - run Windows Defender full scan

**Problem:** Wi-Fi disconnects frequently  
**Solution:** Update WLAN driver from device manufacturer's website

**Problem:** Can't run script as administrator  
**Solution:** 
1. Right-click PowerShell directly (not from Start menu)
2. Select "Run as Administrator" 
3. Click "Yes" on the UAC prompt

---

## Related Files

- **Diagnostic Script:** `wifi_diagnostic.ps1` - Shows detailed Wi-Fi hardware status
- **Fix Script:** `fix_wifi_services.ps1` - Automatically applies all fixes
- **This Guide:** `WINDOWS_11_WIFI_SETTINGS_FIX_GUIDE.md`

---

## When to Seek Help

If the issue persists after following these steps, consider:

1. **Hardware issue:** Wi-Fi adapter malfunction (run diagnostics)
2. **Driver corruption:** Reinstall WLAN driver from manufacturer
3. **Windows corruption:** Run Windows Update or repair installation
4. **Service permission issue:** Check Windows event logs for errors

---

## Summary

**What Fixed It:** Enabled two disabled Windows network services  
**Time to Fix:** ~5 minutes (plus restart)  
**Recurrence Risk:** Very low if following prevention tips  
**Data Loss Risk:** None - only enables services, doesn't modify data
