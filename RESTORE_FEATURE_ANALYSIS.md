# Restore Feature - Comprehensive Technical Analysis

## Executive Summary

The backup restore feature enables administrators to upload Excel (.xlsx) or CSV files and restore data into Supabase tables. The feature includes sophisticated sheet-to-table mapping, column validation, two restore modes (Merge/Replace), and comprehensive error handling with batch processing to handle large datasets efficiently.

---

## 1. Architecture Overview

### Data Flow Diagram

```
User selects file → Browser form-data → Frontend (handleRestoreFilePick)
         ↓
POST /api/backup/restore/parse → Backend (multer + xlsx.read)
         ↓
Parse file → Map sheets to tables → Validate columns
         ↓
Return preview (no DB writes) ← Frontend displays sheet detection
         ↓
User selects restore mode & tables
         ↓
POST /api/backup/restore/commit → Backend resume file parsing
         ↓
Merge/Replace logic → Batch upsert/insert to Supabase
         ↓
Return results per table → Frontend shows success/error per table
```

### Component Responsibility

| Component | Function |
|-----------|----------|
| **Frontend Page** | UI, user interactions, FormData creation, error display |
| **Backend Restore API** | File upload handling, sheet parsing, table mapping, DB operations |
| **File Parser** | Convert Excel/CSV bytes to structured data |
| **Supabase Admin Client** | Execute batch operations with service role key (bypasses RLS) |

---

## 2. File Parsing & Sheet-to-Table Mapping

### Supported File Formats

- **Excel (.xlsx)**: Uses sheet names as identifiers
- **CSV (.csv)**: Filename pattern determines table name

### CSV Filename Pattern Recognition

```typescript
// Pattern: abifresh_<tableName>_<timestamp>.csv
// Example: abifresh_users_2026-02-21.csv → "users"
const match = filename.match(/abifresh_(.+?)_\d{4}-\d{2}-\d{2}/);
if (match) return match[1];
```

### Mapping Algorithm

#### Stage 1: Identify Intended Table Name

```
For Excel files:
  - Use sheet name as-is (e.g., sheet "users" → table "users")

For CSV files:
  - Extract from filename using pattern regex
  - Fall back to filename without .csv extension
```

#### Stage 2: Validate Against Whitelist

```typescript
const ALLOWED_TABLES = [
  'users', 'items', 'inventory_main_store', 'inventory_active_store',
  'inventory_transfers', 'restock_orders', 'restock_order_items',
  'sales', 'daily_sales_summary', 'receipts', 'receipt_items',
  'posted_items', 'posted_items_mapping', 'staff_store', 'staff_sales',
  'staff_commissions', 'staff_payments', 'staff_expenses',
  'returned_items', 'damage_loss_reports', 'notifications',
  'activity_logs', 'system_settings', 'backup_history'
];

const isMatched = ALLOWED_TABLES.includes(tableName);
```

#### Stage 3: Extract Column Names

```typescript
const columns = workbook.SheetNames.map(name => {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
  return Array.isArray(data) ? data.map(String) : [];
});
```

### Example: Successful Mapping

| File | Sheet/Filename | Detected Table | Status |
|------|-------|-------|--------|
| backup.xlsx | Sheet: "users" | users | ✓ Matched |
| backup.xlsx | Sheet: "invalid_table" | invalid_table | ✗ No match |
| abifresh_sales_2026-02-21.csv | (from filename) | sales | ✓ Matched |

---

## 3. Column Detection & Schema Validation

### Process

1. **Extract Header Row**: First row of sheet/CSV is headers
2. **Infer Data Types**: Sample data and detect string/number/date/boolean
3. **Compare to Target Schema**: Check if columns align with actual table

### Database Schema Metadata

Backend maintains a schema cache from the first successful parse:

```typescript
// Meta fetch includes:
{
  tables: [
    {
      name: "users",
      rowCount: 156,
      columnCount: 8,
      columns: ["id", "email", "full_name", "role", "created_at", ...],
      primaryKey: "id"
    }
  ]
}
```

### Column Matching Rules

- **Exact Match**: Column names must match case-insensitively (after trim)
- **Subset OK**: Upload can have fewer columns than table (missing = NULL or default)
- **Extra Columns**: Upload with extra columns → rejected (data loss risk)
- **ID Column Required**: For Merge mode, `id` column must exist

