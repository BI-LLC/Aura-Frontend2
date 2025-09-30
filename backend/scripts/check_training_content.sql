-- Check what training content we actually have
-- Let's see what's in the database now

-- Check all training_data records
SELECT 
    id,
    assistant_key,
    prompt,
    LEFT(response, 100) as response_preview,
    tenant_id,
    created_at
FROM training_data 
ORDER BY created_at DESC
LIMIT 10;

-- Check for any BIC/Bibhrajit related content
SELECT 
    id,
    assistant_key,
    prompt,
    response
FROM training_data 
WHERE 
    LOWER(prompt) LIKE '%bic%' OR 
    LOWER(prompt) LIKE '%bibhrajit%' OR
    LOWER(response) LIKE '%bic%' OR 
    LOWER(response) LIKE '%bibhrajit%'
ORDER BY created_at DESC;
