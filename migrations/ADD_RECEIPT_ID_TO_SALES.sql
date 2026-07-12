-- ============================================================================
-- Migration: Add receipt_id FK to staff_sales and sales tables
-- ============================================================================
-- Links staff_sales and sales records back to their originating receipt.
-- This enables detecting orphaned receipts (where staff_sales creation failed)
-- and reconciling till transactions with staff records.
--
-- Run in Supabase SQL Editor after the main schema migrations.
-- ============================================================================

BEGIN;

-- Add receipt_id to staff_sales
ALTER TABLE public.staff_sales
ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_sales_receipt_id ON public.staff_sales(receipt_id);

COMMENT ON COLUMN public.staff_sales.receipt_id IS 'References the receipt created at checkout time. NULL if receipt creation failed before the sale was recorded.';

-- Add receipt_id to sales (portal sales)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_receipt_id ON public.sales(receipt_id);

COMMENT ON COLUMN public.sales.receipt_id IS 'References the receipt created at checkout time. NULL if receipt creation failed before the sale was recorded.';

COMMIT;
