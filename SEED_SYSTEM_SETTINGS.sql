-- ============================================================================
-- SYSTEM SETTINGS SEED
-- ============================================================================
-- Default configuration values for AbiFresh Kiddies Ventures.
-- Run in Supabase SQL Editor after creating system_settings table.
-- Uses ON CONFLICT DO NOTHING — safe to run multiple times.
-- ============================================================================

INSERT INTO public.system_settings (setting_key, setting_value, description, setting_type)
VALUES
  ('store_name',              'AbiFresh Kiddies Ventures',  'Name of the store',                          'string'),
  ('store_location',          'Jalingo, Taraba State',       'Store physical location',                    'string'),
  ('currency',                'NGN',                         'Currency code (ISO 4217)',                   'string'),
  ('currency_symbol',         '₦',                           'Currency display symbol',                    'string'),
  ('commission_rate_default', '10',                          'Default commission rate (%)',                 'number'),
  ('low_stock_threshold',     '5',                           'Alert when stock falls below this quantity', 'number'),
  ('backup_retention_days',   '90',                          'Days to keep backup_history records',        'number'),
  ('contact_phone',           '+234',                        'Store contact phone number',                 'string'),
  ('contact_email',           'admin@abifresh.com',          'Store contact / admin email',                'string')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify
SELECT setting_key, setting_value, description FROM public.system_settings ORDER BY setting_key;
