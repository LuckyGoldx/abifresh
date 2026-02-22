import { Router, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as XLSX from 'xlsx';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// ── Security: hard-coded whitelist ─────────────────────────────────────────────
const ALLOWED_TABLES = [
  'users',
  'items',
  'inventory_main_store',
  'inventory_active_store',
  'inventory_transfers',
  'restock_orders',
  'restock_order_items',
  'sales',
  'sales_items',
  'daily_sales_summary',
  'receipts',
  'receipt_items',
  'posted_items',
  'staff_store',
  'posted_items_mapping',
  'staff_sales',
  'staff_commissions',
  'staff_payments',
  'staff_expenses',
  'returned_items',
  'damage_loss_reports',
  'notifications',
  'activity_logs',
  'system_settings',
  'backup_history',
];

function isAllowed(name: string): boolean {
  return ALLOWED_TABLES.includes(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/backup/meta
//   Returns { tables: [{ name, rowCount, columnCount, columns }] }
//   Fetches count + one sample row per table in parallel.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/meta',
  authMiddleware,
  roleMiddleware('admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const results = await Promise.all(
        ALLOWED_TABLES.map(async (tableName) => {
          try {
            // Get exact count + a sample row (for column names) in one round-trip
            const { data, error, count } = await supabaseAdmin
              .from(tableName)
              .select('*', { count: 'exact' })
              .limit(1);

            if (error) {
              return {
                name: tableName,
                rowCount: null,
                columnCount: null,
                columns: [] as string[],
                hasError: true,
                errorMessage: error.message,
              };
            }

            const columns: string[] =
              data && data.length > 0 ? Object.keys(data[0]) : [];

            return {
              name: tableName,
              rowCount: count ?? 0,
              columnCount: columns.length,
              columns,
              hasError: false,
            };
          } catch (err: any) {
            return {
              name: tableName,
              rowCount: null,
              columnCount: null,
              columns: [] as string[],
              hasError: true,
              errorMessage: err?.message || 'Unknown error',
            };
          }
        })
      );

      res.json({ tables: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch table metadata' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/backup/table/:name
//   Paginated data for preview.
//   Query params: from (0-based), to (inclusive), orderBy (optional)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/table/:name',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    const { name } = req.params;
    if (!isAllowed(name)) {
      return res.status(403).json({ error: 'Table not in backup whitelist' });
    }

    const fromIdx = parseInt(String(req.query.from ?? '0'), 10);
    const pageSize = parseInt(String(req.query.pageSize ?? '50'), 10);
    const toIdx = fromIdx + pageSize - 1;

    try {
      // Try with created_at ordering first, fall back to no ordering
      let query = supabaseAdmin
        .from(name)
        .select('*', { count: 'exact' })
        .range(fromIdx, toIdx);

      // Only add order if not a table that might not have created_at
      try {
        const { data, error, count } = await query.order('created_at', { ascending: false });
        if (error && error.message.toLowerCase().includes('column')) {
          throw error; // fall through to no-order query
        }
        const rows = (data as Record<string, unknown>[]) ?? [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return res.json({ rows, columns, totalRows: count ?? 0 });
      } catch {
        const { data, error, count } = await supabaseAdmin
          .from(name)
          .select('*', { count: 'exact' })
          .range(fromIdx, toIdx);
        if (error) throw error;
        const rows = (data as Record<string, unknown>[]) ?? [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return res.json({ rows, columns, totalRows: count ?? 0 });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch table data' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/backup/table/:name/all
//   Returns ALL rows from a table (streamed in 1000-row pages internally).
//   Used for CSV/Excel download.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/table/:name/all',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    const { name } = req.params;
    if (!isAllowed(name)) {
      return res.status(403).json({ error: 'Table not in backup whitelist' });
    }

    try {
      const allRows: Record<string, unknown>[] = [];
      const PAGE = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabaseAdmin
          .from(name)
          .select('*')
          .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...(data as Record<string, unknown>[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      res.json({ rows: allRows, totalRows: allRows.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch all rows' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/backup/history
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/history',
  authMiddleware,
  roleMiddleware('admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('backup_history')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      res.json({ history: data ?? [] });
    } catch (error: any) {
      // Return empty array so the page still loads even if table doesn't exist yet
      res.json({ history: [] });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backup/history
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/history',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        tablesCount,
        totalRows,
        format,
        fileName,
        durationMs,
        tableNames,
        status,
        errorMessage,
      } = req.body;

      const { data, error } = await supabaseAdmin
        .from('backup_history')
        .insert({
          triggered_by: req.user?.id ?? null,
          triggered_by_name: req.user?.full_name ?? req.user?.email ?? 'Admin',
          tables_count: tablesCount ?? 0,
          total_rows: totalRows ?? 0,
          format: format ?? 'excel-all',
          file_name: fileName ?? 'unknown',
          duration_ms: durationMs ?? 0,
          table_names: tableNames ?? [],
          status: status ?? 'success',
          error_message: errorMessage ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;
      res.status(201).json({ id: (data as any).id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save backup history' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/backup/history
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/history',
  authMiddleware,
  roleMiddleware('admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const { error } = await supabaseAdmin
        .from('backup_history')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00.000Z');

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to clear backup history' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// RESTORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedSheet {
  sheetName: string;
  tableName: string;
  matched: boolean;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

// ── Columns that are GENERATED ALWAYS AS (computed) and must be stripped ──────
// These columns are auto-calculated by Postgres and cannot be written to.
const GENERATED_ALWAYS_COLUMNS: Record<string, string[]> = {
  staff_store: ['quantity_available'],
  // Add other tables here if they get GENERATED ALWAYS columns in the future
};

/** Strip all known generated columns (and any dynamically discovered ones) from rows */
function stripColumns(rows: Record<string, unknown>[], cols: string[]): Record<string, unknown>[] {
  if (cols.length === 0) return rows;
  return rows.map((row) => {
    const clean = { ...row };
    for (const c of cols) delete clean[c];
    return clean;
  });
}

/**
 * Parse Postgres "cannot insert a non-DEFAULT value into column" error message
 * and return the offending column name, or null if unrecognised.
 */
function parseGeneratedColumnError(msg: string): string | null {
  const m = msg.match(/cannot insert a non-DEFAULT value into column "([^"]+)"/);
  return m?.[1] ?? null;
}

function parseUploadedFile(file: UploadedFile): ParsedSheet[] {
  try {
    console.log('Reading file with XLSX...');
    const wb = XLSX.read(file.data, { type: 'buffer', cellDates: true });
    console.log('✅ File read successfully, sheet names:', wb.SheetNames);

    const isCSV =
      file.mimetype === 'text/csv' ||
      file.name.toLowerCase().endsWith('.csv');

    if (isCSV) {
      const sheetName = wb.SheetNames[0] ?? 'Sheet1';
      const ws = wb.Sheets[sheetName];
      console.log('📄 Processing CSV - sheet:', sheetName);

      const rows = (XLSX.utils.sheet_to_json(ws, { raw: false }) ?? []) as Record<string, unknown>[];
      console.log('📊 Extracted rows:', rows.length);

      // Infer table name from filename: abifresh_{tableName}_{date}.csv
      const match = file.name.match(/abifresh_([a-z0-9_]+)_\d{4}-\d{2}-\d{2}/i);
      const tableName = match?.[1] ?? sheetName;
      const matched = isAllowed(tableName);
      const columns = rows.length ? Object.keys(rows[0]) : [];

      console.log('🏷️  Table mapping:', { filename: file.name, tableName, matched, columns: columns.length });
      return [{ sheetName, tableName, matched, rowCount: rows.length, columns, rows }];
    }

    // Excel: each sheet → one table
    const result = wb.SheetNames.map((sheetName) => {
      console.log('📄 Processing sheet:', sheetName);
      const ws = wb.Sheets[sheetName];
      const rows = (XLSX.utils.sheet_to_json(ws, { raw: false }) ?? []) as Record<string, unknown>[];
      const tableName = sheetName;
      const matched = isAllowed(tableName);
      const columns = rows.length ? Object.keys(rows[0]) : [];

      console.log('🏷️  Sheet mapping:', { sheetName, tableName, matched, rowCount: rows.length, columns: columns.length });
      return { sheetName, tableName, matched, rowCount: rows.length, columns, rows };
    });

    console.log('✅ Parse completed successfully');
    return result;
  } catch (err: any) {
    console.error('❌ Parse error in parseUploadedFile:', {
      message: err.message,
      stack: err.stack,
      type: err.constructor.name,
    });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backup/restore/parse
//   Parses an uploaded Excel or CSV file and returns a preview of what
//   was found, without writing anything to the database.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/restore/parse',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file as UploadedFile;
    try {
      console.log('🔄 Parsing uploaded file:', {
        filename: file.name,
        mimetype: file.mimetype,
        size: file.size,
      });
      const sheets = parseUploadedFile(file);
      console.log('✅ File parsed successfully:', {
        sheetCount: sheets.length,
        sheets: sheets.map(s => ({ sheetName: s.sheetName, tableName: s.tableName, rowCount: s.rowCount })),
      });
      // Don't expose rows in parse response (too large)
      const preview = sheets.map(({ rows, ...rest }) => ({
        ...rest,
        rowCount: rows.length,
      }));
      return res.json({ sheets: preview, fileName: file.name });
    } catch (err: any) {
      console.error('❌ Parse error:', {
        message: err.message,
        stack: err.stack,
        filename: file?.name,
      });
      return res
        .status(400)
        .json({ error: `Failed to parse file: ${err.message}` });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backup/restore/commit
//   Re-parses the uploaded file and writes selected tables to Supabase.
//   Body fields (multipart):
//     file     – the Excel or CSV file
//     mode     – "merge" (upsert) | "replace" (truncate then insert)
//     tables   – JSON array of table names to restore, e.g. '["users","items"]'
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/restore/commit',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file as UploadedFile;

    const mode: 'merge' | 'replace' = req.body.mode === 'replace' ? 'replace' : 'merge';
    let selectedTables: string[] = [];
    try {
      selectedTables = JSON.parse(req.body.tables ?? '[]');
    } catch {
      return res.status(400).json({ error: 'Invalid tables parameter (expected JSON array)' });
    }

    try {
      const sheets = parseUploadedFile(file);
      const results: Array<{
        table: string;
        rowsTotal: number;
        rowsInserted: number;
        success: boolean;
        error?: string;
      }> = [];

      for (const sheet of sheets) {
        if (!sheet.matched) continue;
        if (selectedTables.length > 0 && !selectedTables.includes(sheet.tableName)) continue;

        const tableName = sheet.tableName;
        const rows = sheet.rows;

        try {
          // Build the list of columns to strip for this table
          const generatedCols = [...(GENERATED_ALWAYS_COLUMNS[tableName] ?? [])];

          // ── Replace mode: delete all existing rows first ──────────────────
          if (mode === 'replace') {
            const { error: delErr } = await supabaseAdmin
              .from(tableName)
              .delete()
              .not('id', 'is', null);
            if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
          }

          // ── Insert / upsert in batches of 500 ─────────────────────────────
          const BATCH = 500;
          let rowsInserted = 0;

          for (let i = 0; i < rows.length; i += BATCH) {
            let batch = stripColumns(rows.slice(i, i + BATCH), generatedCols);

            const tryInsert = async (batchRows: Record<string, unknown>[]): Promise<void> => {
              let error: any;
              if (mode === 'merge') {
                ({ error } = await supabaseAdmin
                  .from(tableName)
                  .upsert(batchRows, { onConflict: 'id', ignoreDuplicates: false }));
              } else {
                ({ error } = await supabaseAdmin.from(tableName).insert(batchRows));
              }

              if (error) {
                // Auto-detect generated columns from the error message and retry once
                const dynCol = parseGeneratedColumnError(error.message ?? '');
                if (dynCol && !generatedCols.includes(dynCol)) {
                  console.warn(`⚠️  Detected undeclared GENERATED column "${dynCol}" in table "${tableName}". Stripping and retrying…`);
                  generatedCols.push(dynCol);
                  // Also update GENERATED_ALWAYS_COLUMNS for subsequent batches
                  GENERATED_ALWAYS_COLUMNS[tableName] = generatedCols;
                  const retryRows = stripColumns(batchRows, [dynCol]);
                  return tryInsert(retryRows);
                }
                throw new Error(error.message);
              }
            };

            await tryInsert(batch);
            rowsInserted += batch.length;
          }

          results.push({ table: tableName, rowsTotal: rows.length, rowsInserted, success: true });
        } catch (err: any) {
          results.push({
            table: tableName,
            rowsTotal: rows.length,
            rowsInserted: 0,
            success: false,
            error: err.message,
          });
        }
      }

      return res.json({ results });
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: `Restore failed: ${err.message}` });
    }
  }
);

export default router;
