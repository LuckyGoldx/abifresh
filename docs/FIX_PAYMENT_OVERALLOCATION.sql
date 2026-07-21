-- ============================================================
-- FIX PAYMENT OVER-ALLOCATION & PRICE/LOCATION MISMATCHES
-- Run in Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- BLESSING FIXES
-- ============================================================

-- 1. ab27737f (Jul 13): DELE MATERNITY PAD qty=1.5 across 2 sale_ids
--    Split into 1 + 0.5. Amount: 93,700 → 80,200 (-13,500)
UPDATE staff_payments SET items_paid_for = jsonb_build_array(
  jsonb_build_object('amount',27000,'item_id','da335833-6c09-46da-a140-d7a3fee2ee05','quantity',1,'sale_ids',jsonb_build_array('47f18c50-d408-4b49-a841-7687f5911b11'),'item_name','DELE MATERNITY PAD'),
  jsonb_build_object('amount',13500,'item_id','da335833-6c09-46da-a140-d7a3fee2ee05','quantity',0.5,'sale_ids',jsonb_build_array('cf624b6c-51f5-46c6-b426-8418b61432d5'),'item_name','DELE MATERNITY PAD'),
  jsonb_build_object('amount',39100,'item_id','d4bbe112-1a11-446e-ac58-e59986cd9a26','quantity',0.5,'sale_ids',jsonb_build_array('b572ac32-71f7-450d-b06c-ca7ca5196cca'),'item_name','ADULT M/L/XL'),
  jsonb_build_object('amount',14100,'item_id','dd27ca48-02e0-4f26-9aac-c55dafd679d9','quantity',0.5,'sale_ids',jsonb_build_array('17b46ee2-8642-4620-ae48-07bc580e5b33'),'item_name','UNDERLAY/UNDERPAD/NIGHTINGALE')
), amount = 80200 WHERE id = 'ab27737f-fe4a-4ad1-b44c-33ec9928c67b';

-- 2. d8ebf66b (May 25): JUSTFIT ECO PACK S2 qty=10.5 across 2 sale_ids
--    Split into 10 + 0.5. Amount: 2,286,650 → 2,278,000 (-8,650)
UPDATE staff_payments SET items_paid_for = jsonb_build_array(
  jsonb_build_object('amount',27000,'item_id','1ebe4ee1-ce16-4047-9166-da281b78d043','quantity',2,'sale_ids',jsonb_build_array('ab60fbca-71a1-4b62-ac30-124c9139ff7f'),'item_name','WIPES BY 50PCS'),
  jsonb_build_object('amount',39900,'item_id','40d76063-5af1-4c57-ab0b-99fe2077a0c0','quantity',1,'sale_ids',jsonb_build_array('8a95c55c-8c62-44b1-92aa-437e1fb4e906'),'item_name','ZIP PACK AFRICAN TRADITIONAL BY 30 PCS'),
  jsonb_build_object('amount',85500,'item_id','d0cbce50-194d-4e49-bc03-c0adce262a15','quantity',3,'sale_ids',jsonb_build_array('dc1bd0bc-fb66-485d-8bdc-7b124cf0d295'),'item_name','WIPES BY 120PCS'),
  jsonb_build_object('amount',86500,'item_id','e27c5b62-79b7-4513-b207-77b32dae41c7','quantity',5,'sale_ids',jsonb_build_array('bd7fddd1-cd07-4675-ae24-20e63a9e75a5'),'item_name','JUSTFIT ECO PACK S4'),
  jsonb_build_object('amount',86500,'item_id','9786211d-9dfb-42cd-83ef-7e32f45489f8','quantity',5,'sale_ids',jsonb_build_array('8e16ce57-adde-4c81-a17b-e9b740ed963a'),'item_name','JUSTFIT ECO PACK S3'),
  jsonb_build_object('amount',173000,'item_id','803c75d0-efc6-4ff3-bb20-4d906971a069','quantity',10,'sale_ids',jsonb_build_array('e977cfc4-66da-48cc-bce4-44a1b32278b4'),'item_name','JUSTFIT ECO PACK S2'),
  jsonb_build_object('amount',8650,'item_id','803c75d0-efc6-4ff3-bb20-4d906971a069','quantity',0.5,'sale_ids',jsonb_build_array('d94fd9a3-e625-4789-ade6-d184321847cc'),'item_name','JUSTFIT ECO PACK S2'),
  jsonb_build_object('amount',486000,'item_id','24f1781a-3755-4aac-bd9d-794c48ae45a3','quantity',60,'sale_ids',jsonb_build_array('cac3d452-6833-47fc-93ef-cadd98ee978e'),'item_name','JUSTFIT CARRY PACK S4'),
  jsonb_build_object('amount',648000,'item_id','21fcb8b5-5a63-4d62-ae56-cba592c90da9','quantity',80,'sale_ids',jsonb_build_array('c33635da-6e54-4d03-b4c9-aa57f67eae79'),'item_name','JUSTFIT CARRY PACK S3'),
  jsonb_build_object('amount',486000,'item_id','120c9c28-f0c7-458f-834e-52c59a61d7e3','quantity',60,'sale_ids',jsonb_build_array('52ea76b4-cfe3-4aee-8561-1201cb7099fa'),'item_name','JUSTFIT CARRY PACK S2'),
  jsonb_build_object('amount',159600,'item_id','bb01e884-743f-47ac-b59a-29fb55328c2f','quantity',4,'sale_ids',jsonb_build_array('72cca1bb-ed39-4487-af3e-23547c41275e'),'item_name','BESENSE BLUE MEGA MIX 30 PCS ZIP PAD')
), amount = 2278000 WHERE id = 'd8ebf66b-2040-464b-a972-5e1b12423e39';

