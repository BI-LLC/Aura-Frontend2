-- Fix all assistant_key values to use consistent slug format
-- This will convert Bib_Halder -> bib-halder across all tables

-- Update training_data table
UPDATE training_data 
SET assistant_key = 'bib-halder' 
WHERE assistant_key = 'Bib_Halder' OR assistant_key = 'bib_halder';

-- Update logic_notes table (if it has assistant_key column)
UPDATE logic_notes 
SET assistant_key = 'bib-halder' 
WHERE assistant_key = 'Bib_Halder' OR assistant_key = 'bib_halder';

-- Update reference_materials table (if it has assistant_key column)  
UPDATE reference_materials 
SET assistant_key = 'bib-halder' 
WHERE assistant_key = 'Bib_Halder' OR assistant_key = 'bib_halder';

-- Update assistant_voice_prefs table
UPDATE assistant_voice_prefs 
SET assistant_key = 'bib-halder' 
WHERE assistant_key = 'Bib_Halder' OR assistant_key = 'bib_halder';

-- Verify the changes
SELECT 'training_data' as table_name, assistant_key, COUNT(*) as count
FROM training_data 
GROUP BY assistant_key
UNION ALL
SELECT 'logic_notes' as table_name, assistant_key, COUNT(*) as count  
FROM logic_notes 
GROUP BY assistant_key
UNION ALL
SELECT 'reference_materials' as table_name, assistant_key, COUNT(*) as count
FROM reference_materials 
GROUP BY assistant_key
UNION ALL
SELECT 'assistant_voice_prefs' as table_name, assistant_key, COUNT(*) as count
FROM assistant_voice_prefs 
GROUP BY assistant_key;
