-- Fix Assistant Keys - Update from underscore to slug format
-- IMPORTANT: Only run the UPDATE commands for tables that have the assistant_key column!
-- Run check_table_structure.sql first to see which columns exist

-- Update training_data table (if assistant_key column exists)
-- UPDATE training_data 
-- SET assistant_key = 'bib-halder' 
-- WHERE assistant_key = 'bib_halder';

-- Update logic_notes table (if assistant_key column exists)
-- UPDATE logic_notes 
-- SET assistant_key = 'bib-halder'
-- WHERE assistant_key = 'bib_halder';

-- Update reference_materials table (if assistant_key column exists)
-- UPDATE reference_materials 
-- SET assistant_key = 'bib-halder'
-- WHERE assistant_key = 'bib_halder';

-- Update assistant_voice_prefs table (if assistant_key column exists)
-- UPDATE assistant_voice_prefs 
-- SET assistant_key = 'bib-halder'
-- WHERE assistant_key = 'bib_halder';

-- Verify the updates
SELECT 'training_data' as table_name, assistant_key, count(*) as count 
FROM training_data 
WHERE assistant_key IN ('bib-halder', 'bib_halder')
GROUP BY assistant_key
UNION ALL
SELECT 'logic_notes' as table_name, assistant_key, count(*) as count 
FROM logic_notes 
WHERE assistant_key IN ('bib-halder', 'bib_halder')
GROUP BY assistant_key
UNION ALL
SELECT 'reference_materials' as table_name, assistant_key, count(*) as count 
FROM reference_materials 
WHERE assistant_key IN ('bib-halder', 'bib_halder')
GROUP BY assistant_key
UNION ALL
SELECT 'assistant_voice_prefs' as table_name, assistant_key, count(*) as count 
FROM assistant_voice_prefs 
WHERE assistant_key IN ('bib-halder', 'bib_halder')
GROUP BY assistant_key
ORDER BY table_name, assistant_key;
