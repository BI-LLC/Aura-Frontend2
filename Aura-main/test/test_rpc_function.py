"""Test the RPC function directly"""
import sys
import os

os.chdir('/root/Aura/backend')
sys.path.insert(0, '/root/Aura/backend')

from dotenv import load_dotenv
load_dotenv('/root/Aura/backend/.env')

from app.supabase_client import get_supabase_client

# Get Supabase client
supabase_service = get_supabase_client()
client = supabase_service.get_client(admin=True)

print("=== TESTING RPC FUNCTION ===\n")

# Test 1: Call without any filters
print("1. Testing RPC without filters...")
try:
    result = client.rpc('match_document_chunks', {
        'query_embedding': [0.1] * 1536,  # Dummy embedding
        'match_threshold': 0.1,  # Very low threshold
        'match_count': 10
    }).execute()
    
    if result.data:
        print(f"   ✅ Found {len(result.data)} matches (no filters)")
    else:
        print("   ❌ No matches found (no filters)")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Call with tenant filter only
print("\n2. Testing RPC with tenant filter...")
try:
    result = client.rpc('match_document_chunks', {
        'query_embedding': [0.1] * 1536,
        'match_threshold': 0.1,
        'match_count': 10,
        'tenant_filter': '00000000-0000-0000-0000-000000000001'
    }).execute()
    
    if result.data:
        print(f"   ✅ Found {len(result.data)} matches (tenant filter)")
    else:
        print("   ❌ No matches found (tenant filter)")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Call with assistant_key filter
print("\n3. Testing RPC with assistant_key filter...")
try:
    result = client.rpc('match_document_chunks', {
        'query_embedding': [0.1] * 1536,
        'match_threshold': 0.1,
        'match_count': 10,
        'tenant_filter': '00000000-0000-0000-0000-000000000001',
        'assistant_key_filter': 'bib-halder'
    }).execute()
    
    if result.data:
        print(f"   ✅ Found {len(result.data)} matches (assistant_key filter)")
    else:
        print("   ❌ No matches found (assistant_key filter)")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Check function signature
print("\n4. Checking function signature...")
try:
    # Try to get function info
    result = client.rpc('match_document_chunks', {}).execute()
except Exception as e:
    print(f"   Function signature error: {e}")

print("\n=== TEST COMPLETE ===")
