-- Add location column to returned_items table for tracking inside/outside Jalingo
ALTER TABLE returned_items ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'Inside Jalingo';

-- Update index to include location for faster queries
CREATE INDEX IF NOT EXISTS idx_returned_items_location ON returned_items(location);
