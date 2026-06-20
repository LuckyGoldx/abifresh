/**
 * BACKFILL APPROVED COMMISSION FOR APPROVED PAYMENTS
 * 
 * Recalculates approved_commission for all previously approved payments
 * from commission staff.
 * 
 *   commission_rate      → Item's commission rate at sale time (historical snapshot)
 *   approved_commission  → Commission earned, calculated ONLY after payment is approved
 *   commission           → UNCHANGED — legacy fallback value
 * 
 * Run with: npx ts-node backfill-commissions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Fallback: try frontend/.env.local if not found
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: 'frontend/.env.local' });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const COMMISSION_ROLES = ['commission_staff', 'staff_commission'];

async function backfillCommissions() {
  console.log('\n=== APPROVED COMMISSION BACKFILL ===\n');

  // Step 1: Get all commission staff
  console.log('Step 1: Fetching commission staff...');
  const { data: staffUsers, error: staffErr } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', COMMISSION_ROLES);

  if (staffErr) { console.error('Error fetching staff:', staffErr); return; }

  const staffIds = (staffUsers || []).map((s: any) => s.id);
  const staffMap: Record<string, any> = {};
  (staffUsers || []).forEach((s: any) => { staffMap[s.id] = s; });
  console.log(`Found ${staffIds.length} commission staff members\n`);

  // Step 1.5: Refresh commission_rate from current items.commission for all commission staff sales
  console.log('Step 1.5: Refreshing commission_rate from inventory...');
  const { data: items } = await supabase.from('items').select('id, commission');
  if (items) {
    for (const item of items) {
      if (item.commission != null) {
        await supabase
          .from('staff_sales')
          .update({ commission_rate: item.commission })
          .eq('item_id', item.id)
          .in('staff_id', staffIds);
      }
    }
  }
  console.log('Commission rates refreshed.\n');

  // Step 2: Get all items for fallback commission rate lookup
  console.log('Step 2: Fetching item commission rates...');
  const { data: allItems } = await supabase.from('items').select('id, commission');
  const liveCommissionMap: Record<string, number> = {};
  (allItems || []).forEach((item: any) => {
    liveCommissionMap[item.id] = parseFloat(item.commission) || 0;
  });

  // Step 3: Reset approved_commission to 0 for commission staff sales
  console.log('Step 3: Resetting approved_commission to 0...');
  const { error: resetErr } = await supabase
    .from('staff_sales')
    .update({ approved_commission: 0 })
    .in('staff_id', staffIds);

  if (resetErr) { console.error('Error resetting:', resetErr); return; }
  console.log('Approved commissions reset to 0.\n');

  // Step 4: Get all approved payments from commission staff with items_paid_for
  console.log('Step 4: Fetching approved payments...');
  const { data: approvedPayments, error: pmtErr } = await supabase
    .from('staff_payments')
    .select('id, staff_id, items_paid_for')
    .in('staff_id', staffIds)
    .eq('status', 'approved');

  if (pmtErr) { console.error('Error fetching payments:', pmtErr); return; }

  const paymentsWithItems = (approvedPayments || []).filter(
    (p: any) => p.items_paid_for && Array.isArray(p.items_paid_for) && p.items_paid_for.length > 0
  );
  console.log(`Found ${paymentsWithItems.length} approved payments with items_paid_for\n`);

  // Step 5: Recalculate commissions
  let totalCommissionGenerated = 0;
  let totalSalesUpdated = 0;
  let errors = 0;

  for (const payment of paymentsWithItems) {
    try {
      for (const paidItem of payment.items_paid_for) {
        const saleIds: string[] = Array.isArray(paidItem.sale_ids)
          ? paidItem.sale_ids
          : paidItem.sale_id ? [paidItem.sale_id] : [];
        if (saleIds.length === 0) continue;

        const paidQuantity = parseFloat(paidItem.quantity) || 0;
        if (paidQuantity <= 0) continue;

        const { data: salesRecords } = await supabase
          .from('staff_sales')
          .select('id, quantity, commission_rate')
          .in('id', saleIds)
          .eq('staff_id', payment.staff_id);

        if (!salesRecords || salesRecords.length === 0) { errors++; continue; }

        const saleMap: Record<string, { quantity: number; commissionRate: number }> = {};
        let totalOriginalQty = 0;
        salesRecords.forEach((s: any) => {
          const qty = parseFloat(s.quantity) || 0;
          const rate = parseFloat(s.commission_rate) || liveCommissionMap[paidItem.item_id] || 0;
          saleMap[s.id] = { quantity: qty, commissionRate: rate };
          totalOriginalQty += qty;
        });
        if (totalOriginalQty <= 0) continue;

        let remainingQty = paidQuantity;
        const updates: { id: string; approved_commission: number; commission_rate?: number }[] = [];

        for (const sale of salesRecords) {
          if (remainingQty <= 0) break;
          const { quantity: origQty, commissionRate } = saleMap[sale.id];
          if (commissionRate <= 0) continue;

          const proportion = origQty / totalOriginalQty;
          const allocatedQty = Math.min(remainingQty, Math.round(paidQuantity * proportion * 10) / 10);
          const finalAllocated = Math.min(allocatedQty, origQty);
          const commissionEarned = Math.round(finalAllocated * commissionRate * 100) / 100;

          const updateEntry: any = { id: sale.id, approved_commission: commissionEarned };
          if ((sale as any).commission_rate == null && liveCommissionMap[paidItem.item_id]) {
            updateEntry.commission_rate = liveCommissionMap[paidItem.item_id];
          }
          updates.push(updateEntry);
          remainingQty -= finalAllocated;
        }

        for (const update of updates) {
          const updateData: any = { approved_commission: update.approved_commission };
          if (update.commission_rate !== undefined) {
            updateData.commission_rate = update.commission_rate;
          }
          await supabase.from('staff_sales').update(updateData).eq('id', update.id);

          totalCommissionGenerated += update.approved_commission;
          totalSalesUpdated++;
        }
      }
    } catch (err) {
      console.error(`Error processing payment ${payment.id}:`, err);
      errors++;
    }
  }

  // Step 6: Summary
  console.log('\n=== BACKFILL COMPLETE ===');
  console.log(`Total approved commission generated: ₦${totalCommissionGenerated.toLocaleString()}`);
  console.log(`Total sales records updated: ${totalSalesUpdated}`);
  console.log(`Errors: ${errors}\n`);

  // Step 7: Per-staff summary
  console.log('Per-Staff Summary:');
  for (const staffId of staffIds) {
    const { data: summary } = await supabase
      .from('staff_sales')
      .select('approved_commission')
      .eq('staff_id', staffId);

    const totalCommission = (summary || []).reduce(
      (sum: number, s: any) => sum + (parseFloat(s.approved_commission) || 0), 0
    );

    const staff = staffMap[staffId];
    console.log(`  ${staff?.full_name || staffId}: ₦${totalCommission.toLocaleString()}`);
  }
}

backfillCommissions().catch(console.error);
