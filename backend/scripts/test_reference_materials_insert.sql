-- Test if reference_materials table can accept the required columns
-- Run this to see what columns exist and test an insert

-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reference_materials' 
ORDER BY ordinal_position;

-- Test insert with all required columns
INSERT INTO reference_materials (
    filename,
    original_filename,
    file_type,
    file_size,
    content,
    uploaded_by,
    assistant_key,
    tenant_id
) VALUES (
    'test/test.txt',
    'test.txt',
    'text/plain',
    100,
    'Test content',
    'test-user',
    'bib-halder',
    '00000000-0000-0000-0000-000000000001'
);

-- Check if insert worked
SELECT * FROM reference_materials WHERE filename = 'test/test.txt';
