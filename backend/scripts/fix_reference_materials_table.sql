-- Fix reference_materials table by adding missing assistant_key column
-- Run this in Supabase SQL editor

-- Check current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reference_materials' 
ORDER BY ordinal_position;

-- Add assistant_key column if it doesn't exist
ALTER TABLE reference_materials 
ADD COLUMN IF NOT EXISTS assistant_key TEXT;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reference_materials' 
ORDER BY ordinal_position;
