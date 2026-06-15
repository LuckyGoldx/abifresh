# 📋 RESTORE SYSTEM - DETAILED WORKFLOW ANALYSIS

## Current Implementation

The existing system has **2 endpoints** for restore operations (`/api/backup/restore/*`)

---

## ENDPOINT 1: `/api/backup/restore/parse` (Preview Only)

**Purpose:** Read the uploaded Excel/CSV file and show what data exists without making any database changes.

**How it works:**
```
1. Accept: multipart form with "file"
2. Parse Excel file using XLSX library
3. For each sheet:
   ├─ Read sheet name
   ├─ Match to database table name (exact match)
   ├─ Count rows
   ├─ Get column names
   └─ Detect columns present
4. Return: Array of sheet metadata (NO actual row data)
```

**Status:** ✅ **Preview is read-only** - no database changes

**Response Example:**
```json
{
  "sheets": [
    {
      "sheetName": "users",
      "tableName": "users",
      "rowCount": 14,
      "columnCount": 8,
      "columns": ["id", "email", "username", "password_hash", "full_name", "phone", "role", "store_location"],
      "matched": true
    },
    {
      "sheetName": "items",
      "tableName": "items",
      "rowCount": 107,
      "columnCount": 12,
      "columns": ["id", "name", "sku", "category", "unit_price", ...],
      "matched": true
    }
  ]
}
```

**Limitations:** ❌
- Does NOT show actual row data (for large files)
- Does NOT validate column names match DB exactly
- Does NOT check for required columns

---

## ENDPOINT 2: `/api/backup/restore/commit` (Execute Restore)

**Purpose:** Actually restore data from Excel into database.

**Request Body (multipart form):**
```
- file: Excel/CSV file
- mode: "replace" | "merge"
- tables: JSON array of table names to restore
```

**Restore Modes:**

### Mode 1: "replace"
```
For each selected table:
  1. DELETE ALL existing rows from table
  2. INSERT fresh rows from Excel
  3. Result: Exact backup data,  no old data remains
```

✅ **Best for:** Clean restore when system is empty or you want complete data replacement

### Mode 2: "merge"  
```
For each selected table:
  1. UPSERT each row (update if exists by ID, insert if new)
  2. Existing data not in backup remains
  3. Result: Backup data overlaid on top of current data
```

✅ **Best for:** Partial restore, adding new records while keeping others

**Column Handling:**
```
If Excel column names don't match DB exactly:
  ├─ ❌ FAIL - Column mismatch error
  └─ Auto-generated columns are stripped (id, created_at, updated_at)
```

**Error Recovery:**
```
If GENERATED ALWAYS column is detected:
  ├─ Auto-detect from error message
  ├─ Strip that column from insert
  ├─ Retry batch insert
  └─ Log warning for future batches
```

**Batch Processing:**
```
Inserts in batches of 500 rows for performance
```

**Response:**
```json
{
  "results": [
    {
      "table": "users",
      "rowsTotal": 14,
      "rowsInserted": 14,
      "success": true
    },
    {
      "table": "items",
      "rowsTotal": 107,
      "rowsInserted": 107,
      "success": true
    }
  ]
}
```

---

## COMPLETE WORKFLOW

### Scenario: System is empty, restore from backup Excel

```
STEP 1: User uploads Excel file
        ↓
STEP 2: Click "/api/backup/restore/parse" (PREVIEW)
        ├─ File is read
        ├─ Shows: "Found 2 sheets: users (14 rows), items (107 rows)"
        ├─ No database changes
        └─ User confirms this matches backup
        ↓
STEP 3: User selects tables to restore
        ├─ Choose: [users, items]
        ├─ Choose mode: "replace" (clear all, insert fresh)
        └─ Submit
        ↓
STEP 4: Call "/api/backup/restore/commit" with:
        ├─ file: Excel
        ├─ mode: "replace"
        ├─ tables: ["users", "items"]
        ↓
STEP 5: Backend processes:
        ├─ Parse Excel again
        ├─ For "users" table:
        │  ├─ DELETE FROM users (clears 0 rows since empty)
        │  ├─ INSERT 14 rows from Excel
        │  ├─ Detect GENERATED columns (id, created_at)
        │  ├─ Strip them, retry if needed
        │  └─ Result: ✅ 14 rows inserted
        │
        ├─ For "items" table:
        │  ├─ DELETE FROM items (clears 0 rows since empty)
        │  ├─ INSERT 107 rows from Excel
        │  └─ Result: ✅ 107 rows inserted
        ↓
STEP 6: Return results:
        {
          "results": [
            {"table": "users", "rowsTotal": 14, "rowsInserted": 14, "success": true},
            {"table": "items", "rowsTotal": 107, "rowsInserted": 107, "success": true}
          ]
        }
        ↓
RESULT: ✅ System now contains EXACT backup data
```

