-- Check structure of all training-related tables
-- Run this in Supabase SQL editor to verify columns

-- Check training_data table
SELECT 'training_data' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'training_data' 
ORDER BY ordinal_position;

-- Check logic_notes table  
SELECT 'logic_notes' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'logic_notes' 
ORDER BY ordinal_position;

-- Check reference_materials table
SELECT 'reference_materials' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reference_materials' 
ORDER BY ordinal_position;

-- Check assistant_voice_prefs table
SELECT 'assistant_voice_prefs' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assistant_voice_prefs' 
ORDER BY ordinal_position;
