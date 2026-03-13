-- Add last_notifications_read_at column to users table
-- This tracks when a user last viewed their notifications
-- Virtual notifications (from posted_items and staff_payments) older than this timestamp are treated as read

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_notifications_read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_notifications_read_at';
