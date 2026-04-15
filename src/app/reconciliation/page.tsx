'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  parseInteracText, 
  processBatch, 
  normalizeName,
  type ParsedTransaction,
  type MatchResult,
  type BatchResult,
  type PayerLink,
  type Couple,
} from '@/lib/interac-parser';

// ============================================
// TYPES
// ============================================

type ViewState = 'paste' | 'review' | 'complete';

interface CoupleOption {
  id: string;
  couple_name: string;
  wedding_date: string | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReconciliationPage() {
  const [viewState, setViewState] = useState<ViewState>('paste');
  const [rawText, setRawText] = useState('');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [couples, setCouples] = useState<CoupleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Track user decisions for fuzzy/unmatched
  const [decisions, setDecisions] = useState<Record<number, {
    coupleId: string | null;
    saveAlias: boolean;
  }>>({});


  // ============================================
  // STEP 1: PARSE & MATCH
  // ============================================
  
  const handleParse = useCallback(async () => {
    if (!rawText.trim()) {
      setError('Please paste some transaction text first');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Parse the raw text
      const transactions = parseInteracText(rawText);
      
      if (transactions.length === 0) {
        setError('No transactions found in the pasted text. Make sure you\'re copying from your bank\'s e-Transfer history.');
        setIsProcessing(false);
        return;
      }
      
      // Fetch payer_links and couples for matching
      const [payerLinksRes, couplesRes] = await Promise.all([
        supabase
          .from('payer_links')
          .select('id, couple_id, payer_name, payer_name_normalized, couples(couple_name)')
          .limit(1000),
        supabase
          .from('couples')
          .select('id, couple_name, bride_first_name, bride_last_name, groom_first_name, groom_last_name, wedding_date')
          .order('wedding_date', { ascending: false })
          .limit(500),
      ]);
      
      if (payerLinksRes.error) throw payerLinksRes.error;
      if (couplesRes.error) throw couplesRes.error;
      
      // Transform payer_links to include couple_name
      const payerLinks: PayerLink[] = (payerLinksRes.data ?? []).map((pl: any) => ({
        id: pl.id,
        couple_id: pl.couple_id,
        payer_name: pl.payer_name,
        payer_name_normalized: pl.payer_name_normalized,
        couple_name: pl.couples?.couple_name ?? null,
      }));
      
      const couplesData: Couple[] = couplesRes.data ?? [];
      
      // Store couples for dropdown
      setCouples(couplesData.map(c => ({
        id: c.id,
        couple_name: c.couple_name,
        wedding_date: c.wedding_date ?? null,
      })));
      
      // Process the batch
      const result = processBatch(transactions, payerLinks, couplesData);
      setBatchResult(result);
      
      // Create import_batch record
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          raw_text: rawText,
          parsed_count: result.total,
          matched_count: result.exact.length,
          pending_count: result.fuzzy.length + result.unmatched.length,
          status: 'review',
        })
        .select('id')
        .single();
      
      if (batchError) throw batchError;
      setBatchId(batch.id);
      
      // Initialize decisions for fuzzy/unmatched
      const initialDecisions: typeof decisions = {};
      result.fuzzy.forEach((_, idx) => {
        initialDecisions[idx] = { coupleId: result.fuzzy[idx].matchedCoupleId, saveAlias: true };
      });
      result.unmatched.forEach((_, idx) => {
        initialDecisions[result.fuzzy.length + idx] = { coupleId: null, saveAlias: false };
      });
      setDecisions(initialDecisions);
      
      setViewState('review');
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse transactions');
    } finally {
      setIsProcessing(false);
    }
  }, [rawText, supabase]);

  // ============================================
  // STEP 2: COMMIT TRANSACTIONS
  // ============================================
  
  const handleCommit = useCallback(async () => {
    if (!batchResult || !batchId) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const paymentsToInsert: any[] = [];
      const aliasesToInsert: any[] = [];
      
      // Exact matches - auto-commit
      for (const match of batchResult.exact) {
        paymentsToInsert.push({
          couple_id: match.matchedCoupleId,
          payment_date: match.transaction.date.toISOString().split('T')[0],
          amount: match.transaction.amount,
          method: 'e-transfer',
          from_name: match.transaction.senderName,
          payment_type: 'contract',
          phase: 'C1',
          import_batch_id: batchId,
        });
      }
      
      // Fuzzy matches - use decisions
      batchResult.fuzzy.forEach((match, idx) => {
        const decision = decisions[idx];
        if (decision?.coupleId) {
          paymentsToInsert.push({
            couple_id: decision.coupleId,
            payment_date: match.transaction.date.toISOString().split('T')[0],
            amount: match.transaction.amount,
            method: 'e-transfer',
            from_name: match.transaction.senderName,
            payment_type: 'contract',
            phase: 'C1',
            import_batch_id: batchId,
          });
          
          // Save alias if requested
          if (decision.saveAlias) {
            aliasesToInsert.push({
              couple_id: decision.coupleId,
              payer_name: match.transaction.senderName,
              payer_name_normalized: match.transaction.senderNameNormalized,
              source: 'learned',
              match_count: 1,
            });
          }
        }
      });
      
      // Unmatched - use decisions
      batchResult.unmatched.forEach((match, idx) => {
        const decisionIdx = batchResult.fuzzy.length + idx;
        const decision = decisions[decisionIdx];
        if (decision?.coupleId) {
          paymentsToInsert.push({
            couple_id: decision.coupleId,
            payment_date: match.transaction.date.toISOString().split('T')[0],
            amount: match.transaction.amount,
            method: 'e-transfer',
            from_name: match.transaction.senderName,
            payment_type: 'contract',
            phase: 'C1',
            import_batch_id: batchId,
          });
          
          // Save alias if requested
          if (decision.saveAlias) {
            aliasesToInsert.push({
              couple_id: decision.coupleId,
              payer_name: match.transaction.senderName,
              payer_name_normalized: match.transaction.senderNameNormalized,
              source: 'learned',
              match_count: 1,
            });
          }
        }
      });
      
      // Insert payments
      if (paymentsToInsert.length > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentsToInsert);
        if (paymentError) throw paymentError;
      }
      
      // Insert aliases (ignore conflicts)
      if (aliasesToInsert.length > 0) {
        const { error: aliasError } = await supabase
          .from('payer_links')
          .upsert(aliasesToInsert, { 
            onConflict: 'payer_name_normalized,couple_id',
            ignoreDuplicates: true 
          });
        if (aliasError) console.warn('Alias insert warning:', aliasError);
      }
      
      // Update batch status
      await supabase
        .from('import_batches')
        .update({ 
          status: 'complete', 
          completed_at: new Date().toISOString(),
          matched_count: paymentsToInsert.length,
        })
        .eq('id', batchId);
      
      setViewState('complete');
    } catch (err) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to commit transactions');
    } finally {
      setIsProcessing(false);
    }
  }, [batchResult, batchId, decisions, supabase]);

  // ============================================
  // RENDER: PASTE VIEW
  // ============================================
  
  if (viewState === 'paste') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Payment Reconciliation</h1>
        <p className="text-gray-600 mb-6">
          Paste your Interac e-Transfer history below. Copy directly from your bank&apos;s transaction page.
        </p>
        
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste e-Transfer Text
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste your bank's e-Transfer history here...

