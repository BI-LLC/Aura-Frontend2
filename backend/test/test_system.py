#!/usr/bin/env python3
# System test script for AURA Voice AI
# Tests multi-tenant platform functionality

import requests
import json
import time
import sys
from typing import Dict, Any

class AuraSystemTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        # Log test results with status
        status = "PASS" if success else "FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def test_health_check(self):
        # Test system health endpoint
        try:
            response = self.session.get(f"{self.base_url}/health")
            success = response.status_code == 200
            data = response.json() if success else {}
            
            details = f"Status: {response.status_code}, Mode: {data.get('mode', 'unknown')}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_tenant_onboarding(self):
        """Test tenant creation (internal endpoint)"""
        try:
            payload = {
                "organization_name": "Test Company",
                "admin_email": "admin@testcompany.com",
                "subscription_tier": "standard",
                "api_key": "test_internal_api_key"
            }
            
            response = self.session.post(
                f"{self.base_url}/internal/onboard-tenant",
                params=payload
            )
            
            success = response.status_code == 200
            data = response.json() if success else {}
            
            details = f"Status: {response.status_code}"
            if success:
                details += f", Tenant ID: {data.get('tenant_id', 'N/A')}"
            
            self.log_test("Tenant Onboarding", success, details)
            return data if success else None
        except Exception as e:
            self.log_test("Tenant Onboarding", False, f"Error: {str(e)}")
            return None
    
    def test_authentication(self):
        """Test login functionality"""
        try:
            # This would normally require a real tenant, so we expect it to fail gracefully
            payload = {
                "email": "admin@testcompany.com",
                "password": "testpassword",
                "tenant_subdomain": "test-company"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/login",
                params=payload
            )
            
            # We expect this to fail in test mode, but should return proper error
            success = response.status_code in [401, 404]  # Expected failures
            details = f"Status: {response.status_code} (Expected failure in test mode)"
            
            self.log_test("Authentication", success, details)
            return success
        except Exception as e:
            self.log_test("Authentication", False, f"Error: {str(e)}")
            return False
    
    def test_chat_endpoint(self):
        """Test chat functionality (without auth for testing)"""
        try:
            # Test the old chat endpoint that doesn't require tenant auth
            response = self.session.get(f"{self.base_url}/")
            
            success = response.status_code == 200
            data = response.json() if success else {}
            
            details = f"Status: {response.status_code}"
            if success:
                details += f", Version: {data.get('version', 'N/A')}"
            
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_document_upload(self):
        """Test document upload (mock)"""
        try:
            # Create a simple test file
            test_content = "This is a test document for AURA Voice AI testing."
            files = {'file': ('test.txt', test_content, 'text/plain')}
            
            # This will fail without proper auth, but we can test the endpoint exists
            response = self.session.post(
                f"{self.base_url}/api/documents/upload",
                files=files
            )
            
            # We expect auth failure, but endpoint should exist
            success = response.status_code in [401, 403]  # Expected auth failures
            details = f"Status: {response.status_code} (Expected auth failure)"
            
            self.log_test("Document Upload Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Document Upload Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_voice_status(self):
        """Test voice pipeline status"""
        try:
            response = self.session.get(f"{self.base_url}/voice/status")
            
            success = response.status_code == 200
            data = response.json() if success else {}
            
            details = f"Status: {response.status_code}"
            if success:
                details += f", Voice Status: {data.get('status', 'unknown')}"
            
            self.log_test("Voice Pipeline Status", success, details)
            return success
        except Exception as e:
            self.log_test("Voice Pipeline Status", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all system tests"""
        print("Starting AURA Voice AI System Tests...")
        print("=" * 50)
        
        # Wait for system to be ready
        print("Waiting for system startup...")
        time.sleep(5)
        
        # Run tests
        tests = [
            self.test_health_check,
            self.test_chat_endpoint,
            self.test_voice_status,
            self.test_tenant_onboarding,
            self.test_authentication,
            self.test_document_upload,
        ]
        
        for test in tests:
            test()
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        print("\n" + "=" * 50)
        print("Test Summary")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("All tests passed! System is working correctly.")
            return True
        else:
            print("Some tests failed. Check the details above.")
            return False

def main():
    """Main test runner"""
    print("AURA Voice AI - System Tester")
    print("Testing multi-tenant AI platform...")
    
    tester = AuraSystemTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
