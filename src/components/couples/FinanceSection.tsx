'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Payment {
  id: string;
  payment_date: string;
  amount: string | number;
  from_name?: string | null;
  phase?: string | null;
  method?: string | null;
  notes?: string | null;
}

interface Installment {
  id: string;
  installment_number: number;
  due_description: string;
  due_date: string | null;
  amount: string | number;
}

interface FinanceSectionProps {
  couple: any;
  payments: Payment[];
  installments: Installment[];
}

const n = (v: string | number | null | undefined): number => parseFloat(String(v || '0')) || 0;

export function FinanceSection({ couple, payments, installments }: FinanceSectionProps) {
  const [showPayments, setShowPayments] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  // Liabilities - use the columns directly
  const c1Amount = Number(couple.c1_amount) || Number(couple.contract_total) || 0;
  const c2Amount = Number(couple.c2_amount) || 0;
  const c3Amount = Number(couple.c3_amount) || 0;

  // Payments by phase
  const c1Paid = payments.filter(p => p.phase === 'C1').reduce((sum, p) => sum + n(p.amount), 0);
  const c2Paid = payments.filter(p => p.phase === 'C2').reduce((sum, p) => sum + n(p.amount), 0);
  const c3Paid = payments.filter(p => p.phase === 'C3').reduce((sum, p) => sum + n(p.amount), 0);

  // If no phase assigned, default to C1
  const unassignedPaid = payments.filter(p => !p.phase).reduce((sum, p) => sum + n(p.amount), 0);
  const totalC1Paid = c1Paid + unassignedPaid;

  const c1Balance = c1Amount - totalC1Paid;
  const c2Balance = c2Amount - c2Paid;
  const c3Balance = c3Amount - c3Paid;

  const totalInvoiced = c1Amount + c2Amount + c3Amount;
  const totalReceived = totalC1Paid + c2Paid + c3Paid;
  const balanceDue = totalInvoiced - totalReceived;

  const isPaidInFull = balanceDue <= 0.01 && balanceDue >= -0.01;

  const coupleName = couple.couple_name || '';

  // Sorted payments for modal (ASC by date)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  // Sorted installments for modal (ASC)
  const sortedInstallments = [...installments].sort(
    (a, b) => a.installment_number - b.installment_number
  );

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const getBalanceColor = (balance: number, liability: number) => {
    if (liability === 0 && balance === 0) return '#6b7280';
    if (balance <= 0) return '#0F6E56';
    return '#dc2626';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      marginTop: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>Finance</span>
      </div>

      {/* Ledger Content */}
      <div style={{ padding: '1.25rem' }}>
        {/* Ledger Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500, color: '#6b7280' }}></th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#6b7280' }}>Invoiced</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: '#6b7280' }}>Received</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500, color: '#6b7280' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 0', color: '#111827' }}>C1 Contract</td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: '#111827' }}>{formatCurrency(c1Amount)}</td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: '#111827' }}>{formatCurrency(totalC1Paid)}</td>
              <td style={{
                textAlign: 'right',
                padding: '12px 0',
                color: getBalanceColor(c1Balance, c1Amount),
                fontWeight: 500
              }}>
                {formatCurrency(c1Balance)}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 0', color: '#111827' }}>C2 Album</td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: c2Amount === 0 ? '#6b7280' : '#111827' }}>
                {formatCurrency(c2Amount)}
              </td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: c2Amount === 0 ? '#6b7280' : '#111827' }}>
                {formatCurrency(c2Paid)}
              </td>
              <td style={{
                textAlign: 'right',
                padding: '12px 0',
                color: getBalanceColor(c2Balance, c2Amount),
                fontWeight: 500
              }}>
                {formatCurrency(c2Balance)}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 0', color: '#111827' }}>C3 Extras</td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: c3Amount === 0 ? '#6b7280' : '#111827' }}>
                {formatCurrency(c3Amount)}
              </td>
              <td style={{ textAlign: 'right', padding: '12px 12px', color: c3Amount === 0 ? '#6b7280' : '#111827' }}>
                {formatCurrency(c3Paid)}
              </td>
              <td style={{
                textAlign: 'right',
                padding: '12px 0',
                color: getBalanceColor(c3Balance, c3Amount),
                fontWeight: 500
              }}>
                {formatCurrency(c3Balance)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Summary Section */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '2px solid #111827'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: '#6b7280' }}>Total invoiced</td>
                <td style={{ textAlign: 'right', padding: '8px 0', color: '#111827', fontWeight: 500 }}>
                  {formatCurrency(totalInvoiced)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#6b7280' }}>Total received</td>
                <td style={{ textAlign: 'right', padding: '8px 0', color: '#111827', fontWeight: 500 }}>
                  {formatCurrency(totalReceived)}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                  Balance due
                </td>
                <td style={{
                  textAlign: 'right',
                  padding: '12px 0',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: isPaidInFull ? '#0F6E56' : '#111827'
                }}>
                  {formatCurrency(balanceDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAID IN FULL Badge */}
        {isPaidInFull && (
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#E1F5EE',
              border: '2px solid #0F6E56',
              borderRadius: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#0F6E56" strokeWidth="2"/>
                <path d="M6 10l3 3 5-6" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#085041',
                letterSpacing: '0.5px'
              }}>
                PAID IN FULL
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setShowPayments(true)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            View payments
          </button>
          <button
            onClick={() => setShowInstallments(true)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            View installments
          </button>
          <div style={{ flex: 1 }} />
          <a
            href="/admin/finance/reconciliation"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Reconcile <span style={{ fontSize: '12px' }}>↗</span>
          </a>
        </div>
      </div>

      {/* Payments Modal */}
      {showPayments && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPayments(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Payments — {coupleName}</h3>
              <button
                onClick={() => setShowPayments(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
              >
                ×
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280', fontWeight: 500 }}>From</th>
                  <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280', fontWeight: 500 }}>Phase</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map(payment => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', color: '#374151' }}>{formatDate(payment.payment_date)}</td>
                    <td style={{ padding: '10px 8px', color: '#374151' }}>{payment.from_name || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {payment.phase ? (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          backgroundColor: payment.phase === 'C1' ? '#dbeafe' : payment.phase === 'C2' ? '#fef3c7' : '#dcfce7',
                          color: payment.phase === 'C1' ? '#1e40af' : payment.phase === 'C2' ? '#92400e' : '#166534'
                        }}>
                          {payment.phase}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 0', color: '#374151', fontWeight: 500 }}>
                      {formatCurrency(n(payment.amount))}
                    </td>
                  </tr>
                ))}
                {sortedPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af' }}>
                      No payments recorded
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedPayments.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #111827' }}>
                    <td colSpan={3} style={{ padding: '12px 0', fontWeight: 500 }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 500 }}>
                      {formatCurrency(totalReceived)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Installments Modal */}
      {showInstallments && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowInstallments(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Installment Schedule — {coupleName}</h3>
              <button
                onClick={() => setShowInstallments(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
              >
                ×
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280', fontWeight: 500 }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedInstallments.map(inst => (
                  <tr key={inst.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', color: '#6b7280' }}>{inst.installment_number}</td>
                    <td style={{ padding: '10px 8px', color: '#374151' }}>{inst.due_description}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0', color: '#374151', fontWeight: 500 }}>
                      {formatCurrency(n(inst.amount))}
                    </td>
                  </tr>
                ))}
                {sortedInstallments.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af' }}>
                      No installments found
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedInstallments.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #111827' }}>
                    <td colSpan={2} style={{ padding: '12px 0', fontWeight: 500 }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 500 }}>
                      {formatCurrency(sortedInstallments.reduce((sum, i) => sum + n(i.amount), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
