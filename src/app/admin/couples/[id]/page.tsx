'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

import {
  ClientCard,
  ClientJourney,
  TeamSection,
  NotesSection,
  FormsBox,
  FinancialLedger,
  ExtrasSection,
  ContractPackage,
  FooterSummary,
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

        const { data: milestoneData } = await supabase
          .from('couple_milestones')
          .select('*')
          .eq('couple_id', coupleId)
          .single();
        setMilestones(milestoneData);

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

  const framesAlbums = extrasOrders.find(e => e.order_type === 'frames_albums') || null;
  const postWedding = extrasOrders.find(e => e.order_type === 'post_wedding_extras') || null;

  const hasSocialMediaRestriction = contract?.appointment_notes?.toLowerCase().includes('no social media') || false;

  const extrasNotes = extrasOrders
    .filter(e => e.notes)
    .map(e => e.notes as string);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        href="/admin/couples"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        All Couples
      </Link>

      <ClientCard
        coupleName={couple.couple_name}
        weddingDate={couple.wedding_date}
        receptionVenue={contract?.reception_venue || null}
        ceremonyVenue={contract?.ceremony_location || null}
        leadSource={couple.lead_source}
        bookedDate={couple.booked_date}
        signedDate={contract?.signed_date || null}
        packageType={couple.package_type || 'photo_video'}
        hasExtras={extrasOrders.length > 0}
        balance={balance}
        isArchived={milestones?.m35_archived || false}
        isComplete={milestones?.m36_complete || false}
      />

      <ClientJourney
        milestones={milestones}
        weddingDate={couple.wedding_date}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <TeamSection
          photo1={assignment?.photo_1 || contract?.photographer || null}
          photo2={assignment?.photo_2 || null}
          video1={assignment?.video_1 || contract?.videographer || null}
          assignmentStatus={assignment?.status || null}
          numPhotographers={contract?.num_photographers || 1}
          numVideographers={contract?.num_videographers || 0}
        />
        <NotesSection
          coupleNotes={couple.notes}
          contractNotes={contract?.appointment_notes || null}
          extrasNotes={extrasNotes}
          hasSocialMediaRestriction={hasSocialMediaRestriction}
        />
      </div>

      <FormsBox
        dayFormApproved={milestones?.m15_day_form_approved || false}
        photoOrderIn={milestones?.m24_photo_order_in || false}
        videoOrderIn={milestones?.m25_video_order_in || false}
        packageType={couple.package_type || 'photo_video'}
        coupleId={coupleId}
      />

      <FinancialLedger
        contractTotal={contractTotal}
        extrasTotal={extrasTotal}
        totalPaid={totalPaid}
        balance={balance}
        payments={payments}
        installments={installments}
        extrasOrders={extrasOrders}
        contractSignedDate={contract?.signed_date || null}
      />

      <ExtrasSection
        framesAlbums={framesAlbums}
        postWedding={postWedding}
        invoices={invoices}
      />

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
          totalPaid={totalPaid}
          balance={balance}
          numGuests={contract.num_guests}
          ceremonyLocation={contract.ceremony_location}
          receptionVenue={contract.reception_venue}
          isArchived={milestones?.m35_archived || false}
        />
      )}

      <FooterSummary
        contractTotal={contractTotal}
        extrasTotal={extrasTotal}
        grandTotal={grandTotal}
        totalPaid={totalPaid}
        balance={balance}
      />
    </div>
  );
}