Example formats supported:
Apr 15, 2026  JOHN SMITH  $500.00
2026-04-15  INTERAC e-Transfer from JANE DOE  750.00`}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleParse}
            disabled={isProcessing || !rawText.trim()}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              'Parse & Match'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: REVIEW VIEW
  // ============================================
  
  if (viewState === 'review' && batchResult) {
    const skippedCount = Object.values(decisions).filter(d => !d.coupleId).length;
    const totalToCommit = batchResult.exact.length + 
      batchResult.fuzzy.filter((_, i) => decisions[i]?.coupleId).length +
      batchResult.unmatched.filter((_, i) => decisions[batchResult.fuzzy.length + i]?.coupleId).length;

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Review Matches</h1>
            <p className="text-gray-600">
              {batchResult.total} transactions parsed • {batchResult.exact.length} exact • {batchResult.fuzzy.length} fuzzy • {batchResult.unmatched.length} unmatched
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewState('paste')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleCommit}
              disabled={isProcessing || totalToCommit === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? 'Committing...' : `Commit ${totalToCommit} Payments`}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* EXACT MATCHES - GREEN */}
        {batchResult.exact.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Exact Matches ({batchResult.exact.length})
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-100">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Sender</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Matched To</th>
                    <th className="text-left p-3">Via</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.exact.map((match, idx) => (
                    <tr key={idx} className="border-t border-green-200">
                      <td className="p-3">{match.transaction.dateString}</td>
                      <td className="p-3 font-medium">{match.transaction.senderName}</td>
                      <td className="p-3 text-right">${match.transaction.amount.toFixed(2)}</td>
                      <td className="p-3 text-green-700">{match.matchedCoupleName}</td>
                      <td className="p-3 text-gray-500 text-xs">{match.matchedVia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FUZZY MATCHES - YELLOW */}
        {batchResult.fuzzy.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              Fuzzy Matches - Confirm ({batchResult.fuzzy.length})
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Sender</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Best Match</th>
                    <th className="text-left p-3">Assign To</th>
                    <th className="text-center p-3">Save Alias</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.fuzzy.map((match, idx) => (
                    <tr key={idx} className="border-t border-yellow-200">
                      <td className="p-3">{match.transaction.dateString}</td>
                      <td className="p-3 font-medium">{match.transaction.senderName}</td>
                      <td className="p-3 text-right">${match.transaction.amount.toFixed(2)}</td>
                      <td className="p-3">
                        <span className="text-yellow-700">{match.matchedCoupleName}</span>
                        <span className="text-gray-400 text-xs ml-2">({match.confidence}%)</span>
                      </td>
                      <td className="p-3">
                        <select
                          value={decisions[idx]?.coupleId ?? ''}
                          onChange={(e) => setDecisions(d => ({
                            ...d,
                            [idx]: { ...d[idx], coupleId: e.target.value || null }
                          }))}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="">-- Skip --</option>
                          {couples.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.couple_name} {c.wedding_date ? `(${c.wedding_date})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={decisions[idx]?.saveAlias ?? false}
                          onChange={(e) => setDecisions(d => ({
                            ...d,
                            [idx]: { ...d[idx], saveAlias: e.target.checked }
                          }))}
                          className="w-4 h-4"
                          disabled={!decisions[idx]?.coupleId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* UNMATCHED - RED */}
        {batchResult.unmatched.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Unmatched - Manual Assign ({batchResult.unmatched.length})
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-red-100">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Sender</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Assign To</th>
                    <th className="text-center p-3">Save Alias</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.unmatched.map((match, idx) => {
                    const decisionIdx = batchResult.fuzzy.length + idx;
                    return (
                      <tr key={idx} className="border-t border-red-200">
                        <td className="p-3">{match.transaction.dateString}</td>
                        <td className="p-3 font-medium">{match.transaction.senderName}</td>
                        <td className="p-3 text-right">${match.transaction.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <select
                            value={decisions[decisionIdx]?.coupleId ?? ''}
                            onChange={(e) => setDecisions(d => ({
                              ...d,
                              [decisionIdx]: { ...d[decisionIdx], coupleId: e.target.value || null, saveAlias: !!e.target.value }
                            }))}
                            className="w-full p-2 border rounded text-sm"
                          >
                            <option value="">-- Skip --</option>
                            {couples.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.couple_name} {c.wedding_date ? `(${c.wedding_date})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={decisions[decisionIdx]?.saveAlias ?? false}
                            onChange={(e) => setDecisions(d => ({
                              ...d,
                              [decisionIdx]: { ...d[decisionIdx], saveAlias: e.target.checked }
                            }))}
                            className="w-4 h-4"
                            disabled={!decisions[decisionIdx]?.coupleId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {skippedCount > 0 && (
          <p className="text-gray-500 text-sm">
            {skippedCount} transaction{skippedCount > 1 ? 's' : ''} will be skipped (no couple assigned)
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: COMPLETE VIEW
  // ============================================
  
  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">Import Complete!</h1>
        <p className="text-gray-600 mb-6">
          Payments have been added to the ledger and new aliases saved for future matching.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setViewState('paste');
              setRawText('');
              setBatchResult(null);
              setBatchId(null);
              setDecisions({});
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Import More
          </button>
          <a
            href="/couples"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Couples
          </a>
        </div>
      </div>
    </div>
  );
}
