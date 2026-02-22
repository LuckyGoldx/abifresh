# ============================================================
# staff_store Recovery Script (PowerShell)
# ============================================================
# Run from: C:\Users\LuckyGold\Desktop\AKV\
# Usage: .\recover_staff_store.ps1
# ============================================================

$env_content = Get-Content "$PSScriptRoot\backend\.env"
$SUPABASE_URL = ($env_content | Where-Object { $_ -match "^SUPABASE_URL=" }) -replace "SUPABASE_URL=", ""
$SERVICE_KEY  = ($env_content | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=", ""

$headers = @{
    apikey          = $SERVICE_KEY
    Authorization   = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    Prefer          = "return=minimal"
}

Write-Host "`n=== STAFF STORE RECOVERY ===" -ForegroundColor Cyan
Write-Host "Supabase: $SUPABASE_URL"

# ── 1. Pull accepted posted_items ─────────────────────────────────────────────
Write-Host "`n[1] Fetching accepted posted_items..." -ForegroundColor Yellow
$acceptedItems = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/posted_items?select=id,staff_id,item_id,quantity,poster_id,created_at&status=eq.accepted" -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "    Found $($acceptedItems.Count) accepted items"

if ($acceptedItems.Count -eq 0) {
    Write-Host "No accepted items found. Nothing to recover." -ForegroundColor Red
    exit 0
}

# ── 2. Pull staff_sales for quantity_sold ─────────────────────────────────────
Write-Host "[2] Fetching staff_sales for quantity_sold..." -ForegroundColor Yellow
$staffSales = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/staff_sales?select=staff_id,item_id,quantity" -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "    Found $($staffSales.Count) staff_sales rows"

# ── 3. Group accepted items by (staff_id, item_id) ───────────────────────────
Write-Host "[3] Grouping by (staff_id, item_id)..." -ForegroundColor Yellow
$groups     = $acceptedItems | Group-Object { "$($_.staff_id)|$($_.item_id)" }
$insertRows = @()

foreach ($g in $groups) {
    $parts      = $g.Name.Split("|")
    $staffId    = $parts[0]
    $itemId     = $parts[1]

    $totalQty   = ($g.Group | Measure-Object -Property quantity -Sum).Sum
    $firstItem  = $g.Group | Sort-Object created_at | Select-Object -First 1
    $posterId   = $firstItem.poster_id
    $postedDate = $firstItem.created_at

    $soldQty    = ($staffSales | Where-Object { $_.staff_id -eq $staffId -and $_.item_id -eq $itemId } | Measure-Object -Property quantity -Sum).Sum
    if (-not $soldQty) { $soldQty = 0 }
    $soldQty    = [Math]::Min([int]$soldQty, [int]$totalQty)

    $insertRows += [PSCustomObject]@{
        staff_id       = $staffId
        item_id        = $itemId
        quantity       = [int]$totalQty
        quantity_sold  = [int]$soldQty
        posted_from_id = $posterId
        posted_date    = $postedDate
        last_updated   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
        created_at     = $postedDate
        updated_at     = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    }

    Write-Host "    Group: staff=${staffId.Substring(0,8)}... item=${itemId.Substring(0,8)}... qty=$totalQty sold=$soldQty"
}

Write-Host "    Total groups: $($insertRows.Count)"

# ── 4. Insert into staff_store ────────────────────────────────────────────────
Write-Host "[4] Inserting into staff_store (upsert)..." -ForegroundColor Yellow
$body = $insertRows | ConvertTo-Json -Depth 5
if ($insertRows.Count -eq 1) {
    $body = "[$body]"
}

$upsertHeaders = @{
    apikey          = $SERVICE_KEY
    Authorization   = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    Prefer          = "resolution=merge-duplicates,return=representation"
}

try {
    $resp = Invoke-WebRequest "$SUPABASE_URL/rest/v1/staff_store" -Method POST -Headers $upsertHeaders -Body $body -UseBasicParsing
    $inserted = $resp.Content | ConvertFrom-Json
    Write-Host "    ✅ Inserted/updated $($inserted.Count) staff_store rows" -ForegroundColor Green
    $inserted | ForEach-Object {
        Write-Host "       id=$($_.id.Substring(0,8))... qty=$($_.quantity) sold=$($_.quantity_sold) avail=$($_.quantity_available)"
    }
} catch {
    Write-Host "    ❌ Insert failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Response: $($_.ErrorDetails.Message)"
    exit 1
}

# ── 5. Re-link posted_items_mapping ──────────────────────────────────────────
Write-Host "[5] Re-linking posted_items_mapping..." -ForegroundColor Yellow

# Fetch newly created staff_store rows
$newStaffStore = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/staff_store?select=id,staff_id,item_id" -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "    staff_store now has $($newStaffStore.Count) rows"

# Fetch all mapping rows with NULL staff_store_id plus their posted_item_id
$nullMappings = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/posted_items_mapping?select=id,posted_item_id&staff_store_id=is.null" -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "    Mapping rows to re-link: $($nullMappings.Count)"

$linked = 0
foreach ($m in $nullMappings) {
    # Find the posted_item
    $pi = $acceptedItems | Where-Object { $_.id -eq $m.posted_item_id } | Select-Object -First 1
    if (-not $pi) { continue }

    # Find the matching staff_store entry
    $ssRow = $newStaffStore | Where-Object { $_.staff_id -eq $pi.staff_id -and $_.item_id -eq $pi.item_id } | Select-Object -First 1
    if (-not $ssRow) { continue }

    # PATCH the mapping row
    $patchBody  = (@{ staff_store_id = $ssRow.id; status = "accepted"; accepted_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") } | ConvertTo-Json)
    $patchH     = @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json" }
    try {
        Invoke-WebRequest "$SUPABASE_URL/rest/v1/posted_items_mapping?id=eq.$($m.id)" -Method PATCH -Headers $patchH -Body $patchBody -UseBasicParsing | Out-Null
        $linked++
    } catch {
        Write-Host "    ⚠️  Could not update mapping $($m.id): $($_.Exception.Message)"
    }
}

Write-Host "    ✅ Re-linked $linked / $($nullMappings.Count) mapping rows" -ForegroundColor Green

# ── 6. Summary ────────────────────────────────────────────────────────────────
Write-Host "`n=== RECOVERY COMPLETE ===" -ForegroundColor Cyan
$finalStore = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/staff_store?select=*" -Headers $headers -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "staff_store rows: $($finalStore.Count)"
if ($finalStore.Count -gt 0) {
    $totalQty   = ($finalStore | Measure-Object -Property quantity -Sum).Sum
    $totalSold  = ($finalStore | Measure-Object -Property quantity_sold -Sum).Sum
    $totalAvail = ($finalStore | Measure-Object -Property quantity_available -Sum).Sum
    Write-Host "  Total assigned : $totalQty"
    Write-Host "  Total sold     : $totalSold"
    Write-Host "  Total available: $totalAvail"
}
