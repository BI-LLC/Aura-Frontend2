-- Debug Training Data Retrieval Issues
-- Let's find out exactly what's happening

-- 1. Check training_data table contents
SELECT 'TRAINING_DATA' as source, count(*) as count FROM training_data;
SELECT 'LOGIC_NOTES' as source, count(*) as count FROM logic_notes;  
SELECT 'REFERENCE_MATERIALS' as source, count(*) as count FROM reference_materials;
SELECT 'DOCUMENTS' as source, count(*) as count FROM documents;

-- 2. See what assistant_keys we have
SELECT DISTINCT assistant_key, count(*) as records 
FROM training_data 
GROUP BY assistant_key;

-- 3. Check if there's any BIC content anywhere
SELECT 'training_data' as table_name, prompt, response
FROM training_data 
WHERE LOWER(prompt || ' ' || response) LIKE '%bibhrajit%' 
   OR LOWER(prompt || ' ' || response) LIKE '%bic%'
LIMIT 5;

-- 4. Check documents table for uploaded files
SELECT filename, file_type, upload_time, LEFT(content_preview, 100) as preview
FROM documents 
ORDER BY upload_time DESC 
LIMIT 5;
