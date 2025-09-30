-- Check Current Table Structure
-- Run this first to see what columns exist in your current tables

-- Check training_data table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'training_data' 
ORDER BY ordinal_position;

-- Check logic_notes table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'logic_notes' 
ORDER BY ordinal_position;

-- Check reference_materials table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reference_materials' 
ORDER BY ordinal_position;

-- Check assistant_voice_prefs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assistant_voice_prefs' 
ORDER BY ordinal_position;

-- Also check what data currently exists
SELECT 'training_data' as table_name, count(*) as record_count FROM training_data
UNION ALL
SELECT 'logic_notes' as table_name, count(*) as record_count FROM logic_notes  
UNION ALL
SELECT 'reference_materials' as table_name, count(*) as record_count FROM reference_materials
UNION ALL  
SELECT 'assistant_voice_prefs' as table_name, count(*) as record_count FROM assistant_voice_prefs;
