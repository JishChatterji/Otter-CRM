#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class CRMAPITester:
    def __init__(self, base_url="https://crm-dashboard-79.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_user_data = {
            "username": f"testuser_{int(time.time())}",
            "email": f"test_{int(time.time())}@example.com",
            "full_name": "Test User",
            "password": "TestPassword123!"
        }
        self.created_contact_id = None
        self.created_deal_id = None
        self.created_task_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "error": error
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_user_registration(self):
        """Test user registration"""
        success, response, status_code = self.make_request(
            'POST', 'auth/register', self.test_user_data, 200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_test("User Registration", True, f"User created with ID: {self.user_id}")
            return True
        else:
            self.log_test("User Registration", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        success, response, status_code = self.make_request(
            'POST', 'auth/login', login_data, 200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("User Login", True, f"Login successful")
            return True
        else:
            self.log_test("User Login", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response, status_code = self.make_request('GET', 'auth/me', None, 200)
        
        if success and 'email' in response:
            self.log_test("Get Current User", True, f"User info retrieved")
            return True
        else:
            self.log_test("Get Current User", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_create_contact(self):
        """Test creating a contact"""
        contact_data = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "company": "Test Company",
            "position": "CEO",
            "status": "lead",
            "notes": "Test contact for API testing"
        }
        
        success, response, status_code = self.make_request(
            'POST', 'contacts', contact_data, 200
        )
        
        if success and 'id' in response:
            self.created_contact_id = response['id']
            self.log_test("Create Contact", True, f"Contact created with ID: {self.created_contact_id}")
            return True
        else:
            self.log_test("Create Contact", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_get_contacts(self):
        """Test getting all contacts"""
        success, response, status_code = self.make_request('GET', 'contacts', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("Get Contacts", True, f"Retrieved {len(response)} contacts")
            return True
        else:
            self.log_test("Get Contacts", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_get_contact_by_id(self):
        """Test getting a specific contact"""
        if not self.created_contact_id:
            self.log_test("Get Contact by ID", False, "", "No contact ID available")
            return False
            
        success, response, status_code = self.make_request(
            'GET', f'contacts/{self.created_contact_id}', None, 200
        )
        
        if success and 'id' in response:
            self.log_test("Get Contact by ID", True, f"Contact retrieved")
            return True
        else:
            self.log_test("Get Contact by ID", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_create_deal(self):
        """Test creating a deal"""
        if not self.created_contact_id:
            self.log_test("Create Deal", False, "", "No contact ID available for deal")
            return False
            
        deal_data = {
            "title": "Enterprise Software License",
            "contact_id": self.created_contact_id,
            "value": 50000.0,
            "stage": "qualification",
            "probability": 25,
            "expected_close_date": "2024-12-31",
            "notes": "Test deal for API testing"
        }
        
        success, response, status_code = self.make_request(
            'POST', 'deals', deal_data, 200
        )
        
        if success and 'id' in response:
            self.created_deal_id = response['id']
            self.log_test("Create Deal", True, f"Deal created with ID: {self.created_deal_id}")
            return True
        else:
            self.log_test("Create Deal", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_get_deals(self):
        """Test getting all deals"""
        success, response, status_code = self.make_request('GET', 'deals', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("Get Deals", True, f"Retrieved {len(response)} deals")
            return True
        else:
            self.log_test("Get Deals", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_create_task(self):
        """Test creating a task"""
        task_data = {
            "title": "Follow up with prospect",
            "description": "Call the prospect to discuss requirements",
            "related_to": self.created_contact_id if self.created_contact_id else None,
            "related_type": "contact" if self.created_contact_id else None,
            "due_date": "2024-12-31",
            "priority": "high",
            "status": "pending"
        }
        
        success, response, status_code = self.make_request(
            'POST', 'tasks', task_data, 200
        )
        
        if success and 'id' in response:
            self.created_task_id = response['id']
            self.log_test("Create Task", True, f"Task created with ID: {self.created_task_id}")
            return True
        else:
            self.log_test("Create Task", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_get_tasks(self):
        """Test getting all tasks"""
        success, response, status_code = self.make_request('GET', 'tasks', None, 200)
        
        if success and isinstance(response, list):
            self.log_test("Get Tasks", True, f"Retrieved {len(response)} tasks")
            return True
        else:
            self.log_test("Get Tasks", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_update_task_status(self):
        """Test updating task status"""
        if not self.created_task_id:
            self.log_test("Update Task Status", False, "", "No task ID available")
            return False
            
        update_data = {
            "title": "Follow up with prospect",
            "description": "Call the prospect to discuss requirements",
            "related_to": self.created_contact_id,
            "related_type": "contact",
            "due_date": "2024-12-31",
            "priority": "high",
            "status": "completed"
        }
        
        success, response, status_code = self.make_request(
            'PUT', f'tasks/{self.created_task_id}', update_data, 200
        )
        
        if success and response.get('status') == 'completed':
            self.log_test("Update Task Status", True, f"Task status updated to completed")
            return True
        else:
            self.log_test("Update Task Status", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_dashboard_analytics(self):
        """Test dashboard analytics endpoint"""
        success, response, status_code = self.make_request('GET', 'analytics/dashboard', None, 200)
        
        expected_fields = ['total_contacts', 'total_deals', 'total_tasks', 'total_pipeline_value']
        if success and all(field in response for field in expected_fields):
            self.log_test("Dashboard Analytics", True, f"Analytics data retrieved")
            return True
        else:
            self.log_test("Dashboard Analytics", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_ai_contact_insights(self):
        """Test AI contact insights"""
        if not self.created_contact_id:
            self.log_test("AI Contact Insights", False, "", "No contact ID available")
            return False
            
        ai_data = {"contact_id": self.created_contact_id}
        success, response, status_code = self.make_request(
            'POST', 'ai/contact-insights', ai_data, 200
        )
        
        if success and 'content' in response:
            self.log_test("AI Contact Insights", True, f"AI insights generated")
            return True
        else:
            # AI might fail due to API key issues, but we should still log it
            self.log_test("AI Contact Insights", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_ai_deal_analysis(self):
        """Test AI deal analysis"""
        if not self.created_deal_id:
            self.log_test("AI Deal Analysis", False, "", "No deal ID available")
            return False
            
        ai_data = {"deal_id": self.created_deal_id}
        success, response, status_code = self.make_request(
            'POST', 'ai/deal-analysis', ai_data, 200
        )
        
        if success and 'content' in response:
            self.log_test("AI Deal Analysis", True, f"AI analysis generated")
            return True
        else:
            # AI might fail due to API key issues, but we should still log it
            self.log_test("AI Deal Analysis", False, "", f"Status: {status_code}, Response: {response}")
            return False

    def test_delete_operations(self):
        """Test delete operations"""
        delete_success = 0
        total_deletes = 0
        
        # Delete task
        if self.created_task_id:
            total_deletes += 1
            success, response, status_code = self.make_request(
                'DELETE', f'tasks/{self.created_task_id}', None, 200
            )
            if success:
                delete_success += 1
                
        # Delete deal
        if self.created_deal_id:
            total_deletes += 1
            success, response, status_code = self.make_request(
                'DELETE', f'deals/{self.created_deal_id}', None, 200
            )
            if success:
                delete_success += 1
                
        # Delete contact
        if self.created_contact_id:
            total_deletes += 1
            success, response, status_code = self.make_request(
                'DELETE', f'contacts/{self.created_contact_id}', None, 200
            )
            if success:
                delete_success += 1
        
        if delete_success == total_deletes and total_deletes > 0:
            self.log_test("Delete Operations", True, f"All {delete_success} delete operations successful")
            return True
        else:
            self.log_test("Delete Operations", False, "", f"Only {delete_success}/{total_deletes} deletes successful")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CRM API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return self.generate_report()
            
        if not self.test_get_current_user():
            print("❌ User info retrieval failed")
            
        # Test login with existing user
        self.test_user_login()
        
        # Core CRUD operations
        self.test_create_contact()
        self.test_get_contacts()
        self.test_get_contact_by_id()
        
        self.test_create_deal()
        self.test_get_deals()
        
        self.test_create_task()
        self.test_get_tasks()
        self.test_update_task_status()
        
        # Analytics
        self.test_dashboard_analytics()
        
        # AI features (may fail if API key issues)
        self.test_ai_contact_insights()
        self.test_ai_deal_analysis()
        
        # Cleanup
        self.test_delete_operations()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}: {result['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    tester = CRMAPITester()
    report = tester.run_all_tests()
    
    # Return appropriate exit code
    if report["failed_tests"] == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {report['failed_tests']} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())