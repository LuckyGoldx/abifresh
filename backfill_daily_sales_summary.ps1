
# Backfill daily_sales_summary from receipts + sales data
param()
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env_content = Get-Content "$ScriptDir\backend\.env"
$SUPABASE_URL = ($env_content | Where-Object { $_ -match "^SUPABASE_URL=" }) -replace "SUPABASE_URL=", ""
$SERVICE_KEY  = ($env_content | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=", ""
$h  = @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY" }
$uh = @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json"; Prefer = "resolution=merge-duplicates,return=representation" }

Write-Host "=== BACKFILL daily_sales_summary ===" -ForegroundColor Cyan

$receipts = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/receipts?select=staff_id,total_amount,items_count,created_at" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "[1] Fetched $($receipts.Count) receipts"

$sales = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/sales?select=staff_id,total_amount,created_at" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "[2] Fetched $($sales.Count) sales"

$all = @()
foreach ($r in $receipts) {
    $ic = if ($r.items_count) { [int]$r.items_count } else { 1 }
    $dateStr = ($r.created_at -split "T")[0]
    $sid = if ($r.staff_id) { [string]$r.staff_id } else { "unknown" }
    $all += [PSCustomObject]@{ staff_id = $sid; total_amount = [double]$r.total_amount; items_count = $ic; date = $dateStr }
}
foreach ($s in $sales) {
    $dateStr = ($s.created_at -split "T")[0]
    $sid = if ($s.staff_id) { [string]$s.staff_id } else { "unknown" }
    $all += [PSCustomObject]@{ staff_id = $sid; total_amount = [double]$s.total_amount; items_count = 1; date = $dateStr }
}
Write-Host "[3] Total transaction rows: $($all.Count)"

$summaryMap = @{}
foreach ($item in $all) {
    $sid = $item.staff_id.Trim()
    $dt  = $item.date.Trim()
    $key = $sid + "|" + $dt
    if (-not $summaryMap.ContainsKey($key)) {
        $summaryMap[$key] = @{ sid = $sid; dt = $dt; items = 0; revenue = 0.0; txns = 0 }
    }
    $summaryMap[$key].items   += [int]$item.items_count
    $summaryMap[$key].revenue += [double]$item.total_amount
    $summaryMap[$key].txns    += 1
}

$rows = @($summaryMap.GetEnumerator() | ForEach-Object {
    [PSCustomObject]@{
        salesperson_id         = $_.Value.sid
        sale_date              = $_.Value.dt
        total_items_sold       = [int]$_.Value.items
        total_revenue          = [Math]::Round($_.Value.revenue, 2)
        number_of_transactions = [int]$_.Value.txns
    }
} | Sort-Object sale_date, salesperson_id)

Write-Host "[4] Grouped into $($rows.Count) unique daily summary rows"
$rows | Format-Table -AutoSize

$body = $rows | ConvertTo-Json -Depth 5
if ($rows.Count -eq 1) { $body = "[$body]" }
Write-Host "[5] First row: $(($rows[0] | ConvertTo-Json -Compress))"

$upsertUrl = $SUPABASE_URL + "/rest/v1/daily_sales_summary?on_conflict=salesperson_id,sale_date"
try {
    $resp = Invoke-WebRequest $upsertUrl -Method POST -Headers $uh -Body $body -UseBasicParsing
    $inserted = $resp.Content | ConvertFrom-Json
    Write-Host "[5] OK: $($inserted.Count) rows upserted" -ForegroundColor Green
} catch {
    Write-Host "[5] FAIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Body: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

$final = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/daily_sales_summary?select=*" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "[6] daily_sales_summary now has $($final.Count) rows" -ForegroundColor Green