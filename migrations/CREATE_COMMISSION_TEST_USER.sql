-- ============================================================================
-- CREATE TEST COMMISSION STAFF USER
-- For testing make-sale functionality
-- ============================================================================

-- Create the commission staff user in the users table
-- (Note: This assumes Supabase Auth is NOT checking password hashes)
-- For full integration with Supabase Auth, you'd need to create it there too

INSERT INTO public.users (
  email,
  username,
  full_name,
  role,
  phone_number,
  store_location,
  is_active
) VALUES (
  'commission@test.com',
  'commission',
  'Commission Staff',
  'commission_staff',
  '+2348012345681',
  'Jalingo',
  true
) ON CONFLICT (username) DO UPDATE 
SET role = 'commission_staff', is_active = true;

-- ALSO: Override credentials for Supabase Auth fallback
-- This allows login via custom JWT without needing Supabase Auth user
-- Add to your .env.local:
-- OVERRIDE_CREDS=admin:admin123,commission:com123,jane_commission:admin123

-- Verify user was created/updated
SELECT id, username, email, role, is_active FROM public.users WHERE username = 'commission';

-- Create sample posted items for this user to make sales from
-- First, get the commission staff user ID
DO $$
DECLARE
  v_staff_id UUID;
  v_item_id UUID;
BEGIN
  -- Get commission staff user
  SELECT id INTO v_staff_id FROM public.users WHERE username = 'commission' LIMIT 1;
  
  IF v_staff_id IS NOT NULL THEN
    -- Get a sample item
    SELECT id INTO v_item_id FROM public.items LIMIT 1;
    
    IF v_item_id IS NOT NULL THEN
      -- Add item to their store if not already there
      INSERT INTO public.staff_store (
        staff_id,
        item_id,
        quantity,
        quantity_sold,
        unit_price,
        posted_by,
        posted_date
      ) VALUES (
        v_staff_id,
        v_item_id,
        50,
        0,
        1000,
        v_staff_id,
        NOW()
      ) ON CONFLICT (staff_id, item_id) DO NOTHING;
      
      RAISE NOTICE 'Added item % to % staff store', v_item_id, v_staff_id;
    END IF;
  END IF;
END $$;
