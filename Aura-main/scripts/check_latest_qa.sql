-- Check if the latest Q&A pair was saved to Supabase
-- Run this in Supabase SQL Editor

-- Check for the "villian" question in training_data
SELECT 
    id,
    tenant_id,
    assistant_key,
    prompt,
    response,
    tags,
    created_at
FROM training_data 
WHERE prompt ILIKE '%villian%' 
   OR prompt ILIKE '%villain%'
ORDER BY created_at DESC;

-- Also check all recent entries
SELECT 
    id,
    assistant_key,
    prompt,
    LEFT(response, 100) as response_preview,
    created_at
FROM training_data 
ORDER BY created_at DESC 
LIMIT 10;