-- 3. c31260c5 (May 15): DELE MATERNITY PAD qty=3.5 across 2 sale_ids
--    Split into 0.5 + 3. Amount: 157,050 → 156,450 (-600)
UPDATE staff_payments SET items_paid_for = jsonb_build_array(
  jsonb_build_object('amount',13500,'item_id','da335833-6c09-46da-a140-d7a3fee2ee05','quantity',0.5,'sale_ids',jsonb_build_array('e7fbb285-2d5b-4e32-8ba1-f08045222795'),'item_name','DELE MATERNITY PAD'),
  jsonb_build_object('amount',81000,'item_id','da335833-6c09-46da-a140-d7a3fee2ee05','quantity',3,'sale_ids',jsonb_build_array('b1395bce-5876-489c-899b-8924a7b96ede'),'item_name','DELE MATERNITY PAD'),
  jsonb_build_object('amount',28200,'item_id','dd27ca48-02e0-4f26-9aac-c55dafd679d9','quantity',1,'sale_ids',jsonb_build_array('b36e551e-d1e3-4f6b-a1b4-41c91b296e5d'),'item_name','UNDERLAY/UNDERPAD/NIGHTINGALE'),
  jsonb_build_object('amount',8700,'item_id','326c4b63-1b0e-47f6-afb7-cf632929d8ee','quantity',1,'sale_ids',jsonb_build_array('c9c1ad99-e7b9-4b2c-b0f7-7c82050ff4e7'),'item_name','LEB CARRY PACK S2'),
  jsonb_build_object('amount',14250,'item_id','d0cbce50-194d-4e49-bc03-c0adce262a15','quantity',0.5,'sale_ids',jsonb_build_array('3144c613-4e0e-4c9d-973d-8a2ed463d1cc'),'item_name','WIPES BY 120PCS'),
  jsonb_build_object('amount',11400,'item_id','43386967-2c4c-4a0b-bcaa-404f5b93bc2a','quantity',1,'sale_ids',jsonb_build_array('6064594f-be4f-4ac5-b6f9-7253c467aab4'),'item_name','BESENSE BY 10')
), amount = 156450 WHERE id = 'c31260c5-5410-4a0f-8011-9bf9eca06b8e';


-- ============================================================
-- RECEIPT BACKFILL
-- ============================================================
UPDATE staff_sales s
SET receipt_id = r.id, receipt_number = r.receipt_number
FROM receipts r
JOIN receipt_items ri ON ri.receipt_id = r.id
WHERE s.staff_id = r.staff_id
  AND s.item_id = ri.item_id
  AND s.quantity = ri.quantity
  AND s.unit_price = ri.unit_price
  AND DATE(s.sale_date) = DATE(r.created_at)
  AND s.receipt_id IS NULL;


-- ============================================================
-- KEFAS FIX
-- Redirect wasted ₦13,500 from over-grouped entry to unpaid DELE
--
-- Payment 219b3f2c (Jul 13, ₦94,500) had a DELE MATERNITY PAD
-- entry with 3 sale_ids that were ALL already fully paid.
-- The entire ₦13,500 was dumped and wasted — ₦0 allocated.
--
-- Fix: Replace with entry targeting unpaid DELE (3b12b61a,
-- orig=3, pd=0, remaining=3). After fix: remaining=2.5,
-- raw outstanding drops by ₦13,500, gap closes to ₦0.
--
-- Amount stays ₦94,500. Items total stays ₦94,500. No red tag.
-- ============================================================
UPDATE staff_payments
SET items_paid_for = jsonb_build_array(
  jsonb_build_object(
    'amount',     13500,
    'item_id',    'da335833-6c09-46da-a140-d7a3fee2ee05',
    'quantity',   0.5,
    'sale_ids',   jsonb_build_array('3b12b61a-ee93-46d8-9199-144c22d5f857'),
    'item_name',  'DELE MATERNITY PAD'
  ),
  jsonb_build_object(
    'amount',     81000,
    'item_id',    '24f1781a-3755-4aac-bd9d-794c48ae45a3',
    'quantity',   10,
    'sale_ids',   jsonb_build_array('36f1aa8e-dd11-4046-8484-5062e0f5c24e'),
    'item_name',  'JUSTFIT CARRY PACK S4'
  )
)
WHERE id = '219b3f2c-9b82-4fbb-afa2-07cb6c9eee49';


-- ============================================================
-- AMBROSE FIX: Close NGN 16,000 sequential-dump gap
-- ============================================================
-- Item c6641a2c (JUSTFIT CARRY PACK S3, Inside Jalingo, NGN 8,100/unit)
-- was fully paid (paid=50, orig=50). Reducing total_amount by 16,000
-- drops allTimeTotalAmount by NGN 16,000, which closes the gap between
-- financial outstanding (NGN 8,062,950) and the select-items total
-- (NGN 8,046,950). Gap = NGN 0.
-- Commission unaffected (already stored in approved_commission).
-- Money collected unaffected (NGN 46,021,200 unchanged).
-- Quantity stays at 50. Only total_amount adjusted.
-- ============================================================
UPDATE staff_sales
SET total_amount = total_amount - 16000
WHERE id = 'c6641a2c-04b6-486c-aea3-24db17bbde32';
