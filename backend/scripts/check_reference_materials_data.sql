-- Check what's actually in the reference_materials table
-- Run this in Supabase SQL Editor

-- Check all reference materials data
SELECT 
    id,
    filename,
    original_filename,
    assistant_key,
    tenant_id,
    LEFT(content, 200) as content_preview,
    file_size,
    created_at
FROM reference_materials 
ORDER BY created_at DESC;

-- Check if we have the BIC file specifically
SELECT 
    assistant_key,
    filename,
    original_filename,
    LENGTH(content) as content_length,
    content IS NOT NULL as has_content
FROM reference_materials 
WHERE filename LIKE '%Bibhrajit%' OR original_filename LIKE '%Bibhrajit%';

-- Check if any reference materials have assistant_key = 'bib-halder'
SELECT COUNT(*) as count_for_bib_halder
FROM reference_materials 
WHERE assistant_key = 'bib-halder';

-- See what assistant_key values we actually have
SELECT DISTINCT assistant_key, COUNT(*) as count
FROM reference_materials 
GROUP BY assistant_key;
