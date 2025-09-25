-- AURA Voice AI Database Schema for Supabase
-- Migrated from PostgreSQL to Supabase with RLS policies
-- Run this in your Supabase SQL editor

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================

-- Enable vector extension for embeddings
-- Note: Installing in public schema is standard practice for Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TENANT MANAGEMENT TABLES 
-- =====================================================

-- Tenants table - Each client organization gets their own workspace
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Tenant users - Users within each organization
CREATE TABLE IF NOT EXISTS tenant_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, manager, user
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    persona_settings JSONB DEFAULT '{}',
    voice_preference VARCHAR(100),
    can_upload_documents BOOLEAN DEFAULT TRUE,
    can_modify_ai_settings BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, email)
);

-- Tenant storage tracking
CREATE TABLE IF NOT EXISTS tenant_storage (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    total_storage_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 10737418240, -- 10GB default
    document_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCUMENT MANAGEMENT TABLES 
-- =====================================================

-- Documents table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL, -- File size in bytes
    file_type VARCHAR(50) NOT NULL, -- pdf, docx, txt, md, csv
    content_preview TEXT, -- First 1000 chars
    chunks_count INTEGER DEFAULT 0,
    metadata JSONB, -- File metadata, page count, etc.
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    is_processed BOOLEAN DEFAULT FALSE, -- Document processing status
    processing_status VARCHAR(50) DEFAULT 'pending' -- pending, processing, completed, failed
);

-- Document chunks for semantic search - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536), -- For semantic similarity search
    metadata JSONB, -- Page number, section, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Document processing queue for background tasks
