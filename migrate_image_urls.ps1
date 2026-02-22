param()
$env_content = Get-Content "C:\Users\LuckyGold\Desktop\AKV\backend\.env"
$SUPABASE_URL = ($env_content | Where-Object { $_ -match "^SUPABASE_URL=" }) -replace "SUPABASE_URL=", ""
$SERVICE_KEY  = ($env_content | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=", ""
$h = @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json"; Prefer = "return=representation" }

Write-Host "=== MIGRATE image_url: localhost -> Supabase ===" -ForegroundColor Cyan
Write-Host "Supabase URL: $SUPABASE_URL"

$items = (Invoke-WebRequest "$SUPABASE_URL/rest/v1/items?select=id,name,image_url" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$localhostItems = $items | Where-Object { $_.image_url -and ($_.image_url -like "*localhost*" -or $_.image_url -like "*127.0.0.1*") }
Write-Host "Total items: $($items.Count) | Items with localhost image_url: $($localhostItems.Count)"

$updated = 0
$failed = 0
foreach ($item in $localhostItems) {
    $url = $item.image_url
    Write-Host "  Processing: $($item.name) | $url"
    
    # Extract filename from URLs like:
    #   http://localhost:5000/api/inventory/images/FILENAME
    #   /api/inventory/images/FILENAME
    $filename = $url -replace ".*images/", ""
    $filename = $filename.Trim("/").Trim()
    
    if (-not $filename) {
        Write-Host "    SKIP: Could not extract filename" -ForegroundColor Yellow
        continue
    }
    
    # Build the Supabase public URL
    $supabaseUrl = "$SUPABASE_URL/storage/v1/object/public/product-images/products/$filename"
    Write-Host "    New URL: $supabaseUrl" -ForegroundColor Green
    
    # Update the item
    $body = "{`"image_url`": `"$supabaseUrl`"}"
    try {
        $resp = Invoke-WebRequest "$SUPABASE_URL/rest/v1/items?id=eq.$($item.id)" -Method PATCH -Headers $h -Body $body -UseBasicParsing
        Write-Host "    OK ($($resp.StatusCode))" -ForegroundColor Green
        $updated++
    } catch {
        Write-Host "    FAIL: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "=== DONE: $updated updated, $failed failed ===" -ForegroundColor Cyan