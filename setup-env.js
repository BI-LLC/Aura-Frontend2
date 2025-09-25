#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Environment variables for the frontend
const envContent = `# Aura Frontend - Development Environment
# ======================================

# API Configuration - Development
# -------------------------------
# Local development - if you run backend locally
REACT_APP_API_BASE_URL=http://localhost:8000

# Or use production API for development testing
# REACT_APP_API_BASE_URL=https://api.iaura.ai

# Supabase Configuration
# ----------------------
# Your Supabase project URL (same for dev and prod)
REACT_APP_SUPABASE_URL=https://rmqohckqlpkwtpzqimxk.supabase.co

# Supabase anonymous/public key (safe for frontend)
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcW9oY2txbHBrd3RwenFpbXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mjc5NjUsImV4cCI6MjA3MjMwMzk2NX0.rmVQ2tFrQQ1f3llsuhxDMGZynxru4UrFWfW-prNgFKM

# App Configuration
# -----------------
REACT_APP_ENVIRONMENT=development
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_BACKEND_URL=https://127.0.0.1:8880

# Authentication Settings
REACT_APP_TOKEN_STORAGE_KEY=aura_auth_token

# App Info
REACT_APP_NAME=Aura Voice AI
REACT_APP_VERSION=0.1.0

# Voice Recording Settings
REACT_APP_MAX_RECORDING_DURATION=300000
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_SUPPORTED_AUDIO_FORMATS=audio/wav,audio/mp3,audio/webm

# UI Configuration
REACT_APP_DEFAULT_PAGE_SIZE=12
REACT_APP_MESSAGE_REFRESH_INTERVAL=1000

# Feature Flags
REACT_APP_ENABLE_VOICE_TRAINING=true
REACT_APP_ENABLE_FILE_UPLOAD=true
REACT_APP_ENABLE_WIDGET_GENERATOR=true

# Debug Settings - Enabled for Development
# ----------------------------------------
REACT_APP_DEBUG_MODE=true
REACT_APP_DEBUG_API=true
`;

// Create .env file in the frontend directory
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');

try {
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log('✅ Environment file created successfully at:', frontendEnvPath);
  console.log('📝 Please restart your React development server for changes to take effect.');
  console.log('🔄 Run: npm start (in the frontend directory)');
} catch (error) {
  console.error('❌ Error creating environment file:', error.message);
  console.log('📝 Please manually create a .env file in the frontend directory with the following content:');
  console.log('\n' + envContent);
}