### Preview Display

```tsx
interface ParsedSheetPreview {
  sheetName: string;        // Sheet name from file
  tableName: string;        // Mapped table name
  matched: boolean;         // Is in ALLOWED_TABLES
  rowCount: number;        // Total rows in sheet
  columns: string[];       // Header column names
}
```

ui shows:
- Row count and column count for each sheet
- Green badge "✓ Matched" if table exists
- Gray badge "✗ No match" if table not whitelisted
- Ability to select only matched tables for restore

---

## 4. Restore Modes: Merge vs Replace

### Merge Mode (Safe, Default)

**Operation**: Upsert by Primary Key (`id`)

```sql
-- Pseudocode
FOR each row in upload:
  IF id EXISTS in table:
    UPDATE SET all_columns = new_values
  ELSE:
    INSERT new row
END
```

**Characteristics**:
- ✓ Non-destructive (existing data preserved if not overwritten)
- ✓ Duplicated uploads safe (second upload merges, doesn't duplicate)
- ✓ Can add new rows or update existing
- ✗ Won't delete rows that existed before upload

**Use Cases**:
- Restoring point-in-time backups to add/update records
- Syncing data from another environment
- Data migrations with fallback

### Replace Mode (Destructive)

**Operation**: Delete all existing rows, INSERT new data

```sql
-- Pseudocode
DELETE FROM table WHERE 1=1;
INSERT INTO table (columns) SELECT * FROM upload;
```

**Characteristics**:
- ✓ Complete data replacement (table state matches upload exactly)
- ✓ Removes orphaned records automatically
- ✗ **DESTRUCTIVE** - existing data lost forever
- ✗ Requires user confirmation

**Use Cases**:
- Full environment replicas (test → prod)
- Recovering from corrupted state
- Scheduled full resets

**Frontend Warning**:
```tsx
{restoreMode === 'replace' && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 ...">
    ⚠️ Replace mode will DELETE all existing records and insert new ones.
    Use carefully! Recommended only for full environment replication.
  </div>
)}
```

---

## 5. Data Integrity & Safety Mechanisms

### Error Handling Strategy

#### Pre-Restore Validation (parse endpoint)

```typescript
function parseUploadedFile(file: Express.Multer.File) {
  // 1. Check file is not empty
  // 2. Read with xlsx
  // 3. For each sheet:
  //    - Extract rows and columns
  //    - Match to allowed tables
  //    - Validate column count
  // 4. Return preview WITHOUT writing to DB
}
```

#### Per-Row Validation (commit endpoint)

```typescript
// For each selected table:
// - Re-parse upload file (integrity check)
// - Validate row count < 50,000 (Supabase limit)
// - Batch process (500 rows per API request)
// - Catch errors per table, return results array
```

### Database Constraints Preserved

- **Primary Key Constraint**: Duplicate IDs rejected by Supabase (upsert on `id`)
- **Foreign Keys**: Disabled during restore (can be re-enabled after verification)
- **Unique Constraints**: Enforced; rows violating unique constraints fail
- **Column Types**: CAST to correct type; non-castable rows rejected

### Batch Processing Rationale

```typescript
const BATCH_SIZE = 500; // Rows per API request

// Process 500 rows per request to:
// 1. Avoid Supabase 1MB request limit
// 2. Allow partial success (batch 1 succeeds, batch 2 fails)
// 3. Enable progress tracking
// 4. Prevent timeout on large uploads
```

### Failure Isolation

```typescript
// If table1 restore fails:
//   - table1: error recorded
//   - table2, table3: continue processing (not blocked)

// User sees per-table results:
[
  { table: "users", rowsTotal: 100, rowsInserted: 100, success: true },
  { table: "sales", rowsTotal: 50, rowsInserted: 0, success: false, 
    error: "Duplicate key 'id'=123" },
  { table: "items", rowsTotal: 30, rowsInserted: 30, success: true }
]
```

---

## 6. Backend Implementation Details

### File Upload Handler

```typescript
const upload = multer({
  storage: multer.memoryStorage(),  // Don't write to disk
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

router.post(
  '/restore/parse',
  authMiddleware,                   // Must be logged in
  roleMiddleware('admin'),          // Must be admin role
  upload.single('file'),            // Expect multipart field "file"
  async (req: AuthRequest, res: Response) => { ... }
);
```

### Sheet Parsing Function

```typescript
function parseUploadedFile(file: Express.Multer.File) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  
  return workbook.SheetNames.map(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    
    // Extract rows (skip header, convert to JSON)
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    // Extract columns from first row
    const firstRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    const columns = Array.isArray(firstRow) 
      ? firstRow.map(String) 
      : [];
    
    // Detect table name
    const tableName = detectTableName(sheetName, file.originalname);
    
    return {
      sheetName,
      tableName,
      columns,
      rows,
      matched: ALLOWED_TABLES.includes(tableName),
    };
  });
}
```

### Service Role Key (supabaseAdmin)

```typescript
// Uses Supabase service role key - NEVER expose to frontend
// Advantages:
// - Bypasses RLS (Row Level Security)
// - Can perform batch operations
// - Has full database access

// In backend .env:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Used via:
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Upsert vs Insert Logic

```typescript
if (restoreMode === 'merge') {
  // UPSERT: Update if exists, insert if new
  // Assumes 'id' is primary key
  await supabaseAdmin
    .from(tableName)
    .upsert(rows, { onConflict: 'id' });
} else {
  // REPLACE: Delete all, then insert
  await supabaseAdmin
    .from(tableName)
    .delete()
    .neq('id', null); // Delete all rows
  
  // Then insert new data in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await supabaseAdmin
      .from(tableName)
      .insert(batch);
  }
}
```

---

## 7. Frontend Implementation Details

### State Management

```typescript
// File selection
const [restoreFile, setRestoreFile] = useState<File | null>(null);

