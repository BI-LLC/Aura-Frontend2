#!/usr/bin/env python3
"""
Simple test script to test document upload endpoint
"""
import requests
import os
from pathlib import Path

# Create a test file
test_file_path = Path("test_document.txt")
test_file_path.write_text("This is a test document for upload testing.")

try:
    # Test the upload endpoint
    with open(test_file_path, "rb") as f:
        files = {"file": ("test_document.txt", f, "text/plain")}
        response = requests.post(
            "http://localhost:8000/api/documents/upload?user_id=test_user",
            files=files
        )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    print(f"Response Content: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Upload successful!")
        print(f"Document ID: {data.get('document_id')}")
        print(f"Message: {data.get('message')}")
    else:
        print(f"❌ Upload failed: {response.text}")

except Exception as e:
    print(f"❌ Error: {e}")

finally:
    # Clean up test file
    test_file_path.unlink(missing_ok=True)
