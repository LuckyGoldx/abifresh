'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import {
  Database, Download, Eye, RefreshCw, CheckSquare, Square,
  Archive, Clock, Table, FileText, FileSpreadsheet, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, AlertCircle, AlertTriangle, CheckCircle2,
  Loader2, HardDrive, Rows, Calendar, Package, UploadCloud, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableInfo {
  name: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  rowCount: number | null;
  columnCount: number | null;
  isCountLoading: boolean;
  hasError: boolean;
}

interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  tablesCount: number;
  totalRows: number;
  format: 'excel' | 'csv' | 'excel-all' | 'csv-all';
  fileName: string;
  durationMs: number;
  tableNames: string[];
  status: 'success' | 'error';
  triggeredByName?: string;
}

interface PreviewState {
  tableName: string;
  data: Record<string, unknown>[];
  columns: string[];
  page: number;
  totalRows: number;
  isLoading: boolean;
  error: string | null;
}

interface ParsedSheetPreview {
  sheetName: string;
  tableName: string;
  matched: boolean;
  rowCount: number;
  columns: string[];
}

interface RestoreResult {
  table: string;
  rowsTotal: number;
  rowsInserted: number;
  success: boolean;
  error?: string;
}

// ─── Table Definitions (33 tables incl. backup_history) ──────────────────

