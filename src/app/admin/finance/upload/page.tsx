'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Loader2, Upload, ArrowLeft, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface CsvRow {
  date: string;
  from: string;
  amount: number;
}

interface MatchedRow extends CsvRow {
  couple_id: string | null;
  couple_name: string | null;
  confidence: 'high' | 'review' | 'unmatched';
  candidates: { id: string; couple_name: string }[];
  isDuplicate: boolean;
}

interface CoupleRecord {
  id: string;
  couple_name: string;
}

const TABS = [
  { label: 'Dashboard', href: '/admin/finance', active: false },
  { label: 'Accounts', href: '/admin/finance/accounts', active: false },
  { label: 'Upcoming', href: '/admin/finance/upcoming', active: false },
  { label: 'Upload Payments', href: '/admin/finance/upload', active: true },
];

const STEPS = ['Upload CSV', 'Review Matches', 'Confirm Import'];

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function cleanAmount(raw: string): number {
  return parseFloat(raw.replace(/[$,\s]/g, '')) || 0;
}

function parseDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
}

function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0].toLowerCase();
}

function generateBatchId(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export default function FinanceUploadPage() {
  const [step, setStep] = useState(1);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [couples, setCouples] = useState<CoupleRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unmatched' | 'review'>('unmatched');
  const [toast, setToast] = useState<string | null>(null);

  // Load all couples for matching
  useEffect(() => {
    async function loadCouples() {
      const { data } = await supabase
        .from('couples')
        .select('id, couple_name')
        .order('couple_name');
      setCouples(data || []);
    }
    loadCouples();
  }, []);

  // ─── STEP 1: Parse CSV ───
  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: CsvRow[] = results.data
          .map((row: any) => ({
            date: parseDate(row['Date Deposited'] || row['date'] || ''),
            from: row['Received From'] || row['from'] || '',
            amount: cleanAmount(row['Amount'] || row['amount'] || '0'),
          }))
          .filter((r: CsvRow) => r.date && r.amount > 0);
        setCsvRows(rows);
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // ─── STEP 2: Match couples ───
  const performMatching = useCallback(async () => {
    const matched: MatchedRow[] = [];

    for (const row of csvRows) {
      const firstName = extractFirstName(row.from);
      const candidates = couples.filter(c =>
        c.couple_name.toLowerCase().includes(firstName)
      );

      let confidence: 'high' | 'review' | 'unmatched';
      let couple_id: string | null = null;
      let couple_name: string | null = null;

      if (candidates.length === 1) {
        confidence = 'high';
        couple_id = candidates[0].id;
        couple_name = candidates[0].couple_name;
      } else if (candidates.length > 1) {
        confidence = 'review';
      } else {
        confidence = 'unmatched';
      }

      // Check for duplicates
      let isDuplicate = false;
      if (couple_id) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('couple_id', couple_id)
          .eq('payment_date', row.date)
          .eq('amount', row.amount)
          .limit(1);
        isDuplicate = (existing?.length || 0) > 0;
      }

      matched.push({
        ...row,
        couple_id,
        couple_name,
        confidence,
        candidates,
        isDuplicate,
      });
    }

    setMatchedRows(matched);
  }, [csvRows, couples]);

  function selectCouple(rowIdx: number, coupleId: string, coupleName: string) {
    const fromName = matchedRows[rowIdx]?.from.trim().toLowerCase();
    setMatchedRows(prev => {
      const updated = [...prev];
      let count = 0;
      updated.forEach((row, i) => {
        if (row.from.trim().toLowerCase() === fromName) {
          updated[i] = { ...row, couple_id: coupleId, couple_name: coupleName, confidence: 'high' };
          count++;
        }
      });
      if (count > 1) {
        setToast(`Applied to ${count} rows from "${matchedRows[rowIdx]?.from}"`);
        setTimeout(() => setToast(null), 3000);
      }
      return updated;
    });
    // Check duplicates for all matching rows
    matchedRows.forEach((row, i) => {
      if (row.from.trim().toLowerCase() === fromName) {
        checkDuplicate(i, coupleId);
      }
    });
  }

  async function checkDuplicate(rowIdx: number, coupleId: string) {
    const row = matchedRows[rowIdx] || csvRows[rowIdx];
    if (!row) return;
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('payment_date', row.date)
      .eq('amount', row.amount)
      .limit(1);
    setMatchedRows(prev => {
      const updated = [...prev];
      if (updated[rowIdx]) {
        updated[rowIdx] = { ...updated[rowIdx], isDuplicate: (existing?.length || 0) > 0 };
      }
      return updated;
    });
  }

  // ─── STEP 3: Import ───
  async function handleImport() {
    setImporting(true);
    const batchId = generateBatchId();
    let imported = 0;
    let duplicates = 0;

    const toImport = matchedRows.filter(r => r.couple_id && !r.isDuplicate);
    const dupeRows = matchedRows.filter(r => r.isDuplicate);
    duplicates = dupeRows.length;

    for (const row of toImport) {
      const { error } = await supabase.from('payments').insert({
        couple_id: row.couple_id,
        payment_date: row.date,
        amount: row.amount,
        method: 'e-transfer',
        from_name: row.from,
        import_batch_id: batchId,
      });
      if (!error) imported++;
    }

    setImportResult({ imported, duplicates });
    setImporting(false);
  }

  // ─── Computed ───
  const allMatched = matchedRows.length > 0 && matchedRows.every(r => r.couple_id);
  const importableCount = matchedRows.filter(r => r.couple_id && !r.isDuplicate).length;
  const importableTotal = matchedRows
    .filter(r => r.couple_id && !r.isDuplicate)
    .reduce((s, r) => s + r.amount, 0);
  const duplicateCount = matchedRows.filter(r => r.isDuplicate).length;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-teal-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">💰 Finance — Upload Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Import e-transfer payments from CSV</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(tab => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab.active
                ? 'bg-background border border-b-background border-border text-teal-600 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {idx > 0 && <div className={`w-8 h-px ${isDone ? 'bg-teal-400' : 'bg-border'}`} />}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone ? 'bg-teal-500 text-white' : isActive ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className={`text-sm ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── STEP 1: Upload ─── */}
      {step === 1 && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? 'border-teal-400 bg-teal-50' : 'border-border bg-background hover:border-ring'
            }`}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Drop your CSV file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Expected columns: &quot;Date Deposited&quot;, &quot;Received From&quot;, &quot;Amount&quot;
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 cursor-pointer transition-colors">
              Choose File
              <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            </label>
          </div>

          {csvRows.length > 0 && (
            <div className="mt-6 bg-background rounded-xl border border-border p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-semibold text-foreground">
                    Found {csvRows.length} rows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Date range: {csvRows[0]?.date} to {csvRows[csvRows.length - 1]?.date}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: ${csvRows.reduce((s, r) => s + r.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={() => { performMatching(); setStep(2); }}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Continue to Review →
                </button>
              </div>

              {/* Preview */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">From</th>
                    <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td className="py-2 font-mono text-muted-foreground">{row.date}</td>
                      <td className="py-2">{row.from}</td>
                      <td className="py-2 text-right font-mono text-green-600">${row.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {csvRows.length > 10 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-center text-muted-foreground text-xs">
                        ... and {csvRows.length - 10} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: Review Matches ─── */}
      {step === 2 && (
        <div>
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-teal-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Upload
          </button>

          {/* Match Summary */}
          <div className="flex gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <span className="font-semibold text-green-700">
                {matchedRows.filter(r => r.confidence === 'high').length} matched
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              <span className="font-semibold text-amber-700">
                {matchedRows.filter(r => r.confidence === 'review').length} review
              </span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <span className="font-semibold text-red-700">
                {matchedRows.filter(r => r.confidence === 'unmatched').length} unmatched
              </span>
            </div>
            {duplicateCount > 0 && (
              <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm">
                <span className="font-semibold text-muted-foreground">
                  {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
            {([
              { key: 'all' as const, label: 'Show All' },
              { key: 'unmatched' as const, label: 'Unmatched Only' },
              { key: 'review' as const, label: 'Review Only' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setReviewFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  reviewFilter === tab.key
                    ? 'bg-background text-teal-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Match Table */}
          <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">From (CSV)</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Matched Couple</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {matchedRows.map((row, idx) => {
                  if (reviewFilter === 'unmatched' && row.confidence !== 'unmatched') return null;
                  if (reviewFilter === 'review' && row.confidence !== 'review') return null;
                  return (
                  <tr
                    key={idx}
                    className={`border-b border-border ${
                      row.isDuplicate ? 'bg-muted opacity-60' :
                      row.confidence === 'high' ? 'bg-green-50/40' :
                      row.confidence === 'review' ? 'bg-amber-50/40' :
                      'bg-red-50/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-muted-foreground">{row.date}</td>
                    <td className="py-3 px-4">{row.from}</td>
                    <td className="py-3 px-4 text-right font-mono text-green-600">${row.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {row.confidence === 'high' && row.couple_name ? (
                        <span className="font-medium text-green-700">{row.couple_name}</span>
                      ) : (
                        <div className="relative">
                          <select
                            value={row.couple_id || ''}
                            onChange={(e) => {
                              const c = couples.find(c => c.id === e.target.value);
                              if (c) selectCouple(idx, c.id, c.couple_name);
                            }}
                            className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background appearance-none pr-8"
                          >
                            <option value="">Select couple...</option>
                            {(row.candidates.length > 0 ? row.candidates : couples).map(c => (
                              <option key={c.id} value={c.id}>{c.couple_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2 top-2 pointer-events-none" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.isDuplicate ? (
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">DUPE</span>
                      ) : row.confidence === 'high' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : row.confidence === 'review' ? (
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Continue Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(3)}
              disabled={!allMatched}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                allMatched
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Continue to Import ({importableCount} payments) →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Confirm Import ─── */}
      {step === 3 && !importResult && (
        <div>
          <button
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-teal-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Review
          </button>

          <div className="bg-background rounded-xl border border-border p-8 text-center max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to Import</h2>
            <p className="text-muted-foreground mb-6">
              {importableCount} payment{importableCount !== 1 ? 's' : ''} totaling{' '}
              <span className="font-mono font-bold text-green-600">
                ${importableTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </p>

            {duplicateCount > 0 && (
              <p className="text-sm text-amber-600 mb-6">
                ⚠️ {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} will be skipped
              </p>
            )}

            <div className="text-xs text-muted-foreground mb-6">
              Method: e-transfer · Batch ID will be assigned for rollback
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                </span>
              ) : (
                `Confirm Import — ${importableCount} Payments`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Success Screen ─── */}
      {importResult && (
        <div className="bg-background rounded-xl border border-border p-8 text-center max-w-lg mx-auto">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Import Complete</h2>
          <p className="text-foreground mb-1">
            ✅ Imported <span className="font-bold">{importResult.imported}</span> payment{importResult.imported !== 1 ? 's' : ''}
          </p>
          {importResult.duplicates > 0 && (
            <p className="text-muted-foreground text-sm mb-4">
              Skipped {importResult.duplicates} duplicate{importResult.duplicates !== 1 ? 's' : ''}
            </p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Link
              href="/admin/finance/accounts"
              className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              View in Accounts →
            </Link>
            <button
              onClick={() => { setStep(1); setCsvRows([]); setMatchedRows([]); setImportResult(null); }}
              className="px-4 py-2 bg-muted text-foreground text-sm font-semibold rounded-lg hover:bg-muted/80 transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