---

## WHAT HAPPENS IF...

### ❌ Excel column names don't match database exactly

**Example:**
```
Excel has: [Username, Product_Name, Unit_Price, ...]
DB expects: [username, name, unit_price, ...]
```

**Result:**
```
INSERT fails on column mismatch
→ Error: "column 'username' not found"
→ Entire table restore fails
→ Returns: {"success": false, "error": "..."}
```

**Current system does NOT handle this** ❌

---

### ✅ Restore to non-empty system (Replace mode)

**Example:** Current system has:
```
users: 14 rows
items: 107 rows
```

Restore backup with users (14 rows), items (200 rows)

**Result:**
```
Step 1: Delete from users → clears 14 rows
Step 2: Insert from backup → adds 14 rows
        
Step 3: Delete from items → clears 107 rows  
Step 4: Insert from backup → adds 200 rows

Final: users (14), items (200) ✅
```

---

### ⚠️ Partial restore (only some tables)

**Request:**
```json
{
  "mode": "replace",
  "tables": ["users", "items"]  // Skip everything else
}
```

**Result:**
```
Only users and items are processed
All other tables remain unchanged
```

---

## LIMITATIONS & GAPS

### 1. No Column Mapping ❌
- Excel column "Product_Name" won't match DB column "name"
- File must have exact column names

### 2. No Data Validation ❌
- No check if required columns exist
- No type validation (varchar, int, uuid, etc.)

### 3. No Preview of Actual Data ❌
- `/parse` endpoint only shows row counts and column names
- No way to see first 5 rows before committing

### 4. No Rollback ❌
- If insert fails halfway, some tables restored but others not
- Can result in inconsistent state

### 5. No FK Constraint Handling ❌
- If backup has old user IDs that references don't match current system
- Will fail with FK constraint violation

### 6. All-or-nothing per table ❌
- If one table fails, you can't retry just that table
- Must re-upload entire file and try again

---

## CURRENT SYSTEM WORKS IF & ONLY IF

✅ **System is empty** (or you don't care about existing data)
✅ **Excel sheet names match table names exactly**
✅ **Excel column names match database column names exactly**
✅ **You only restore one mode per call** (replace or merge, not both)
✅ **No data type mismatches** (all data fits into expected columns)
✅ **No FK constraint violations** (backup IDs match current system)

---

## EXAMPLE: SUCCESSFUL RESTORE

**Current System State:**
```
users: 0 rows
items: 0 rows
system_settings: 3 rows (company config)
```

**Backup Excel File:**
```
Sheet 1 "users":      14 rows, 8 columns
Sheet 2 "items":      107 rows, 12 columns
Sheet 3 "system_settings": 3 rows (skipped in restore)
```

**Test Steps:**

1. **Preview** → `/api/backup/restore/parse`
   ```
   ✅ users: 14 rows
   ✅ items: 107 rows
   ✅ system_settings: 3 rows
   ```

2. **Restore** → `/api/backup/restore/commit` (mode="replace")
   ```
   ✅ users: Cleared 0, inserted 14
   ✅ items: Cleared 0, inserted 107
   ```

3. **Verify** → Check system state
   ```
   users: 14 rows ✅
   items: 107 rows ✅
   system_settings: 3 rows (unchanged) ✅
   ```

**Result:** ✅ **SUCCESS** - Exact backup restored

---

## Summary Table

| Feature | Current System | Works When |
|---------|---|---|
| Parse preview | ✅ Yes | Always |
| Replace mode | ✅ Yes | System empty or doesn't care about old data |
| Merge mode | ✅ Yes | Adding data on top of existing |
| Column name matching | ❌ No | Must be exact |
| Column mapping | ❌ No | Excel→DB names don't auto-map |
| Data preview | ❌ No | Only metadata shown |
| FK constraint mapping | ❌ No | IDs must match |
| Error recovery | ⚠️ Partial | Works for GENERATED columns only |
| Batch processing | ✅ Yes | Works in 500-row batches |

---

## WHEN TO USE

### Use Current System If:
- ✅ Restoring a backup of SAME system (IDs match)
- ✅ System is empty or you want complete replacement
- ✅ Excel file was exported by same app (columns match)
- ✅ You verify preview matches expected data

### Need Better System If:
- ❌ Restoring backup from different system (different user IDs)
- ❌ Need column name mapping (Product_Name → name)
- ❌ Want to see actual row previews before restore
- ❌ Need to merge data intelligently (map by username, not ID)
- ❌ Want automatic FK constraint resolution

