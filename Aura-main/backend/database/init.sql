-- AURA Voice AI Database Schema
-- Includes tenant isolation, document processing, and storage tracking

-- =====================================================
-- TENANT MANAGEMENT TABLES 
-- =====================================================

-- Tenants table - Each client organization gets their own workspace
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id VARCHAR(255) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255) NOT NULL UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'standard', -- standard, premium, enterprise
    max_storage_gb INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 10,
    max_api_calls_monthly INTEGER DEFAULT 10000,
    custom_settings JSONB DEFAULT '{}',
    api_keys JSONB DEFAULT '{}', -- Their own API keys
    custom_logo TEXT,
    brand_colors JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_tenant_active (is_active),
    INDEX idx_tenant_subscription (subscription_tier)
);

-- Tenant users - Users within each organization
CREATE TABLE IF NOT EXISTS tenant_users (
    user_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, manager, user
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    persona_settings JSONB DEFAULT '{}',
    voice_preference VARCHAR(100),
    can_upload_documents BOOLEAN DEFAULT TRUE,
    can_modify_ai_settings BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    UNIQUE(tenant_id, email),
    INDEX idx_tenant_users (tenant_id),
    INDEX idx_user_role (role)
);

-- Tenant storage tracking
CREATE TABLE IF NOT EXISTS tenant_storage (
    tenant_id VARCHAR(255) PRIMARY KEY,
    total_storage_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 10737418240, -- 10GB default
    document_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- =====================================================
-- DOCUMENT MANAGEMENT TABLES 
-- =====================================================

-- Documents table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS documents (
    doc_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL, -- CRITICAL: Links to tenant
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL, -- File size in bytes
    file_type VARCHAR(50) NOT NULL, -- pdf, docx, txt, md, csv
    content_preview TEXT, -- First 1000 chars
    chunks_count INTEGER DEFAULT 0,
    metadata JSONB, -- File metadata, page count, etc.
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE, -- Document processing status
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    INDEX idx_documents_tenant (tenant_id),
    INDEX idx_documents_user (user_id),
    INDEX idx_documents_type (file_type),
    INDEX idx_documents_status (processing_status),
    INDEX idx_documents_upload_time (upload_time)
);

-- Document chunks for semantic search - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL, -- CRITICAL: Links to tenant
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536), -- For semantic similarity search
    metadata JSONB, -- Page number, section, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id, tenant_id) REFERENCES documents(doc_id, tenant_id) ON DELETE CASCADE,
    INDEX idx_chunks_tenant (tenant_id),
    INDEX idx_chunks_doc (doc_id),
    INDEX idx_chunks_embeddings (embedding USING ivfflat)
);

-- Document processing queue for background tasks
CREATE TABLE IF NOT EXISTS document_processing_queue (
    queue_id SERIAL PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (doc_id, tenant_id) REFERENCES documents(doc_id, tenant_id) ON DELETE CASCADE,
    INDEX idx_queue_tenant (tenant_id),
    INDEX idx_queue_status (status),
    INDEX idx_queue_priority (priority),
    INDEX idx_queue_created (created_at)
);

-- Document access logs for audit trail
CREATE TABLE IF NOT EXISTS document_access_logs (
    log_id SERIAL PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    access_type VARCHAR(50), -- upload, view, search, delete, download
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    FOREIGN KEY (doc_id, tenant_id) REFERENCES documents(doc_id, tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    INDEX idx_logs_tenant (tenant_id),
    INDEX idx_logs_doc (doc_id),
    INDEX idx_logs_user (user_id),
    INDEX idx_logs_timestamp (timestamp),
    INDEX idx_logs_type (access_type)
);


-- User preferences table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL, -- Added tenant isolation
    communication_style VARCHAR(50) DEFAULT 'conversational',
    response_pace VARCHAR(50) DEFAULT 'normal',
    expertise_areas TEXT[], -- Array of strings
    preferred_examples VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_preferences_tenant (tenant_id)
);