CREATE TABLE IF NOT EXISTS document_processing_queue (
    queue_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Document access logs for audit trail
CREATE TABLE IF NOT EXISTS document_access_logs (
    log_id SERIAL PRIMARY KEY,
    doc_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    access_type VARCHAR(50), -- upload, view, search, delete, download
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE
);

-- =====================================================
-- USER PREFERENCES AND PERSONAS
-- =====================================================

-- User preferences table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    communication_style VARCHAR(50) DEFAULT 'conversational',
    response_pace VARCHAR(50) DEFAULT 'normal',
    expertise_areas TEXT[], -- Array of strings
    preferred_examples VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User personas table - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS user_personas (
    user_id UUID PRIMARY KEY REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    formality VARCHAR(50) DEFAULT 'balanced',
    detail_level VARCHAR(50) DEFAULT 'normal',
    example_style VARCHAR(50) DEFAULT 'mixed',
    questioning VARCHAR(50) DEFAULT 'direct',
    energy VARCHAR(50) DEFAULT 'moderate',
    confidence FLOAT DEFAULT 0.8,
    sessions_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation summaries - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS conversation_summaries (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    summary TEXT,
    key_topics TEXT[],
    message_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing results - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS ab_test_results (
    test_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    test_attribute VARCHAR(50),
    original_value VARCHAR(50),
    test_value VARCHAR(50),
    engagement_score FLOAT,
    selected BOOLEAN DEFAULT FALSE,
    test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking - Enhanced with tenant isolation
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES tenant_users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    api_name VARCHAR(50) NOT NULL, -- 'grok', 'openai', 'elevenlabs'
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    request_time FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (users can only access their tenant's data)
CREATE POLICY "Users can only access their tenant's data" ON tenants
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's users" ON tenant_users
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's storage" ON tenant_storage
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's documents" ON documents
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's document chunks" ON document_chunks
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's processing queue" ON document_processing_queue
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's access logs" ON document_access_logs
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's preferences" ON user_preferences
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's personas" ON user_personas
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's conversations" ON conversation_summaries
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's ab tests" ON ab_test_results
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's api usage" ON api_usage
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's billing" ON tenant_billing
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's invoices" ON tenant_invoices
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their tenant's usage logs" ON tenant_usage_logs
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_upload_time ON documents(upload_time);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embeddings ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_queue_tenant ON document_processing_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON document_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON document_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_doc ON document_access_logs(doc_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON document_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_preferences_tenant ON user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personas_tenant ON user_personas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personas_confidence ON user_personas(confidence);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversation_summaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversation_summaries(timestamp);
CREATE INDEX IF NOT EXISTS idx_tests_tenant ON ab_test_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tests_user ON ab_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON api_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_api ON api_usage(api_name);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON api_usage(timestamp);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

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
            last_updated = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Subtract document size from tenant storage
        UPDATE tenant_storage 
        SET total_storage_bytes = total_storage_bytes - OLD.file_size,
            document_count = GREATEST(document_count - 1, 0),
            last_updated = NOW()
        WHERE tenant_id = OLD.tenant_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle file size changes
        IF OLD.file_size != NEW.file_size THEN
            UPDATE tenant_storage 
            SET total_storage_bytes = total_storage_bytes - OLD.file_size + NEW.file_size,
                last_updated = NOW()
            WHERE tenant_id = NEW.tenant_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

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
    VALUES (NEW.tenant_id, 0, NEW.max_storage_gb::BIGINT * 1073741824, 0);
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Apply default storage creation trigger to tenants table
CREATE TRIGGER create_default_tenant_storage_trigger
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_tenant_storage();

-- =====================================================
-- BILLING AND USAGE TRACKING TABLES
-- =====================================================

-- Tenant billing and usage limits
CREATE TABLE IF NOT EXISTS tenant_billing (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    subscription_tier VARCHAR(50) DEFAULT 'standard',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    api_calls_this_period INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 10000,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 10737418240, -- 10GB
    last_billing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_billing_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
    billing_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled, past_due
    payment_method VARCHAR(50), -- stripe, paypal, invoice
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing history and invoices
CREATE TABLE IF NOT EXISTS tenant_invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    base_amount DECIMAL(10, 2) DEFAULT 0,
    usage_amount DECIMAL(10, 2) DEFAULT 0, -- Overage charges
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, cancelled
    stripe_invoice_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- Usage tracking for billing calculations
CREATE TABLE IF NOT EXISTS tenant_usage_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    api_calls_cost DECIMAL(10, 4) DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_cost DECIMAL(10, 4) DEFAULT 0,
    total_cost DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

-- =====================================================
-- BILLING FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update billing when API usage changes
CREATE OR REPLACE FUNCTION update_tenant_billing()
RETURNS TRIGGER AS $$
BEGIN
    -- Update API usage count
    UPDATE tenant_billing 
    SET api_calls_this_period = api_calls_this_period + 1,
        updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id;
    
    -- Log daily usage
    INSERT INTO tenant_usage_logs (tenant_id, date, api_calls, api_calls_cost)
    VALUES (NEW.tenant_id, CURRENT_DATE, 1, NEW.cost)
    ON CONFLICT (tenant_id, date) DO UPDATE SET
        api_calls = tenant_usage_logs.api_calls + 1,
        api_calls_cost = tenant_usage_logs.api_calls_cost + NEW.cost,
        total_cost = tenant_usage_logs.total_cost + NEW.cost;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Trigger to track API usage for billing
CREATE TRIGGER update_tenant_billing_trigger
    AFTER INSERT ON api_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_billing();

-- Function to create default billing record
CREATE OR REPLACE FUNCTION create_default_tenant_billing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_billing (tenant_id, subscription_tier, api_calls_limit, storage_limit_bytes)
    VALUES (NEW.tenant_id, NEW.subscription_tier, 
            CASE 
                WHEN NEW.subscription_tier = 'standard' THEN 10000
                WHEN NEW.subscription_tier = 'premium' THEN 50000
                WHEN NEW.subscription_tier = 'enterprise' THEN 200000
                ELSE 10000
            END,
            NEW.max_storage_gb * 1073741824);
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Trigger to create billing record when tenant is created
CREATE TRIGGER create_default_tenant_billing_trigger
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_tenant_billing();

-- =====================================================
-- BILLING INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tenant_billing_status ON tenant_billing(billing_status);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_next_date ON tenant_billing(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant ON tenant_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_status ON tenant_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_due_date ON tenant_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_date ON tenant_usage_logs(tenant_id, date);

-- =====================================================
-- SAMPLE DATA (FOR TESTING)
-- =====================================================

-- Insert a default tenant for testing 
INSERT INTO tenants (tenant_id, organization_name, admin_email, subscription_tier) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'admin@default.com', 'standard')
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert a default admin user 
INSERT INTO tenant_users (user_id, tenant_id, email, role, name)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@default.com', 'admin', 'Default Admin')
ON CONFLICT (user_id) DO NOTHING;
