'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { ClientCard } from './components/ClientCard';
import { TeamSection } from './components/TeamSection';
import { FinanceSection } from './components/FinanceSection';
import { DocumentsSection } from './components/DocumentsSection';
import { PickupSlipSection } from './components/PickupSlipSection';
import {
  ClientJourney,
  NotesSection,
  FormsBox,
  ExtrasSection,
  FramesAndAlbums,
  ContractPackage,
} from '@/components/couples';

export default function CoupleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const coupleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [extrasOrders, setExtrasOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [rawExtrasOrders, setRawExtrasOrders] = useState<any[]>([]);
  const [clientExtras, setClientExtras] = useState<any[]>([]);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!coupleId) return;

      try {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .eq('id', coupleId)
          .single();

        if (!coupleData) {
          router.push('/admin/couples');
          return;
        }
        setCouple(coupleData);

        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('couple_id', coupleId)
          .single();
        setContract(contractData);

        const { data: milestoneRows } = await supabase
          .from('couple_milestones')
          .select('*')
          .eq('couple_id', coupleId)
          .limit(1);
        setMilestones(milestoneRows?.[0] ?? null);

        const { data: assignmentData } = await supabase
          .from('wedding_assignments')
          .select('*')
          .eq('couple_id', coupleId)
          .single();
        setAssignment(assignmentData);

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('couple_id', coupleId)
          .order('payment_date');
        setPayments(paymentsData || []);

        if (contractData?.id) {
          const { data: installmentsData } = await supabase
            .from('contract_installments')
            .select('*')
            .eq('contract_id', contractData.id)
            .order('installment_number');
          setInstallments(installmentsData || []);
        }

        // Fetch extras_invoices (linked by couple_name, not couple_id)
        const { data: extrasInvoiceData } = await supabase
          .from('extras_invoices')
          .select('*')
          .eq('couple_name', coupleData.couple_name);

        // Transform extras_invoices to match ExtrasOrder interface
        const transformedExtras = (extrasInvoiceData || []).map(inv => ({
          id: inv.id,
          order_date: inv.created_date || inv.created_at,
          order_type: 'frames_albums',
          items: Array.isArray(inv.items)
            ? inv.items.reduce((acc: Record<string, string>, item: any) => {
                acc[item.description || 'item'] = item.amount || item.total?.toString() || '';
                return acc;
              }, {})
            : (inv.items || {}),
          total: inv.grand_total?.toString() || '0',
          status: inv.payment_note?.toLowerCase().includes('paid') ? 'paid' : 'pending',
          notes: inv.invoice_notes || inv.payment_note || null,
        }));
        setExtrasOrders(transformedExtras);

        const { data: invoicesData } = await supabase
          .from('addon_invoices')
          .select('*')
          .eq('couple_id', coupleId)
          .order('invoice_date');
        setInvoices(invoicesData || []);

        const { data: rawExtrasData } = await supabase
          .from('extras_orders')
          .select('*')
          .eq('couple_id', coupleId)
          .order('order_date');
        setRawExtrasOrders(rawExtrasData || []);

        const { data: clientExtrasData } = await supabase
          .from('client_extras')
          .select('*')
          .eq('couple_id', coupleId)
          .order('invoice_date');
        setClientExtras(clientExtrasData || []);

      } catch (error) {
        console.error('Error fetching couple data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [coupleId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!couple) {
    return (
      <div className="p-8">
        <p>Couple not found</p>
        <Link href="/admin/couples" className="text-teal-600 hover:underline">
          ← Back to couples
        </Link>
      </div>
    );
  }

  const contractTotal = parseFloat(couple.contract_total || '0');
  const extrasTotal = parseFloat(couple.extras_total || '0');
  const totalPaid = parseFloat(couple.total_paid || '0');
  const balance = parseFloat(couple.balance_owing || '0');
  const grandTotal = contractTotal + extrasTotal;

  const framesTotal = extrasOrders
    .filter(e => e.order_type === 'frames_albums')
    .reduce((sum: number, e: any) => sum + parseFloat(e.total || '0'), 0);
  const otherExtrasTotal = Math.max(0, extrasTotal - framesTotal);

  const rawFramesTotal = rawExtrasOrders
    .reduce((sum: number, o: any) => sum + parseFloat(o.extras_sale_amount || '0'), 0);
  const rawClientExtrasTotal = clientExtras
    .reduce((sum: number, e: any) => sum + parseFloat(e.total || '0'), 0);

  const framesAlbums = extrasOrders.find(e => e.order_type === 'frames_albums') || null;
  const postWedding = extrasOrders.find(e => e.order_type === 'post_wedding_extras') || null;

  const hasSocialMediaRestriction = contract?.appointment_notes?.toLowerCase().includes('no social media') || false;

  const extrasNotes = extrasOrders
    .filter(e => e.notes)
    .map(e => e.notes as string);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '100%' }}>
      <Link
        href="/admin/couples"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        All Couples
      </Link>

      <ClientCard
        couple={couple}
        contract={contract}
        extrasOrders={extrasOrders}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <TeamSection
          assignment={assignment}
          contract={contract}
        />
        <NotesSection
          coupleNotes={couple.notes}
          contractNotes={contract?.appointment_notes || null}
          extrasNotes={extrasNotes}
          hasSocialMediaRestriction={hasSocialMediaRestriction}
        />
      </div>

      <ClientJourney
        milestones={milestones}
        weddingDate={couple.wedding_date}
      />

      <FormsBox
        dayFormApproved={milestones?.m15_day_form_approved || false}
        photoOrderIn={milestones?.m24_photo_order_in || false}
        videoOrderIn={milestones?.m25_video_order_in || false}
        packageType={couple.package_type || 'photo_video'}
        coupleId={coupleId}
      />

      <FinanceSection
        contractTotal={contractTotal}
        installments={installments}
        payments={payments}
        extrasOrder={rawExtrasOrders[0] || null}
        clientExtras={clientExtras}
      />

      <ExtrasSection
        framesAlbums={framesAlbums}
        postWedding={postWedding}
        invoices={invoices}
      />

      <FramesAndAlbums extrasOrder={rawExtrasOrders[0] || null} />

      {contract && (
        <ContractPackage
          signedDate={contract.signed_date}
          dayOfWeek={contract.day_of_week || 'SATURDAY'}
          startTime={contract.start_time || '12:00'}
          endTime={contract.end_time || '22:00'}
          numPhotographers={contract.num_photographers || 1}
          numVideographers={contract.num_videographers || 0}
          engagementSession={contract.engagement_session || false}
          engagementLocation={contract.engagement_location}
          dronePhotography={contract.drone_photography || false}
          parentAlbumsQty={contract.parent_albums_qty || 0}
          parentAlbumsSize={contract.parent_albums_size}
          locGroom={contract.loc_groom || false}
          locBride={contract.loc_bride || false}
          locCeremony={contract.loc_ceremony || false}
          locPark={contract.loc_park || false}
          locReception={contract.loc_reception || false}
          subtotal={parseFloat(contract.subtotal || '0')}
          tax={parseFloat(contract.tax || '0')}
          contractTotal={contractTotal}
          extrasTotal={extrasTotal}
          c2FramesTotal={rawFramesTotal}
          c3ExtrasTotal={rawClientExtrasTotal}
          totalPaid={totalPaid}
          balance={balance}
          numGuests={contract.num_guests}
          ceremonyLocation={contract.ceremony_location}
          receptionVenue={contract.reception_venue}
          isArchived={milestones?.m35_archived || false}
        />
      )}

      <DocumentsSection
        coupleId={coupleId}
        hasClientExtras={clientExtras.length > 0}
        hasExtrasOrders={rawExtrasOrders.length > 0}
        refreshKey={docsRefreshKey}
      />

      <PickupSlipSection
        coupleId={coupleId}
        brideName={[couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ')}
        groomName={[couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ')}
        onGenerated={() => setDocsRefreshKey(k => k + 1)}
      />

    </div>
  );
}
