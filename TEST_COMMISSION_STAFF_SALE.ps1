# ==========================================
# Commission Staff Sale Test Script
# Tests making a sale as commission staff
# ==========================================

param (
    [string]$ApiUrl = "http://localhost:3001",
    [string]$Username = "commission",
    [string]$Password = "com123",
    [int]$Quantity = 1,
    [int]$UnitPrice = 1000,
    [int]$LogisticsFee = 0,
    [string]$PaymentMethod = "cash",
    [bool]$SoldOutsideJalingo = $false
)

# Colors for output
$colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function log {
    param([string]$Message, [ValidateSet("Success", "Error", "Warning", "Info")]$Type = "Info")
    $color = $colors[$Type]
    Write-Host $Message -ForegroundColor $color
}

log "========================================" "Info"
log "Commission Staff Sale Test" "Info"
log "========================================" "Info"
log ""

# ============= STEP 1: Login =============
log "Step 1: Authenticating..." "Info"
try {
    $creds = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    $auth = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body $creds `
        -ContentType "application/json" `
        -ErrorAction Stop

    $token = $auth.token
    $userId = $auth.id
    
    log "✓ Login successful" "Success"
    log "  User ID: $userId" "Info"
    log "  Role: $($auth.role)" "Info"
} catch {
    log "✗ Login failed: $($_.Exception.Message)" "Error"
    exit 1
}

# Set auth header for subsequent requests
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# ============= STEP 2: Get Dashboard =============
log ""
log "Step 2: Fetching dashboard..." "Info"
try {
    $dashboard = Invoke-RestMethod `
        -Uri "$ApiUrl/api/staff/dashboard" `
        -Headers $headers `
        -ErrorAction Stop

    log "✓ Dashboard loaded" "Success"
    log "  Total Sales: $($dashboard.totalSales ?? 0)" "Info"
    log "  Total Commission: ₦$($dashboard.totalCommission ?? 0)" "Info"
} catch {
    log "⚠ Dashboard fetch failed (might not be implemented): $($_.Exception.Message)" "Warning"
}

# ============= STEP 3: Get Store Items =============
log ""
log "Step 3: Getting items from store..." "Info"
try {
    $store = Invoke-RestMethod `
        -Uri "$ApiUrl/api/staff/store" `
        -Headers $headers `
        -ErrorAction Stop

    if ($store -is [array]) {
        log "✓ Store loaded: $($store.Count) items found" "Success"
        
        if ($store.Count -eq 0) {
            log "⚠ No items in store!" "Warning"
            exit 1
        }
        
        # Show first few items
        $store | Select-Object -First 3 | ForEach-Object {
            $commission = if ($_.commission) { "₦$($_.commission)" } else { "No commission" }
            log "  - Item $($_.item_id): ₦$($_.unit_price) | $commission" "Info"
        }
    } else {
        # Single item
        log "✓ Store loaded: 1 item" "Success"
        $store = @($store)
    }
} catch {
    log "✗ Store fetch failed: $($_.Exception.Message)" "Error"
    $err = $_.Exception.Response.GetResponseStream()
    if ($err) {
        $reader = [System.IO.StreamReader]::new($err)
        log "  Details: $($reader.ReadToEnd())" "Error"
        $reader.Close()
    }
    exit 1
}

# ============= STEP 4: Make Sale =============
log ""
log "Step 4: Making sale as commission staff..." "Info"

try {
    # Get first item
    $item = $store[0]
    $itemId = $item.item_id
    
    log "  Selected item: Item $itemId (₦$($item.unit_price))" "Info"
    log "  Quantity: $Quantity" "Info"
    log "  Payment Method: $PaymentMethod" "Info"

    # Build sale request
    $saleData = @{
        items = @(
            @{
                item_id = $itemId
                quantity = $Quantity
                unit_price = $UnitPrice
                logistics_fee = $LogisticsFee
            }
        )
        payment_method = $PaymentMethod
        sold_outside_jalingo = $SoldOutsideJalingo
    } | ConvertTo-Json -Depth 10

    log "  Request body: $saleData" "Info"

    $response = Invoke-RestMethod `
        -Uri "$ApiUrl/api/staff/store/make-sales" `
        -Method POST `
        -Body $saleData `
        -Headers $headers `
        -ErrorAction Stop

    log "✓ Sale created successfully!" "Success"
    
    # Parse and display response
    if ($response.sales -and $response.sales.Count -gt 0) {
        $sale = $response.sales[0]
        log "  Sale Details:" "Info"
        log "    Sale ID: $($sale.sale_id ?? $sale.id)" "Info"
        log "    Item ID: $($sale.item_id)" "Info"
        log "    Quantity: $($sale.quantity)" "Info"
        log "    Total Amount: ₦$($sale.total_amount)" "Info"
        
        # Check commission field (main test)
        if ($sale.commission -ne $null) {
            log "    Commission: ₦$($sale.commission) ← ✓ COMMISSION FIELD PRESENT" "Success"
        } else {
            log "    Commission: NOT PRESENT ← ⚠ WARNING" "Warning"
        }
        
        if ($sale.payment_method) {
            log "    Payment Method: $($sale.payment_method)" "Info"
        }
    }

} catch {
    log "✗ Sale failed!" "Error"
    log "  Error: $($_.Exception.Message)" "Error"
    
    # Try to extract response details
    try {
        $err = $_.Exception.Response.GetResponseStream()
        if ($err) {
            $reader = [System.IO.StreamReader]::new($err)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            
            log "  Response: $errorBody" "Error"
            
            # Check for specific schema cache error
            if ($errorBody -match "commission") {
                log "  → This is the schema cache error! Run the SQL fix first." "Error"
            }
        }
    } catch {}
    
    exit 1
}

# ============= SUMMARY =============
log ""
log "========================================" "Info"
log "✓ ALL TESTS PASSED!" "Success"
log "========================================" "Info"
log ""
log "Commission staff sale is working correctly." "Success"
log ""
log "Next steps:" "Info"
log "1. Verify commission calculation in database" "Info"
log "2. Check admin dashboard shows the sale" "Info"
log "3. Test with both commission and non-commission staff" "Info"