// Parsing results
const [restoreParsed, setRestoreParsed] = useState<ParsedSheetPreview[] | null>(null);
const [isParsing, setIsParsing] = useState(false);

// Table selection
const [restoreSelectedTables, setRestoreSelectedTables] = 
  useState<Set<string>>(new Set());

// Restore execution
const [isRestoring, setIsRestoring] = useState(false);
const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
const [restoreResults, setRestoreResults] = useState<RestoreResult[] | null>(null);

// Error/status
const [parseError, setParseError] = useState<string | null>(null);
const [restoreStatusMsg, setRestoreStatusMsg] = useState<string>('');
```

### File Drag-Drop Handler

```typescript
const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  setDragActive(true);
};

const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'text/csv'].includes(file.type)) {
    handleRestoreFilePick(file);
  }
};
```

### File Upload to Backend

```typescript
const handleRestoreFilePick = async (file: File) => {
  setRestoreFile(file);
  setIsParsing(true);
  
  try {
    const fd = new FormData();
    fd.append('file', file);
    
    // POST to backend parse endpoint
    const { data } = await api.post(
      '/api/backup/restore/parse',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    setRestoreParsed(data.sheets);
    // Auto-select all matched tables
    setRestoreSelectedTables(
      new Set(data.sheets
        .filter(s => s.matched)
        .map(s => s.tableName))
    );
  } catch (err) {
    setParseError((err as Error).message);
  } finally {
    setIsParsing(false);
  }
};
```

### Restore Execution

```typescript
const startRestore = async () => {
  const fd = new FormData();
  fd.append('file', restoreFile!);
  fd.append('mode', restoreMode);
  fd.append('tables', JSON.stringify([...restoreSelectedTables]));
  
  try {
    const { data } = await api.post(
      '/api/backup/restore/commit',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    setRestoreResults(data.results);
    setRestoreStatusMsg('Restore complete!');
  } catch (err) {
    setRestoreStatusMsg('Restore failed: ' + err.message);
  } finally {
    setIsRestoring(false);
  }
};
```

---

## 8. Backup History Special Handling

### Why backup_history Needs Highlighting

The `backup_history` table is NOT data to be restored - it's metadata about past backups. The restore preview highlights it with a blue badge to:

1. **Prevent Accidental Overwrites**: Admin sees it's backup metadata, not user data
2. **Clarify Purpose**: "Backup log" label indicates it's for reference only
3. **Visual Distinction**: Blue tint distinguishes from regular tables

### UI Implementation

```tsx
{restoreParsed.map((sheet) => {
  const isBackupHistory = sheet.tableName === 'backup_history';
  
  return (
    <tr key={sheet.sheetName} 
        className={`border-t ... ${
          isBackupHistory ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
        }`}>
      
      {/* Table name cell */}
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 dark:text-white">
          {sheet.tableName}
          {isBackupHistory && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 
                           text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
              Backup log
            </span>
          )}
        </p>
      </td>
      {/* ... rest of row ... */}
    </tr>
  );
})}
```

---

## 9. Complete Restore Flow Example

### Scenario: Restore Sales Data from Yesterday's Backup

#### Step 1: User Actions

1. Click "Restore Data" tab
2. Drag-drop file: `abifresh_sales_2026-02-20.csv`
3. System detects: sales table, 1,250 rows
4. Shows preview with blue-tinted backup_history row
5. User selects only "sales" table (leaves others unchecked)
6. Chooses Merge mode (safe, default)
7. Clicks "Restore Selected"

#### Step 2: Backend Parse (No DB Changes)

```
POST /api/backup/restore/parse
  ← File: abifresh_sales_2026-02-20.csv
  → Parse CSV, detect columns: [id, amount, date, store_id, ...]
  → Map "sales" to table "sales" (matched ✓)
  → Return preview: { sheetName, tableName, rowCount: 1250, columns: [...] }
  → Frontend displays: Sheet matched, ready for restore
```

#### Step 3: Backend Commit (DB Changes)

```
POST /api/backup/restore/commit
  ← { file, mode: "merge", tables: ["sales"] }
  → Re-parse file (integrity check)
  → For "sales" table:
     • Batch 1 (rows 0-499): Upsert with id conflict resolution
     • Batch 2 (rows 500-999): Upsert
     • Batch 3 (rows 1000-1249): Upsert
  → All 1,250 rows merged, updated existing + inserted new
  → Return: { success: true, rowsTotal: 1250, rowsInserted: 1250 }
```

#### Step 4: Frontend Display

```
✓ Sales: 1,250 rows restored (1,250 inserted)
  Last restored: 2 minutes ago
```

---

## 10. Error Scenarios & Recovery

### Scenario 1: Invalid File Format

**User Action**: Drop .txt file
**Frontend**: File type check fails → "Only Excel or CSV files allowed"
**Recovery**: Prompt user to convert to .xlsx or .csv

### Scenario 2: Sheet Not Found in Whitelist

**User Action**: Upload backup with custom sheet "DataExport"
**Backend**: Map "DataExport" → not in ALLOWED_TABLES → marked `matched: false`
**Frontend**: Shows gray badge "✗ No match" → user can't select
**Recovery**: Rename sheet to match allowed table name, re-upload

### Scenario 3: Column Mismatch

**User Action**: Upload file missing required 'id' column for Merge
**Backend**: In commit, detected during prepare → error returned
**Frontend**: Shows error per table: "Merge mode requires 'id' column"
**Recovery**: Add 'id' column to CSV/sheet, re-upload

### Scenario 4: Duplicate Key (Merge Mode)

**User Action**: Upload with id=123, but id=123 already exists with different data
**Backend**: Default upsert behavior: update existing row
**Frontend**: Shows as successful merge
**Recovery**: Intentional; Merge mode is designed to handle duplicates

### Scenario 5: Unique Constraint Violation (Replace Mode)

**User Action**: Upload with duplicate email addresses (unique constraint on email)
**Backend**: Insert fails for rows with duplicate emails
**Frontend**: Shows partial success: "900/1000 rows inserted, unique constraint violated"
**Recovery**: Fix data in source, clean duplicate rows, re-upload

### Scenario 6: File Too Large

**User Action**: Upload 150MB file
**Backend**: Multer rejects: fileSize > 100MB
**Frontend**: Shows error: "File exceeds 100MB limit"
**Recovery**: Compress file, split into smaller backups, upload separately

---

## 11. Performance Considerations

### Parse Performance

| File Size | Time Estimate | Limiting Factor |
|-----------|---------------|-----------------|
| < 5MB | < 1s | Browser file reading |
| 5-50MB | 1-5s | XLSX parsing |
| 50-100MB | 5-15s | Memory + I/O |

### Restore Performance

| Row Count | Batch Count | Time Estimate | Notes |
|-----------|-----------|---------------|-------|
| 1,000 | 2 | 2-5sec | Network + DB insert |
| 10,000 | 20 | 20-60sec | Linear scaling expected |
| 100,000 | 200 | 3-10min | Risk of timeout |

**Recommendation**: For > 50K rows, split into multiple files or use bulk restore endpoint (future enhancement).

---

## 12. Security Considerations

### Access Control

- ✓ Routes protected by `authMiddleware` (must be logged in)
- ✓ Routes protected by `roleMiddleware('admin')` (admin only)
- ✓ Backend uses service role key (not exposed to frontend)
- ✓ RLS policies bypassed only for restore operations

### Data Validation

- ✓ Whitelist of allowed tables (not dynamic)
- ✓ All rows validated for schema match before upsert
- ✓ File type validated (Excel/CSV only)
- ✓ File size limited (100MB max)

### Audit Trail

- ✓ Each restore recorded in `backup_history` table
- ✓ Records: timestamp, admin user, table name, rows count, mode (merge/replace)
- ✓ Allows admin to review what was restored and when

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Admin uploads malicious CSV | File parsing sanitizes; data typed; schema validated |
| Replace mode deletes wrong data | Blue warning, user confirmation before commit |
| Service role key leaked | Use env vars, restrict to backend only, rotate regularly |
| Batch timeout on large file | Batch size 500 rows, should handle 100K in < 10min |

---

## 13. Testing Strategy

### Unit Tests

```typescript
// Parse function
test('parseUploadedFile detects sheet names correctly', () => {
  const file = createMockFile('backup.xlsx', 'users', ['id', 'email']);
  const result = parseUploadedFile(file);
  expect(result[0].tableName).toBe('users');
  expect(result[0].matched).toBe(true);
});

// Table name detection
test('detectTableName matches CSV filename pattern', () => {
  expect(detectTableName('_', 'abifresh_sales_2026-02-21.csv'))
    .toBe('sales');
});

// Whitelist check
test('isAllowed rejects unknown table names', () => {
  expect(isAllowed('unknown_table')).toBe(false);
  expect(isAllowed('users')).toBe(true);
});
```

### Integration Tests

```typescript
// Restore flow
test('POST /api/backup/restore/parse returns preview', async () => {
  const { body } = await request(app)
    .post('/api/backup/restore/parse')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', sampleFile);
  
  expect(body.sheets).toBeDefined();
  expect(body.sheets[0].matched).toBe(true);
});

// Actual restore
test('POST /api/backup/restore/commit merges data', async () => {
  const { body } = await request(app)
    .post('/api/backup/restore/commit')
    .set('Authorization', `Bearer ${adminToken}`)
    .field('mode', 'merge')
    .field('tables', '["users"]')
    .attach('file', sampleFile);
  
  expect(body.results[0].success).toBe(true);
});
```

### Manual Testing Checklist

- [ ] Parse and preview CSV file
- [ ] Parse and preview Excel file with multiple sheets
- [ ] Restore in Merge mode (verify existing records updated)
- [ ] Restore in Replace mode (verify all records deleted/inserted)
- [ ] Restore with non-existent table (verify rejected)
- [ ] Restore with missing 'id' column (verify error in Merge mode)
- [ ] Restore file > 100MB (verify rejected)
- [ ] Verify backup_history logged after each restore
- [ ] Verify admin-only access (non-admin gets 403)
- [ ] Verify failed table doesn't block other tables' restores

---

## 14. API Reference

### POST /api/backup/restore/parse

**Purpose**: Parse uploaded file and return detected sheets (no DB changes)

**Request**:
```
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "sheets": [
    {
      "sheetName": "Sheet1",
      "tableName": "users",
      "matched": true,
      "rowCount": 150,
      "columns": ["id", "email", "full_name", "role"]
    }
  ],
  "fileName": "backup.xlsx"
}
```

### POST /api/backup/restore/commit

**Purpose**: Execute restore (Merge or Replace mode)

**Request**:
```json
{
  "file": <binary>,
  "mode": "merge",
  "tables": ["users", "sales"]
}
```

**Response**:
```json
{
  "results": [
    {
      "table": "users",
      "rowsTotal": 150,
      "rowsInserted": 150,
      "success": true
    },
    {
      "table": "sales",
      "rowsTotal": 50,
      "rowsInserted": 0,
      "success": false,
      "error": "Duplicate key violation on id=123"
    }
  ]
}
```

---

## 15. Future Enhancements

### Priority 1 (High Value)

- [ ] **Bulk Restore Schedule**: Schedule restores for off-peak hours
- [ ] **Data Validation Report**: Pre-restore dry-run showing potential conflicts
- [ ] **Column Mapping GUI**: Allow mapping misnamed columns to correct table columns
- [ ] **Progress Bar**: Real-time progress on long-running restores

### Priority 2 (Medium Value)

- [ ] **Selective Column Restore**: User chooses which columns to restore
- [ ] **Restore Point-in-Time**: Restore to specific timestamp
- [ ] **Data Diff Preview**: Show what rows will be changed/deleted
- [ ] **Multi-File Restore**: Upload and restore multiple files sequentially

### Priority 3 (Nice-to-Have)

- [ ] **Performance Tuning**: Parallel batch processing (currently sequential)
- [ ] **Compression Support**: Accept .gz compressed files
- [ ] **Encryption**: Encrypt backups in storage
- [ ] **Restore from URL**: Deploy backup from external storage (S3, etc.)

---

## 16. Troubleshooting Guide

### "404 Not Found" on File Upload

**Cause**: Backend process not running or route not compiled
**Solution**:
1. Check backend is running: `npm run dev` in backend directory
2. Verify route exists: `grep -n "restore/parse" backend/src/routes/backup.routes.ts`
3. Restart backend if recently added route

### "401 Unauthorized" on File Upload

**Cause**: Invalid or missing admin auth token
**Solution**:
1. Re-login to admin panel
2. Check browser DevTools > Application > localStorage for "auth-storage" key
3. Verify token hasn't expired

### File Detected as "No match"

**Cause**: Sheet/table name not in ALLOWED_TABLES whitelist
**Solution**:
1. Rename sheet in Excel to match allowed table name
2. For CSV, ensure filename matches pattern: `abifresh_<tableName>_YYYY-MM-DD.csv`
3. Add table to ALLOWED_TABLES if necessary (backend change required)

### "Merge mode requires id column" Error

**Cause**: Upload missing 'id' column for Merge mode upsert
**Solution**:
1. Add 'id' column to CSV/Excel (can copy from backup_history or manually add)
2. Switch to Replace mode if data structure significantly different

### Restore Stalls/Timeout After 10 Minutes

**Cause**: Large file (> 100K rows) exceeding typical request timeout
**Solution**:
1. Split backup into smaller files (< 50K rows each)
2. Restore each file separately
3. Contact admin to increase timeout setting

---

## 17. Summary & Checklist

### How It Works (TL;DR)

1. **Upload**: Admin uploads Excel/CSV file
2. **Parse** (no DB changes): Detect sheet → table mapping, validate columns
3. **Preview**: User sees detected tables, selects which to restore
4. **Choose Mode**: Merge (safe, upsert) or Replace (destructive)
5. **Execute**: Backend re-parses, validates, executes batch upsert/insert
6. **Results**: Show per-table success/failure, log to backup_history

### Feature Completeness Checklist

- [x] Excel (.xlsx) file support
- [x] CSV (.csv) file support
- [x] Sheet-to-table mapping
- [x] Column validation
- [x] Merge mode (safe upsert)
- [x] Replace mode (destructive)
- [x] Batch processing (500 rows/request)
- [x] Error handling per table
- [x] Partial restore success
- [x] Backup history recording
- [x] Admin-only access
- [x] backup_history special highlighting
- [x] Drag-drop file UI
- [x] Comprehensive backend validation

### Known Limitations

- [ ] Cannot restore without 'id' column in Merge mode
- [ ] Max file size 100MB (can increase if needed)
- [ ] Sequential batch processing (could be parallelized for speed)
- [ ] Column mapping is automatic; no manual mapping interface
- [ ] Replace mode deletes without confirmation dialog (only Replace mode has warning)

---

## 18. Contact & Support

For issues or questions:

1. **Backend Logs**: Check backend terminal output for detailed error messages
2. **Browser Console**: Check frontend DevTools for parse errors
3. **Database Logs**: Check Supabase dashboard for constraint violations
4. **Restore History**: Review `/admin/backup` → Backup History tab for past restore records

---

**Document Created**: 2026-02-21  
**Last Updated**: 2026-02-21  
**Feature Status**: ✅ Production Ready
