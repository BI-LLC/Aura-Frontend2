# 🚀 AURA Voice AI - Supabase Setup Guide

## Overview
This guide will help you migrate from the current PostgreSQL setup to Supabase, which will work perfectly with Vercel deployment and provide a unified database for both frontend and backend.

## ✅ Why Supabase?

1. **Vercel Compatible**: Perfect for Vercel deployment
2. **Unified Database**: Frontend and backend use the same database
3. **Real-time Features**: Built-in real-time subscriptions
4. **Managed PostgreSQL**: No database server management
5. **Built-in Auth**: Can replace custom auth system
6. **Edge Functions**: Can run backend logic on Supabase Edge Functions

## 🔧 Setup Steps

### Step 1: Run the Database Migration

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Open SQL Editor** in your project
3. **Copy and paste** the contents of `backend/supabase_migration.sql`
4. **Run the migration** - this will create all the necessary tables with proper RLS policies

### Step 2: Get Your Supabase Keys

1. **Go to Settings > API** in your Supabase dashboard
2. **Copy these values**:
   - `Project URL` (already in the migration file)
   - `anon public` key (already in the migration file)
   - `service_role` key (you need to get this)

### Step 3: Update Your Environment Variables

1. **Copy the example file**:
   ```bash
   cp backend/env.example backend/.env
   ```

2. **Edit `backend/.env`** and add your actual API keys:
   ```env
   # Get these from Supabase Settings > API
   SUPABASE_URL=https://rmqohckqlpkwtpzqimxk.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=your_actual_service_key_here
   
   # Your existing API keys
   GROK_API_KEY=xai-your-actual-key
   OPENAI_API_KEY=sk-your-actual-key
   ELEVENLABS_API_KEY=sk_your-actual-key
   ```

### Step 4: Install Supabase Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 5: Update Your Backend Code

The backend is already set up to use Supabase! The `supabase_client.py` file provides all the necessary database operations.

### Step 6: Test the Setup

1. **Start your backend**:
   ```bash
   cd backend
   python -m app.main
   ```

2. **Test the database connection**:
   - Go to `http://localhost:8000/health`
   - Check if all services are running

3. **Test document upload**:
   - Go to `http://localhost:8000/test`
   - Try uploading a document
   - Check if it appears in your Supabase dashboard

## 🗄️ Database Schema Overview

Your Supabase database now includes:

### **Multi-Tenant Tables**
- `tenants` - Organization data
- `tenant_users` - Users within organizations
- `tenant_storage` - Storage tracking per tenant

### **Document Management**
- `documents` - File metadata and content
- `document_chunks` - AI-processed chunks for search
- `document_processing_queue` - Background processing
- `document_access_logs` - Audit trail

### **User Personalization**
- `user_preferences` - User settings
- `user_personas` - AI personality adaptation
- `conversation_summaries` - Chat history

### **Analytics & Monitoring**
- `api_usage` - API call tracking
- `ab_test_results` - A/B testing data

## 🔐 Security Features

### **Row Level Security (RLS)**
- All tables have RLS enabled
- Users can only access their tenant's data
- Complete data isolation between organizations

### **Multi-Tenant Isolation**
- Each tenant has completely separate data
- No cross-tenant data access possible
- Proper foreign key constraints

## 🚀 Vercel Deployment

### **Environment Variables for Vercel**
Add these to your Vercel project settings:

```env
SUPABASE_URL=https://rmqohckqlpkwtpzqimxk.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
GROK_API_KEY=your_grok_key
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### **Frontend Integration**
Your frontend is already connected to the same Supabase instance, so:
- ✅ Authentication works across frontend/backend
- ✅ Real-time features work
- ✅ Data consistency guaranteed

## 🔍 Key Benefits

1. **Unified Database**: Frontend and backend share the same data
2. **Real-time Updates**: Changes in backend immediately reflect in frontend
3. **Vercel Ready**: Perfect for serverless deployment
4. **Scalable**: Supabase handles scaling automatically
5. **Secure**: Built-in RLS and authentication
6. **Cost Effective**: Pay only for what you use

## 🛠️ Next Steps

1. **Run the migration** (Step 1)
2. **Update environment variables** (Step 3)
3. **Test locally** (Step 6)
4. **Deploy to Vercel** with the environment variables
5. **Monitor usage** in Supabase dashboard

## 📊 Monitoring

- **Supabase Dashboard**: Monitor database usage, performance, and logs
- **Vercel Dashboard**: Monitor API performance and deployments
- **AURA Health Check**: `http://localhost:8000/health` for service status

## 🆘 Troubleshooting

### **Common Issues**

1. **"Supabase client not initialized"**
   - Check your environment variables
   - Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

2. **"Permission denied" errors**
   - Check RLS policies in Supabase
   - Make sure you're using the correct API key

3. **"Table doesn't exist" errors**
   - Run the migration script again
   - Check if all tables were created in Supabase dashboard

### **Getting Help**

- Check the Supabase logs in the dashboard
- Use the test interface at `/test` to debug
- Check the health endpoint at `/health`

---

**🎉 You're all set!** Your AURA Voice AI platform now has a unified, scalable database that works perfectly with Vercel deployment.