const ALL_TABLES: Omit<TableInfo, 'rowCount' | 'columnCount' | 'isCountLoading' | 'hasError'>[] = [
  {
    name: 'users',
    label: 'Users',
    description: 'Core authentication and user management (admin, sales, staff)',
    category: 'Core',
    icon: '👤',
  },
  {
    name: 'items',
    label: 'Items / Products',
    description: 'Product catalog with SKU, pricing and categories',
    category: 'Inventory',
    icon: '📦',
  },
  {
    name: 'inventory_main_store',
    label: 'Inventory – Main Store',
    description: 'Administrator-controlled main warehouse inventory',
    category: 'Inventory',
    icon: '🏭',
  },
  {
    name: 'inventory_active_store',
    label: 'Inventory – Active Store',
    description: 'Active sales-floor inventory accessible to sales staff',
    category: 'Inventory',
    icon: '🏪',
  },
  {
    name: 'inventory_transfers',
    label: 'Inventory Transfers',
    description: 'Track all inventory movement between locations',
    category: 'Inventory',
    icon: '🔄',
  },
  {
    name: 'restock_orders',
    label: 'Restock Orders',
    description: 'Purchase/restock order headers with status and totals',
    category: 'Inventory',
    icon: '🛒',
  },
  {
    name: 'restock_order_items',
    label: 'Restock Order Items',
    description: 'Line items belonging to each restock order',
    category: 'Inventory',
    icon: '📋',
  },
  {
    name: 'sales',
    label: 'Sales Transactions',
    description: 'All individual sales records by salesperson',
    category: 'Sales',
    icon: '💰',
  },
  {
    name: 'sales_items',
    label: 'Sale Line Items',
    description: 'Individual line items linked to each sales transaction',
    category: 'Sales',
    icon: '🧮',
  },
  {
    name: 'daily_sales_summary',
    label: 'Daily Sales Summary',
    description: 'Aggregated daily sales totals per salesperson',
    category: 'Sales',
    icon: '📊',
  },
  {
    name: 'receipts',
    label: 'Receipts',
    description: 'Receipt headers with payment method and total',
    category: 'Sales',
    icon: '🧾',
  },
  {
    name: 'receipt_items',
    label: 'Receipt Items',
    description: 'Individual line items within each receipt',
    category: 'Sales',
    icon: '📝',
  },
  {
    name: 'posted_items',
    label: 'Posted Items',
    description: 'Items posted from sales to commission staff',
    category: 'Staff',
    icon: '📤',
  },
  {
    name: 'posted_items_mapping',
    label: 'Posted Items Mapping',
    description: 'Mapping between posted items and staff store entries',
    category: 'Staff',
    icon: '🗺️',
  },
  {
    name: 'staff_store',
    label: 'Staff Store',
    description: 'Per-staff item inventory (assigned stock)',
    category: 'Staff',
    icon: '🏬',
  },
  {
    name: 'staff_sales',
    label: 'Staff Sales',
    description: 'Sales made by commission staff from their personal store',
    category: 'Staff',
    icon: '🛍️',
  },
  {
    name: 'staff_commissions',
    label: 'Staff Commissions',
    description: 'Commission rate configuration per staff member',
    category: 'Commissions',
    icon: '💵',
  },
  {
    name: 'staff_payments',
    label: 'Staff Payments',
    description: 'Payment requests, approvals, and disbursements',
    category: 'Commissions',
    icon: '💳',
  },
  {
    name: 'staff_expenses',
    label: 'Staff Expenses',
    description: 'Expense submissions with approval workflow',
    category: 'Finance',
    icon: '📑',
  },
  {
    name: 'returned_items',
    label: 'Returned Items',
    description: 'Item return requests between staff members',
    category: 'Staff',
    icon: '↩️',
  },
  {
    name: 'damage_loss_reports',
    label: 'Damage & Loss Reports',
    description: 'Reports of damaged, lost, or expired inventory',
    category: 'Inventory',
    icon: '⚠️',
  },
  {
    name: 'notifications',
    label: 'Notifications',
    description: 'System notifications sent to users',
    category: 'System',
    icon: '🔔',
  },
  {
    name: 'activity_logs',
    label: 'Activity Logs',
    description: 'Full audit trail of all user actions',
    category: 'System',
    icon: '📋',
  },
  {
    name: 'system_settings',
    label: 'System Settings',
    description: 'Application-wide configuration key-value pairs',
    category: 'System',
    icon: '⚙️',
  },
  {
    name: 'creditors',
    label: 'Creditors',
    description: 'Credit customers with contact and outstanding balance',
    category: 'Credit System',
    icon: '👥',
  },
  {
    name: 'credit_sales',
    label: 'Credit Sales',
    description: 'Credit transaction headers with total amount and status',
    category: 'Credit System',
    icon: '📋',
  },
  {
    name: 'credit_sale_items',
    label: 'Credit Sale Items',
    description: 'Individual items within each credit sale with quantity and pricing',
    category: 'Credit System',
    icon: '🧮',
  },
  {
    name: 'credit_store',
    label: 'Credit Store',
    description: 'Items held in credit store with payment status tracking',
    category: 'Credit System',
    icon: '🏬',
  },
  {
    name: 'credit_payments',
    label: 'Credit Payments',
    description: 'Payment records against credit sales with approval workflow',
    category: 'Credit System',
    icon: '💳',
  },
  {
    name: 'credit_payment_items',
    label: 'Credit Payment Items',
    description: 'Item-level allocation of each credit payment',
    category: 'Credit System',
    icon: '📝',
  },
  {
    name: 'credit_activities',
    label: 'Credit Activities',
    description: 'Audit trail of all credit system actions',
    category: 'Credit System',
    icon: '📋',
  },
  {
    name: 'expense_categories',
    label: 'Expense Categories',
    description: 'Expense type categories with role-based scoping',
    category: 'Finance',
    icon: '🏷️',
  },
  {
    name: 'backup_history',
    label: 'Backup History',
    description: 'Log of all backup operations performed by admin users',
    category: 'System',
    icon: '💾',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Core: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Inventory: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Sales: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Staff: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Commissions: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Finance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Credit System': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  System: 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300',
};

const PREVIEW_PAGE_SIZE = 50;
const HISTORY_KEY = 'akv_backup_history';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateStamp(): string {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const escape = (v: unknown): string => {
    const str = v === null || v === undefined ? '' : String(v);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headers.map((h) => escape(h)).join(','), ...rows].join('\n');
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Local-storage helpers (fallback / cache) ────────────────────────────────
function loadHistory(): BackupHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: BackupHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

// ── Backend API helpers ───────────────────────────────────────────────────────
async function loadHistoryFromBackend(): Promise<BackupHistoryEntry[]> {
  try {
    const { data } = await api.get('/api/backup/history');
    const rows: Record<string, unknown>[] = ((data as Record<string, unknown>).history as Record<string, unknown>[]) ?? [];
    return rows.map((row) => ({
      id: row.id as string,
      timestamp: (row.triggered_at as string) ?? (row.created_at as string),
      tablesCount: row.tables_count as number,
      totalRows: row.total_rows as number,
      format: row.format as BackupHistoryEntry['format'],
      fileName: row.file_name as string,
      durationMs: row.duration_ms as number,
      tableNames: Array.isArray(row.table_names)
        ? (row.table_names as string[])
        : JSON.parse((row.table_names as string) ?? '[]'),
      status: row.status as 'success' | 'error',
      triggeredByName: row.triggered_by_name as string | undefined,
    }));
  } catch {
    return [];
  }
}

async function saveHistoryToBackend(
  entry: Omit<BackupHistoryEntry, 'id' | 'timestamp'>
): Promise<string | null> {
  try {
    const { data } = await api.post('/api/backup/history', {
      tablesCount: entry.tablesCount,
      totalRows: entry.totalRows,
      format: entry.format,
      fileName: entry.fileName,
      durationMs: entry.durationMs,
      tableNames: entry.tableNames,
      status: entry.status,
    });
    return (data as Record<string, unknown>)?.id as string ?? null;
  } catch {
    return null;
  }
}

async function fetchAllRowsFromBackend(tableName: string): Promise<Record<string, unknown>[]> {
  try {
    const { data } = await api.get(`/api/backup/table/${tableName}/all`);
    return ((data as Record<string, unknown>).rows as Record<string, unknown>[]) ?? [];
  } catch (err) {
    throw new Error((err as Error).message ?? 'Failed to fetch table data');
  }
}



// ─── Main Component ────────────────────────────────────────────────────────────

export default function BackupPage() {
  const [tables, setTables] = useState<TableInfo[]>(
    ALL_TABLES.map((t) => ({ ...t, rowCount: null, columnCount: null, isCountLoading: true, hasError: false }))
  );
  const [selectedTables, setSelectedTables] = useState<Set<string>>(
    new Set(ALL_TABLES.map((t) => t.name))
  );
  const [activeTab, setActiveTab] = useState<'backup' | 'history' | 'preview' | 'restore'>('backup');
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');
  const [downloadingTable, setDownloadingTable] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ── Restore state ────────────────────────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreParsed, setRestoreParsed] = useState<ParsedSheetPreview[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreSelectedTables, setRestoreSelectedTables] = useState<Set<string>>(new Set());
  const [restoreResults, setRestoreResults] = useState<RestoreResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreStatusMsg, setRestoreStatusMsg] = useState<string>('');
  const [restoreConfirmStep, setRestoreConfirmStep] = useState<0 | 1 | 2>(0); // 0=normal, 1=first confirm, 2=final confirm
  const restoreConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState<0 | 1 | 2>(0); // 0=none, 1=first confirm, 2=second confirm
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openDropdown]);

  // ── Load metadata (row counts + column counts in one API call) ───────────────
  const loadRowCounts = useCallback(async () => {
    setTables((prev) => prev.map((t) => ({ ...t, isCountLoading: true, hasError: false, rowCount: null, columnCount: null })));
    try {
      const { data } = await api.get('/api/backup/meta');
      const metaList: Array<{
        name: string;
        rowCount: number | null;
        columnCount: number | null;
        hasError: boolean;
      }> = data.tables ?? [];
      setTables((prev) =>
        prev.map((t) => {
          const meta = metaList.find((m) => m.name === t.name);
          if (!meta) return { ...t, isCountLoading: false, hasError: true, rowCount: null, columnCount: null };
          return {
            ...t,
            rowCount: meta.rowCount,
            columnCount: meta.columnCount,
            isCountLoading: false,
            hasError: meta.hasError,
          };
        })
      );
    } catch {
      setTables((prev) => prev.map((t) => ({ ...t, isCountLoading: false, hasError: true })));
    }
  }, []);

  useEffect(() => {
    loadRowCounts();
    // Load history from backend; fall back to localStorage, syncing localStorage→DB if needed
    loadHistoryFromBackend().then(async (remoteEntries) => {
      if (remoteEntries.length > 0) {
        // DB has data → use it as source of truth
        setHistory(remoteEntries);
        saveHistory(remoteEntries);
      } else {
        // DB is empty → show localStorage entries immediately
        const localEntries = loadHistory();
        setHistory(localEntries);
        // One-time background sync: push localStorage entries to DB so they're
        // persisted and visible across devices / browser resets.
        if (localEntries.length > 0) {
          void (async () => {
            for (const { id: _id, timestamp: _ts, ...rest } of localEntries.slice(0, 50)) {
              await saveHistoryToBackend(rest);
            }
            // After sync, switch to DB entries (they now have server-assigned IDs)
            const synced = await loadHistoryFromBackend();
            if (synced.length > 0) {
              setHistory(synced);
              saveHistory(synced);
            }
          })();
        }
      }
    });
  }, [loadRowCounts]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleAll = () => {
    const filtered = displayedTables.map((t) => t.name);
    const allSelected = filtered.every((n) => selectedTables.has(n));
    setSelectedTables((prev) => {
      const next = new Set(prev);
      filtered.forEach((n) => (allSelected ? next.delete(n) : next.add(n)));
      return next;
    });
  };

  const toggleTable = (name: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // ── Single-table CSV download ────────────────────────────────────────────────
  const downloadTableCSV = async (tableName: string, tableLabel: string) => {
    setDownloadingTable(tableName);
    const t0 = Date.now();
    try {
      const data = await fetchAllRowsFromBackend(tableName);
      const csv = generateCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const fileName = `abifresh_${tableName}_${getDateStamp()}.csv`;
      downloadBlob(blob, fileName);
      addHistoryEntry({
        tablesCount: 1,
        totalRows: data.length,
        format: 'csv',
        fileName,
        durationMs: Date.now() - t0,
        tableNames: [tableName],
        status: 'success',
      });
    } catch (err) {
      console.error(err);
      addHistoryEntry({
        tablesCount: 1,
        totalRows: 0,
        format: 'csv',
        fileName: `abifresh_${tableName}_${getDateStamp()}.csv`,
        durationMs: Date.now() - t0,
        tableNames: [tableName],
        status: 'error',
      });
    } finally {
      setDownloadingTable(null);
    }
  };

  // ── Single-table Excel download ──────────────────────────────────────────────
  const downloadTableExcel = async (tableName: string, tableLabel: string) => {
    setDownloadingTable(tableName);
    const t0 = Date.now();
    try {
      const data = await fetchAllRowsFromBackend(tableName);
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName.substring(0, 31));
      const fileName = `abifresh_${tableName}_${getDateStamp()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addHistoryEntry({
        tablesCount: 1,
        totalRows: data.length,
        format: 'excel',
        fileName,
        durationMs: Date.now() - t0,
        tableNames: [tableName],
        status: 'success',
      });
    } catch (err) {
      console.error(err);
      addHistoryEntry({
        tablesCount: 1,
        totalRows: 0,
        format: 'excel',
        fileName: `abifresh_${tableName}_${getDateStamp()}.xlsx`,
        durationMs: Date.now() - t0,
        tableNames: [tableName],
        status: 'error',
      });
    } finally {
      setDownloadingTable(null);
    }
  };

  // ── All tables → single Excel (multi-sheet) ──────────────────────────────────
  const downloadAllExcel = async () => {
    if (selectedTables.size === 0) return;
    setIsBulkDownloading(true);
    setBulkProgress(0);
    const t0 = Date.now();
    const tableList = ALL_TABLES.filter((t) => selectedTables.has(t.name));
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    let totalRows = 0;
    let completed = 0;

    for (const tbl of tableList) {
      setBulkStatusMsg(`Fetching ${tbl.label}…`);
      try {
        const data = await fetchAllRowsFromBackend(tbl.name);
        totalRows += data.length;
        const sheetName = tbl.name.substring(0, 31);
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } catch {
        // Add empty sheet with error note
        const ws = XLSX.utils.aoa_to_sheet([['ERROR: Could not fetch data for this table']]);
        XLSX.utils.book_append_sheet(wb, ws, tbl.name.substring(0, 31));
      }
      completed++;
      setBulkProgress(Math.round((completed / tableList.length) * 100));
    }

    // ── Append backup_history as the final sheet ──────────────────────────────
    setBulkStatusMsg('Appending backup history sheet…');
    try {
      const historyRows = await fetchAllRowsFromBackend('backup_history');
      const hws = XLSX.utils.json_to_sheet(historyRows.length ? historyRows : [{}]);
      XLSX.utils.book_append_sheet(wb, hws, 'backup_history');
    } catch {
      // Table doesn't exist yet — skip silently
    }

    const fileName = `abifresh_${getDateStamp()}.xlsx`;
    setBulkStatusMsg('Writing Excel file…');
    XLSX.writeFile(wb, fileName);

    const durationMs = Date.now() - t0;
    addHistoryEntry({
      tablesCount: tableList.length,
      totalRows,
      format: 'excel-all',
      fileName,
      durationMs,
      tableNames: tableList.map((t) => t.name),
      status: 'success',
    });

    setBulkStatusMsg('Done! ✅');
    setTimeout(() => {
      setIsBulkDownloading(false);
      setBulkProgress(0);
      setBulkStatusMsg('');
    }, 2000);
  };

  // ── All tables → separate CSV downloads ─────────────────────────────────────
  const downloadAllCSV = async () => {
    if (selectedTables.size === 0) return;
    setIsBulkDownloading(true);
    setBulkProgress(0);
    const t0 = Date.now();
    const tableList = ALL_TABLES.filter((t) => selectedTables.has(t.name));
    let totalRows = 0;
    let completed = 0;

    for (const tbl of tableList) {
      setBulkStatusMsg(`Downloading CSV: ${tbl.label}…`);
      try {
        const data = await fetchAllRowsFromBackend(tbl.name);
        totalRows += data.length;
        const csv = generateCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const fileName = `abifresh_${tbl.name}_${getDateStamp()}.csv`;
        downloadBlob(blob, fileName);
        // Small delay to avoid browser download flood
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // skip this table
      }
      completed++;
      setBulkProgress(Math.round((completed / tableList.length) * 100));
    }

    const durationMs = Date.now() - t0;
    addHistoryEntry({
      tablesCount: tableList.length,
      totalRows,
      format: 'csv-all',
      fileName: `abifresh_${getDateStamp()}_${tableList.length}tables.csv`,
      durationMs,
      tableNames: tableList.map((t) => t.name),
      status: 'success',
    });

    setBulkStatusMsg('All CSVs downloaded! ✅');
    setTimeout(() => {
      setIsBulkDownloading(false);
      setBulkProgress(0);
      setBulkStatusMsg('');
    }, 2000);
  };

  // ── Preview table ────────────────────────────────────────────────────────────
  const openPreview = async (tableName: string) => {
    setPreview({
      tableName,
      data: [],
      columns: [],
      page: 1,
      totalRows: 0,
      isLoading: true,
      error: null,
    });
    setActiveTab('preview');
    try {
      const { data: resp } = await api.get(`/api/backup/table/${tableName}`, {
        params: { from: 0, pageSize: PREVIEW_PAGE_SIZE },
      });
      const rows: Record<string, unknown>[] = resp.rows ?? [];
      setPreview({
        tableName,
        data: rows,
        columns: resp.columns ?? (rows.length ? Object.keys(rows[0]) : []),
        page: 1,
        totalRows: resp.totalRows ?? 0,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      setPreview((prev) =>
        prev ? { ...prev, isLoading: false, error: (err as Error).message } : null
      );
    }
  };

  const changePage = async (newPage: number) => {
    if (!preview) return;
    setPreview((prev) => (prev ? { ...prev, isLoading: true } : null));
    const from = (newPage - 1) * PREVIEW_PAGE_SIZE;
    try {
      const { data: resp } = await api.get(`/api/backup/table/${preview.tableName}`, {
        params: { from, pageSize: PREVIEW_PAGE_SIZE },
      });
      const rows: Record<string, unknown>[] = resp.rows ?? [];
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              data: rows,
              columns: resp.columns ?? (rows.length ? Object.keys(rows[0]) : prev.columns),
              page: newPage,
              isLoading: false,
              error: null,
            }
          : null
      );
    } catch (err: unknown) {
      setPreview((prev) =>
        prev ? { ...prev, isLoading: false, error: (err as Error).message } : null
      );
    }
  };

  // ── History helpers ──────────────────────────────────────────────────────────
  const addHistoryEntry = async (entry: Omit<BackupHistoryEntry, 'id' | 'timestamp'>) => {
    const localId = crypto.randomUUID();
    const newEntry: BackupHistoryEntry = {
      ...entry,
      id: localId,
      timestamp: new Date().toISOString(),
    };
    // Immediately reflect in UI (optimistic update)
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 200);
      saveHistory(updated);
      return updated;
    });
    // Persist to backend (which writes to Supabase via service role)
    const backendId = await saveHistoryToBackend(entry);
    if (backendId && backendId !== localId) {
      setHistory((prev) => {
        const updated = prev.map((e) => (e.id === localId ? { ...e, id: backendId } : e));
        saveHistory(updated);
        return updated;
      });
    }
  };

  const clearHistory = async () => {
    if (clearHistoryConfirm === 0) {
      setClearHistoryConfirm(1);
      setTimeout(() => setClearHistoryConfirm(0), 5000);
      return;
    }
    if (clearHistoryConfirm === 1) {
      setClearHistoryConfirm(2);
      setTimeout(() => setClearHistoryConfirm(0), 5000);
      return;
    }
    if (clearHistoryConfirm === 2) {
      setHistory([]);
      saveHistory([]);
      setClearHistoryConfirm(0);
      try {
        await api.delete('/api/backup/history');
      } catch {
        // Silently ignore — table may not exist yet
      }
    }
  };

  // ── Restore helpers ───────────────────────────────────────────────────────────
  const handleRestoreFilePick = async (file: File) => {
    setRestoreFile(file);
    setRestoreParsed(null);
    setRestoreResults(null);
    setParseError(null);
    setRestoreSelectedTables(new Set());
    setIsParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/api/backup/restore/parse', fd, {
        headers: { 'Content-Type': undefined },
      });
      const sheets: ParsedSheetPreview[] = data.sheets ?? [];
      setRestoreParsed(sheets);
      // Auto-select all matched tables
      setRestoreSelectedTables(new Set(sheets.filter((s) => s.matched).map((s) => s.tableName)));
    } catch (err: unknown) {
      setParseError((err as Error).message ?? 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  const startRestore = async () => {
    if (!restoreFile || restoreSelectedTables.size === 0) return;
    setRestoreConfirmStep(0);
    if (restoreConfirmTimer.current) clearTimeout(restoreConfirmTimer.current);
    setIsRestoring(true);
    setRestoreResults(null);
    setRestoreStatusMsg('Uploading and restoring…');
    try {
      const fd = new FormData();
      fd.append('file', restoreFile);
      fd.append('mode', restoreMode);
      fd.append('tables', JSON.stringify([...restoreSelectedTables]));
      const { data } = await api.post('/api/backup/restore/commit', fd, {
        headers: { 'Content-Type': undefined },
      });
      setRestoreResults(data.results ?? []);
      setRestoreStatusMsg('Restore complete!');
    } catch (err: unknown) {
      setRestoreStatusMsg('Restore failed: ' + ((err as Error).message ?? 'Unknown error'));
    } finally {
      setIsRestoring(false);
    }
  };

  /** Advances the 3-step confirmation before actually restoring */
  const handleRestoreClick = () => {
    if (restoreConfirmTimer.current) clearTimeout(restoreConfirmTimer.current);
    if (restoreConfirmStep === 0) {
      setRestoreConfirmStep(1);
      restoreConfirmTimer.current = setTimeout(() => setRestoreConfirmStep(0), 10000);
    } else if (restoreConfirmStep === 1) {
      setRestoreConfirmStep(2);
      restoreConfirmTimer.current = setTimeout(() => setRestoreConfirmStep(0), 10000);
    } else {
      // Step 2 → actually run the restore
      startRestore();
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────────
  const categories = ['All', ...Array.from(new Set(ALL_TABLES.map((t) => t.category)))];
  const displayedTables =
    filterCategory === 'All' ? tables : tables.filter((t) => t.category === filterCategory);
  const totalRowCount = tables.reduce((s, t) => s + (t.rowCount ?? 0), 0);
  const totalColumnCount = tables.reduce((s, t) => s + (t.columnCount ?? 0), 0);
  const loadedCount = tables.filter((t) => !t.isCountLoading).length;
  const selectedCount = selectedTables.size;
  const allDisplayedSelected = displayedTables.every((t) => selectedTables.has(t.name));

  const formatBadge = (fmt: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      csv: { label: 'CSV', cls: 'bg-green-100 text-green-700' },
      excel: { label: 'Excel', cls: 'bg-blue-100 text-blue-700' },
      'excel-all': { label: 'Excel (All)', cls: 'bg-blue-100 text-blue-700' },
      'csv-all': { label: 'CSV (All)', cls: 'bg-green-100 text-green-700' },
    };
    const m = map[fmt] ?? { label: fmt, cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.cls}`}>{m.label}</span>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-8 h-8 text-pink-500" />
            Data Backup
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Backup and download your complete data.
          </p>
        </div>
        <button
          onClick={loadRowCounts}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Counts
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Tables</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{ALL_TABLES.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Rows className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Rows</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white break-words">
                {loadedCount === ALL_TABLES.length
                  ? totalRowCount.toLocaleString()
                  : <span className="text-gray-400 text-base">Loading…</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Table className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Columns</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white break-words">
                {loadedCount === ALL_TABLES.length
                  ? totalColumnCount.toLocaleString()
                  : <span className="text-gray-400 text-base">Loading…</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Selected</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{selectedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Backups Done</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white break-words">{history.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
        {([
          { id: 'backup', label: 'Backup Tables', icon: Archive },
          { id: 'history', label: 'Backup History', icon: Clock },
          { id: 'preview', label: 'Table Preview', icon: Eye },
          { id: 'restore', label: 'Restore Data', icon: UploadCloud },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: BACKUP ─────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div>
          {/* Bulk Download Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-pink-500" />
              Bulk Download ({selectedCount} tables selected)
            </h2>

            {isBulkDownloading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>{bulkStatusMsg}</span>
                  <span>{bulkProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-pink-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadAllExcel}
                disabled={isBulkDownloading || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download All as Excel
                <span className="bg-white/20 rounded px-1.5 py-0.5 text-xs">{selectedCount} sheets</span>
              </button>
              <button
                onClick={downloadAllCSV}
                disabled={isBulkDownloading || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow transition-colors"
              >
                <FileText className="w-4 h-4" />
                Download All as CSV
                <span className="bg-white/20 rounded px-1.5 py-0.5 text-xs">{selectedCount} files</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Excel: single <code>abifresh_{getDateStamp()}.xlsx</code> file with one sheet per table
              (includes a <code>backup_history</code> sheet automatically).
              CSV: separate <code>abifresh_&#123;table&#125;_{getDateStamp()}.csv</code> file per table.
            </p>
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  filterCategory === cat
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Table List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="overflow-x-auto">
            <div className="min-w-[760px]">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="flex items-center">
                <button
                  onClick={toggleAll}
                  className="text-gray-400 hover:text-pink-500 transition-colors"
                  title={allDisplayedSelected ? 'Deselect all' : 'Select all'}
                >
                  {allDisplayedSelected
                    ? <CheckSquare className="w-4 h-4 text-pink-500" />
                    : <Square className="w-4 h-4" />}
                </button>
              </div>
              <div>Table</div>
              <div className="text-center min-w-[80px]">Rows</div>
              <div className="text-center min-w-[70px]">Columns</div>
              <div className="text-center min-w-[60px]">Category</div>
              <div className="text-right min-w-[220px]">Actions</div>
            </div>

            {/* Table Rows */}
            {displayedTables.map((table, idx) => {
              const isSelected = selectedTables.has(table.name);
              const isDownloading = downloadingTable === table.name;
              return (
                <div
                  key={table.name}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-5 py-4 transition-colors ${
                    idx % 2 === 0
                      ? 'bg-white dark:bg-slate-800'
                      : 'bg-gray-50/50 dark:bg-slate-800/50'
                  } border-b border-gray-100 dark:border-slate-700/50 last:border-0 ${
                    isSelected ? 'bg-pink-50/30 dark:bg-pink-900/10' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div>
                    <button
                      onClick={() => toggleTable(table.name)}
                      className="text-gray-400 hover:text-pink-500 transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-pink-500" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Table Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{table.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {table.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {table.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden md:block">
                          {table.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row Count */}
                  <div className="text-center min-w-[80px]">
                    {table.isCountLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                    ) : table.hasError ? (
                      <span className="text-red-400 text-xs flex items-center gap-1 justify-center">
                        <AlertCircle className="w-3 h-3" /> N/A
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(table.rowCount ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Column Count */}
                  <div className="text-center min-w-[70px]">
                    {table.isCountLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                    ) : table.columnCount !== null ? (
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {table.columnCount}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="text-center min-w-[80px]">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[table.category]}`}>
                      {table.category}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 min-w-[130px] justify-end">
                    <button
                      onClick={() => openPreview(table.name)}
                      title="Preview data"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    {/* Download dropdown */}
                    <div className="relative" ref={openDropdown === table.name ? dropdownRef : undefined}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === table.name ? null : table.name)}
                        disabled={isDownloading}
                        title="Download"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-400 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openDropdown === table.name && !isDownloading && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                          <button
                            onClick={() => { downloadTableCSV(table.name, table.label); setOpenDropdown(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Download as CSV
                          </button>
                          <div className="border-t border-gray-100 dark:border-slate-700" />
                          <button
                            onClick={() => { downloadTableExcel(table.name, table.label); setOpenDropdown(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Download as Excel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>{/* end min-w-[760px] */}
            </div>{/* end overflow-x-auto */}
          </div>
        </div>
      )}
      {activeTab === 'history' && (
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-500" />
                Backup History
                <span className="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {history.length}
                </span>
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    clearHistoryConfirm === 0
                      ? 'text-red-500 hover:text-red-700'
                      : clearHistoryConfirm === 1
                        ? 'text-orange-500 hover:text-orange-700 animate-pulse'
                        : 'text-red-600 hover:text-red-800 font-bold animate-pulse'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {clearHistoryConfirm === 0
                    ? 'Clear History'
                    : clearHistoryConfirm === 1
                      ? 'Click again to confirm'
                      : 'Click again to permanently delete'}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500">
                <Archive className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No backup history yet.</p>
                <p className="text-xs mt-1">Download a backup to create your first history entry.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50">
                      {['Date & Time', 'By', 'Format', 'Tables', 'Total Rows', 'Duration', 'File Name', 'Status'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={`border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                          idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {formatDateTime(entry.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                          {entry.triggeredByName ?? <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatBadge(entry.format)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {entry.tablesCount}
                            </span>
                            <span className="text-gray-400 text-xs hidden md:inline">
                              ({entry.tableNames.slice(0, 3).join(', ')}
                              {entry.tableNames.length > 3 ? ` +${entry.tableNames.length - 3}` : ''})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold">
                          {entry.totalRows.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {formatDuration(entry.durationMs)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {entry.fileName}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.status === 'success' ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Success
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: PREVIEW ────────────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div>
          {!preview ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 py-20 text-center text-gray-400 dark:text-gray-500">
              <Table className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No table selected.</p>
              <p className="text-xs mt-1">Click the <strong>View</strong> button on any table in the Backup tab.</p>
              <button
                onClick={() => setActiveTab('backup')}
                className="mt-4 px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                Go to Backup Tables
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              {/* Preview Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-pink-500" />
                    {ALL_TABLES.find((t) => t.name === preview.tableName)?.icon}{' '}
                    {ALL_TABLES.find((t) => t.name === preview.tableName)?.label}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                    {preview.tableName} — {preview.totalRows.toLocaleString()} total rows
                    {preview.columns.length > 0 && ` — ${preview.columns.length} columns`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadTableCSV(preview.tableName, preview.tableName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Download CSV
                  </button>
                  <button
                    onClick={() => downloadTableExcel(preview.tableName, preview.tableName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              {preview.isLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading data…</p>
                </div>
              ) : preview.error ? (
                <div className="py-16 text-center text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Error loading data</p>
                  <p className="text-xs mt-1 text-gray-400">{preview.error}</p>
                </div>
              ) : preview.data.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">This table is empty.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-700/60 sticky top-0">
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-r border-gray-100 dark:border-slate-700 w-10 text-center">#</th>
                          {preview.columns.map((col) => (
                            <th
                              key={col}
                              className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap border-r border-gray-100 dark:border-slate-700 last:border-0"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`border-t border-gray-100 dark:border-slate-700 hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-colors ${
                              rIdx % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-slate-800/40'
                            }`}
                          >
                            <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-center border-r border-gray-100 dark:border-slate-700 font-mono">
                              {(preview.page - 1) * PREVIEW_PAGE_SIZE + rIdx + 1}
                            </td>
                            {preview.columns.map((col) => {
                              const val = row[col];
                              const str =
                                val === null || val === undefined
                                  ? ''
                                  : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val);
                              return (
                                <td
                                  key={col}
                                  className="px-3 py-2 text-gray-700 dark:text-gray-200 border-r border-gray-100 dark:border-slate-700 last:border-0 max-w-[200px]"
                                  title={str}
                                >
                                  <div className="truncate max-w-[200px]">
                                    {str === '' ? (
                                      <span className="text-gray-300 dark:text-gray-600 italic">null</span>
                                    ) : (
                                      str
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {preview.totalRows > PREVIEW_PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing rows {(preview.page - 1) * PREVIEW_PAGE_SIZE + 1}–
                        {Math.min(preview.page * PREVIEW_PAGE_SIZE, preview.totalRows)} of{' '}
                        {preview.totalRows.toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => changePage(preview.page - 1)}
                          disabled={preview.page === 1 || preview.isLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <span className="flex items-center px-3 text-xs text-gray-600 dark:text-gray-300 font-mono">
                          {preview.page} / {Math.ceil(preview.totalRows / PREVIEW_PAGE_SIZE)}
                        </span>
                        <button
                          onClick={() => changePage(preview.page + 1)}
                          disabled={
                            preview.page >= Math.ceil(preview.totalRows / PREVIEW_PAGE_SIZE) ||
                            preview.isLoading
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RESTORE ────────────────────────────────────────────────────────── */}
      {activeTab === 'restore' && (
        <div className="space-y-5">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">Restore from Backup File</p>
              <p>Upload an Excel (.xlsx) or CSV (.csv) file previously exported from this system. Each sheet in the Excel file maps to its matching database table. You can choose to <strong>Merge</strong> (safely add/update rows) or <strong>Replace</strong> (delete all existing data first).</p>
            </div>
          </div>

          {/* File Drop Zone */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <UploadCloud className="w-4 h-4 text-pink-500" />
              Step 1 — Select Backup File
            </h3>

            {!restoreFile ? (
              <div
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); dropZoneRef.current?.classList.add('border-pink-500', 'bg-pink-50', 'dark:bg-pink-900/10'); }}
                onDragLeave={() => { dropZoneRef.current?.classList.remove('border-pink-500', 'bg-pink-50', 'dark:bg-pink-900/10'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropZoneRef.current?.classList.remove('border-pink-500', 'bg-pink-50', 'dark:bg-pink-900/10');
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleRestoreFilePick(file);
                }}
                className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 dark:hover:bg-pink-900/10 transition-colors"
              >
                <UploadCloud className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag & drop your backup file here, or <span className="text-pink-600">click to browse</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supports .xlsx (Excel) and .csv files</p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{restoreFile.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(restoreFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => { setRestoreFile(null); setRestoreParsed(null); setRestoreResults(null); setParseError(null); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestoreFilePick(file);
                e.target.value = '';
              }}
            />

            {isParsing && (
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                Analysing file…
              </div>
            )}
            {parseError && (
              <div className="mt-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {parseError}
              </div>
            )}
          </div>

          {/* Parsed Preview */}
          {restoreParsed && !restoreResults && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-5">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-pink-500" />
                Step 2 — Review Detected Tables
                <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full font-semibold">{restoreParsed.filter((s) => s.matched).length} matched</span>
              </h3>

              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-2.5 text-left w-8">
                        <input
                          type="checkbox"
                          checked={restoreParsed.filter((s) => s.matched).every((s) => restoreSelectedTables.has(s.tableName))}
                          onChange={(e) => {
                            const matched = restoreParsed.filter((s) => s.matched).map((s) => s.tableName);
                            setRestoreSelectedTables(e.target.checked ? new Set(matched) : new Set());
                          }}
                          className="rounded accent-pink-500"
                        />
                      </th>
                      <th className="px-4 py-2.5 text-left">Sheet / Table</th>
                      <th className="px-4 py-2.5 text-center">Rows</th>
                      <th className="px-4 py-2.5 text-center">Columns</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restoreParsed.map((sheet) => {
                      const isBackupHistory = sheet.tableName === 'backup_history';
                      return (
                        <tr key={sheet.sheetName} className={`border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 ${isBackupHistory ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                          <td className="px-4 py-3">
                            {sheet.matched ? (
                              <input
                                type="checkbox"
                                checked={restoreSelectedTables.has(sheet.tableName)}
                                onChange={(e) => {
                                  setRestoreSelectedTables((prev) => {
                                    const next = new Set(prev);
                                    e.target.checked ? next.add(sheet.tableName) : next.delete(sheet.tableName);
                                    return next;
                                  });
                                }}
                                className="rounded accent-pink-500"
                              />
                            ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {sheet.tableName}
                              {isBackupHistory && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">Backup log</span>}
                            </p>
                            {sheet.sheetName !== sheet.tableName && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">Sheet: {sheet.sheetName}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">{sheet.rowCount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{sheet.columns.length}</td>
                          <td className="px-4 py-3 text-center">
                            {sheet.matched ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <X className="w-3 h-3" /> No match
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mode selector */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Step 3 — Choose Restore Mode</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setRestoreMode('merge')}
                    className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 transition-colors text-left ${restoreMode === 'merge' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-green-300'}`}
                  >
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${restoreMode === 'merge' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">Merge (Safe)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Adds new rows and updates existing ones by ID. Does not delete any data. <strong>Recommended.</strong></p>
                    </div>
                  </button>
                  <button
                    onClick={() => setRestoreMode('replace')}
                    className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 transition-colors text-left ${restoreMode === 'replace' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-red-300'}`}
                  >
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${restoreMode === 'replace' ? 'text-red-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">Replace (Destructive)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Deletes ALL existing rows in selected tables before inserting. Use only after a system crash or complete data loss.</p>
                    </div>
                  </button>
                </div>
              </div>

              {restoreMode === 'replace' && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>Warning:</strong> Replace mode will permanently delete all current data in the selected tables before restoring. This cannot be undone.</span>
                </div>
              )}

              {/* 3-step confirmation restore button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestoreClick}
                  disabled={isRestoring || restoreSelectedTables.size === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow transition-all ${
                    restoreConfirmStep === 0
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : restoreConfirmStep === 1
                      ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                      : 'bg-red-600 hover:bg-red-700 animate-pulse'
                  }`}
                >
                  {isRestoring ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{restoreStatusMsg}</>
                  ) : restoreConfirmStep === 0 ? (
                    <><UploadCloud className="w-4 h-4" />Restore {restoreSelectedTables.size} Table{restoreSelectedTables.size !== 1 ? 's' : ''}</>
                  ) : restoreConfirmStep === 1 ? (
                    <><AlertTriangle className="w-4 h-4" />Are you sure? Click again to confirm</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4" />Final warning! Click to restore</>
                  )}
                </button>
                {restoreConfirmStep > 0 && !isRestoring && (
                  <button
                    onClick={() => { setRestoreConfirmStep(0); if (restoreConfirmTimer.current) clearTimeout(restoreConfirmTimer.current); }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Restore Results */}
          {restoreResults && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Restore Results
              </h3>
              <div className="space-y-2">
                {restoreResults.map((r) => (
                  <div key={r.table} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${r.success ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center gap-2">
                      {r.success
                        ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        : <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                      <span className="font-semibold text-sm text-gray-800 dark:text-white font-mono">{r.table}</span>
                    </div>
                    <div className="text-right text-xs">
                      {r.success
                        ? <span className="text-green-700 dark:text-green-400">{r.rowsInserted.toLocaleString()} / {r.rowsTotal.toLocaleString()} rows restored</span>
                        : <span className="text-red-600 dark:text-red-400">{r.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setRestoreFile(null); setRestoreParsed(null); setRestoreResults(null); setParseError(null); }}
                className="mt-4 text-sm text-pink-600 dark:text-pink-400 hover:underline font-medium"
              >
                ← Restore another file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
