#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Environment variables for the backend
const backendEnvContent = `# Aura Backend - Development Environment
# =====================================

# OpenAI Configuration
# -------------------
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration (for voice synthesis)
# ---------------------------------------------
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Grok Configuration (alternative AI provider)
# --------------------------------------------
# Get your API key from: https://console.x.ai/
GROK_API_KEY=your_grok_api_key_here

# Database Configuration
# ---------------------
# Supabase configuration (same as frontend)
SUPABASE_URL=https://rmqohckqlpkwtpzqimxk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcW9oY2txbHBrd3RwenFpbXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mjc5NjUsImV4cCI6MjA3MjMwMzk2NX0.rmVQ2tFrQQ1f3llsuhxDMGZynxru4UrFWfW-prNgFKM
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Redis Configuration
# ------------------
REDIS_URL=redis://localhost:6379

# API Configuration
# ----------------
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Development Settings
# -------------------
DEBUG_MODE=true
LOG_LEVEL=INFO

# Rate Limiting
# ------------
GROK_RATE_LIMIT=100
OPENAI_RATE_LIMIT=500

# Health Check
# -----------
HEALTH_CHECK_INTERVAL=15
API_TIMEOUT=30
`;

// Create .env file in the backend directory
const backendEnvPath = path.join(__dirname, 'backend', '.env');

try {
  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log('✅ Backend environment file created successfully at:', backendEnvPath);
  console.log('📝 Please update the API keys in the backend/.env file:');
  console.log('   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys');
  console.log('   - ELEVENLABS_API_KEY: Get from https://elevenlabs.io/app/settings/api-keys');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY: Get from your Supabase dashboard');
  console.log('🔄 After updating the API keys, restart your backend server.');
} catch (error) {
  console.error('❌ Error creating backend environment file:', error.message);
  console.log('📝 Please manually create a .env file in the backend directory with the following content:');
  console.log('\n' + backendEnvContent);
}
