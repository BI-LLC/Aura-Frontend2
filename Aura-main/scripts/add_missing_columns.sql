-- Add Missing Columns to Existing Tables
-- This will add the assistant_key columns if they don't exist
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add assistant_key column to logic_notes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'logic_notes' AND column_name = 'assistant_key') THEN
        ALTER TABLE logic_notes ADD COLUMN assistant_key VARCHAR(255);
        COMMENT ON COLUMN logic_notes.assistant_key IS 'Assistant identifier (slug format)';
    END IF;
END $$;

-- Add assistant_key column to reference_materials if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reference_materials' AND column_name = 'assistant_key') THEN
        ALTER TABLE reference_materials ADD COLUMN assistant_key VARCHAR(255);
        COMMENT ON COLUMN reference_materials.assistant_key IS 'Assistant identifier (slug format)';
    END IF;
END $$;

-- Add assistant_key column to training_data if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'training_data' AND column_name = 'assistant_key') THEN
        ALTER TABLE training_data ADD COLUMN assistant_key VARCHAR(255);
        COMMENT ON COLUMN training_data.assistant_key IS 'Assistant identifier (slug format)';
    END IF;
END $$;

-- Create assistant_voice_prefs table if it doesn't exist
CREATE TABLE IF NOT EXISTS assistant_voice_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_key VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'elevenlabs',
    voice_id VARCHAR(100) NOT NULL,
    model VARCHAR(50) DEFAULT 'eleven_multilingual_v2',
    params JSONB DEFAULT '{"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one voice config per assistant per tenant
    CONSTRAINT unique_assistant_voice_per_tenant UNIQUE (assistant_key, tenant_id)
);

-- Create index if table was just created
CREATE INDEX IF NOT EXISTS idx_assistant_voice_prefs_assistant ON assistant_voice_prefs(assistant_key);
CREATE INDEX IF NOT EXISTS idx_assistant_voice_prefs_tenant ON assistant_voice_prefs(tenant_id);

-- Show current table structure after changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('training_data', 'logic_notes', 'reference_materials', 'assistant_voice_prefs')
    AND column_name IN ('id', 'assistant_key', 'tenant_id', 'prompt', 'response', 'title', 'content')
ORDER BY table_name, ordinal_position;
