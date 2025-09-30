-- Fix Training Data Assistant Keys
-- Update from underscore format to slug format

-- Update training_data table
UPDATE training_data 
SET assistant_key = 'bib-halder' 
WHERE assistant_key = 'bib_halder';

-- Also update assistant_voice_prefs table if needed
UPDATE assistant_voice_prefs 
SET assistant_key = 'bib-halder'
WHERE assistant_key = 'bib_halder';

-- Verify the fix worked
SELECT 
    id,
    prompt,
    response,
    assistant_key,
    tenant_id
FROM training_data 
WHERE assistant_key IN ('bib-halder', 'bib_halder')
ORDER BY created_at;
