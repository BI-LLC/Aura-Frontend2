#!/usr/bin/env python3
"""
Debug script to investigate .env file loading issues
"""

import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def debug_env_loading():
    """Debug environment variable loading"""
    print("🔍 Debugging Environment Variable Loading...")
    print("=" * 50)
    
    # Check current working directory
    print(f"1️⃣ Current working directory: {os.getcwd()}")
    
    # Check for .env files in various locations
    env_locations = [
        ".env",
        "backend/.env", 
        "../backend/.env",
        "../../backend/.env",
        "app/.env",
        "app/../.env"
    ]
    
    print("\n2️⃣ Checking for .env files:")
    for loc in env_locations:
        path = Path(loc)
        if path.exists():
            print(f"   ✅ Found: {path.absolute()}")
            # Check file size
            size = path.stat().st_size
            print(f"      Size: {size} bytes")
            # Check if file is readable
            try:
                with open(path, 'r') as f:
                    first_line = f.readline().strip()
                    print(f"      First line: {first_line[:50]}...")
            except Exception as e:
                print(f"      Error reading: {e}")
        else:
            print(f"   ❌ Not found: {loc}")
    
    # Check environment variables directly
    print("\n3️⃣ Environment variables (direct):")
    openai_key = os.getenv("OPENAI_API_KEY")
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    grok_key = os.getenv("GROK_API_KEY")
    
    print(f"   OPENAI_API_KEY: {'✓' if openai_key else '✗'}")
    if openai_key:
        print(f"      Length: {len(openai_key)}")
        print(f"      Starts with: {openai_key[:10]}...")
    
    print(f"   ELEVENLABS_API_KEY: {'✓' if elevenlabs_key else '✗'}")
    if elevenlabs_key:
        print(f"      Length: {len(elevenlabs_key)}")
        print(f"      Starts with: {elevenlabs_key[:10]}...")
    
    print(f"   GROK_API_KEY: {'✓' if grok_key else '✗'}")
    if grok_key:
        print(f"      Length: {len(grok_key)}")
        print(f"      Starts with: {grok_key[:10]}...")
    
    # Try to load config
    print("\n4️⃣ Testing config loading:")
    try:
        from app.config import settings
        print("   ✅ Config module imported successfully")
        
        # Check if settings loaded from .env
        env_file = getattr(settings, "_env_file", None)
        if env_file:
            print(f"   ✅ Settings loaded from: {env_file}")
        else:
            print("   ⚠️ Settings not loaded from .env file")
        
        # Check API keys in settings
        print(f"   Settings.OPENAI_API_KEY: {'✓' if settings.OPENAI_API_KEY else '✗'}")
        if settings.OPENAI_API_KEY:
            print(f"      Length: {len(settings.OPENAI_API_KEY)}")
            print(f"      Starts with: {settings.OPENAI_API_KEY[:10]}...")
        
        print(f"   Settings.ELEVENLABS_API_KEY: {'✓' if settings.ELEVENLABS_API_KEY else '✗'}")
        if settings.ELEVENLABS_API_KEY:
            print(f"      Length: {len(settings.ELEVENLABS_API_KEY)}")
            print(f"      Starts with: {settings.ELEVENLABS_API_KEY[:10]}...")
        
        print(f"   Settings.GROK_API_KEY: {'✓' if settings.GROK_API_KEY else '✗'}")
        if settings.GROK_API_KEY:
            print(f"      Length: {len(settings.GROK_API_KEY)}")
            print(f"      Starts with: {settings.GROK_API_KEY[:10]}...")
            
    except Exception as e:
        print(f"   ❌ Config loading failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Check if python-dotenv is working
    print("\n5️⃣ Testing python-dotenv:")
    try:
        from dotenv import load_dotenv
        print("   ✅ python-dotenv imported successfully")
        
        # Try to load .env manually
        env_loaded = load_dotenv(".env", verbose=True)
        print(f"   Manual load result: {env_loaded}")
        
        # Check if variables are now available
        openai_key_after = os.getenv("OPENAI_API_KEY")
        print(f"   OPENAI_API_KEY after manual load: {'✓' if openai_key_after else '✗'}")
        
    except Exception as e:
        print(f"   ❌ python-dotenv test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🔍 Debug complete!")

if __name__ == "__main__":
    debug_env_loading()
