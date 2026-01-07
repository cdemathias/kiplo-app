-- Add scheduled_date column to agenda_items table
ALTER TABLE agenda_items 
ADD COLUMN scheduled_date DATE;

-- Create index for efficient date-based filtering
CREATE INDEX IF NOT EXISTS idx_agenda_items_scheduled_date ON agenda_items(scheduled_date);

