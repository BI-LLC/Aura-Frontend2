-- Simple Column Check
-- Just see what columns exist in each training table

-- Check training_data columns
SELECT 'training_data' as table_name, column_name
FROM information_schema.columns 
WHERE table_name = 'training_data'
ORDER BY ordinal_position;

-- Check logic_notes columns  
SELECT 'logic_notes' as table_name, column_name
FROM information_schema.columns 
WHERE table_name = 'logic_notes'
ORDER BY ordinal_position;

-- Check reference_materials columns
SELECT 'reference_materials' as table_name, column_name
FROM information_schema.columns 
WHERE table_name = 'reference_materials'
ORDER BY ordinal_position;

-- Check assistant_voice_prefs columns
SELECT 'assistant_voice_prefs' as table_name, column_name
FROM information_schema.columns 
WHERE table_name = 'assistant_voice_prefs'
ORDER BY ordinal_position;