-- User personas table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS user_personas (
    user_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL, -- Added tenant isolation
    formality VARCHAR(50) DEFAULT 'balanced',
    detail_level VARCHAR(50) DEFAULT 'normal',
    example_style VARCHAR(50) DEFAULT 'mixed',
    questioning VARCHAR(50) DEFAULT 'direct',
    energy VARCHAR(50) DEFAULT 'moderate',
    confidence FLOAT DEFAULT 0.8,
    sessions_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_personas_tenant (tenant_id),
    INDEX idx_personas_confidence (confidence)
);

-- Conversation summaries - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS conversation_summaries (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL, -- Added tenant isolation
    summary TEXT,
    key_topics TEXT[],
    message_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_conversations_tenant (tenant_id),
    INDEX idx_conversations_user (user_id),
    INDEX idx_conversations_timestamp (timestamp)
);

-- A/B testing results - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS ab_test_results (
    test_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL, -- Added tenant isolation
    test_attribute VARCHAR(50),
    original_value VARCHAR(50),
    test_value VARCHAR(50),
    engagement_score FLOAT,
    selected BOOLEAN DEFAULT FALSE,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_tests_tenant (tenant_id),
    INDEX idx_tests_user (user_id)
);

-- API usage tracking - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL, -- Added tenant isolation
    api_name VARCHAR(50) NOT NULL, -- 'grok', 'openai', 'elevenlabs'
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    request_time FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    INDEX idx_usage_tenant (tenant_id),
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_api (api_name),
    INDEX idx_usage_timestamp (timestamp)
);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_personas_updated_at 
    BEFORE UPDATE ON user_personas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update tenant storage when documents change
CREATE OR REPLACE FUNCTION update_tenant_storage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add document size to tenant storage
        INSERT INTO tenant_storage (tenant_id, total_storage_bytes, document_count)
        VALUES (NEW.tenant_id, NEW.file_size, 1)
        ON CONFLICT (tenant_id) DO UPDATE SET
            total_storage_bytes = tenant_storage.total_storage_bytes + NEW.file_size,
            document_count = tenant_storage.document_count + 1,
            last_updated = CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Subtract document size from tenant storage
        UPDATE tenant_storage 
        SET total_storage_bytes = total_storage_bytes - OLD.file_size,
            document_count = GREATEST(document_count - 1, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE tenant_id = OLD.tenant_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle file size changes
        IF OLD.file_size != NEW.file_size THEN
            UPDATE tenant_storage 
            SET total_storage_bytes = total_storage_bytes - OLD.file_size + NEW.file_size,
                last_updated = CURRENT_TIMESTAMP
            WHERE tenant_id = NEW.tenant_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply storage update trigger to documents table
CREATE TRIGGER update_tenant_storage_trigger
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_storage();

-- Function to create default tenant storage record
CREATE OR REPLACE FUNCTION create_default_tenant_storage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_storage (tenant_id, total_storage_bytes, storage_limit_bytes, document_count)
    VALUES (NEW.tenant_id, 0, NEW.max_storage_gb * 1073741824, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply default storage creation trigger to tenants table
CREATE TRIGGER create_default_tenant_storage_trigger
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_tenant_storage();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_tenant_user ON documents(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type ON documents(tenant_id, file_type);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents(tenant_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_doc ON document_chunks(tenant_id, doc_id);
CREATE INDEX IF NOT EXISTS idx_queue_tenant_status ON document_processing_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_timestamp ON document_access_logs(tenant_id, timestamp);

-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert a default tenant for testing (remove in production)
INSERT INTO tenants (tenant_id, organization_name, admin_email, subscription_tier) 
VALUES ('default-tenant-001', 'Default Organization', 'admin@default.com', 'standard')
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert a default admin user (remove in production)
INSERT INTO tenant_users (user_id, tenant_id, email, role, name)
VALUES ('default-user-001', 'default-tenant-001', 'admin@default.com', 'admin', 'Default Admin')
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- PERMISSIONS (ADJUST AS NEEDED)
-- =====================================================

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aura;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aura;

-- =====================================================
-- SCHEMA VALIDATION
-- =====================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'tenants', 'tenant_users', 'tenant_storage', 'documents', 
        'document_chunks', 'document_processing_queue', 'document_access_logs',
        'user_preferences', 'user_personas', 'conversation_summaries', 
        'ab_test_results', 'api_usage'
    );
    
    RAISE NOTICE 'Successfully created % tables for multi-tenant document management', table_count;
END $$;