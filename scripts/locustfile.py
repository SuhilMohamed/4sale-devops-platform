"""
Locust stress testing script for Task Management API
This script tests the scalability of the task API and validates HPA functionality.

Usage:
    locust -f locustfile.py --host=http://localhost:3000
    
Environment Variables:
    LOCUST_HOST: Target host (default: http://localhost:3000)
    LOCUST_USERS: Number of concurrent users (default: 10)
    LOCUST_SPAWN_RATE: Users spawned per second (default: 2)
    LOCUST_RUN_TIME: Test duration (default: 5m)
    LOCUST_HEADLESS: Run in headless mode (default: false)
"""

import os
import json
import random
import uuid
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner


class TaskAPIUser(HttpUser):
    """
    Simulates a user interacting with the Task Management API
    """
    
    # Wait time between requests (1-3 seconds)
    wait_time = between(1, 3)
    
    # Store created task IDs for cleanup and operations
    task_ids = []
    
    def on_start(self):
        """Called when a user starts"""
        self.client.verify = False  # Skip SSL verification for testing
        self.client.timeout = 10    # Request timeout
        
        # Test API connectivity
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                print("✅ API health check passed")
            else:
                print(f"❌ API health check failed: {response.status_code}")
    
    def on_stop(self):
        """Called when a user stops - cleanup created tasks"""
        for task_id in self.task_ids:
            try:
                self.client.delete(f"/deleteTask/{task_id}", name="/deleteTask/[id]")
            except Exception as e:
                print(f"Failed to cleanup task {task_id}: {e}")
    
    @task(10)
    def list_tasks(self):
        """List tasks with various pagination parameters"""
        params = {
            "page": random.randint(1, 5),
            "limit": random.choice([5, 10, 20]),
            "status": random.choice(["", "pending", "in_progress", "completed"])
        }
        
        # Remove empty status parameter
        if not params["status"]:
            del params["status"]
        
        with self.client.get("/listTasks", params=params, name="/listTasks", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                response.success()
                return data
            else:
                response.failure(f"Failed with status {response.status_code}")
    
    @task(5)
    def create_task(self):
        """Create a new task with random data"""
        task_data = {
            "title": f"Load Test Task {uuid.uuid4().hex[:8]}",
            "description": f"This is a test task created by Locust stress testing at {random.randint(1000, 9999)}",
            "priority": random.choice(["low", "medium", "high"])
        }
        
        with self.client.post("/addTask", json=task_data, name="/addTask", catch_response=True) as response:
            if response.status_code == 201:
                data = response.json()
                task_id = data.get("task", {}).get("id")
                if task_id:
                    self.task_ids.append(task_id)
                response.success()
                return data
            else:
                response.failure(f"Failed to create task: {response.status_code} - {response.text}")
    
    @task(3)
    def update_task(self):
        """Update an existing task status"""
        if not self.task_ids:
            return
        
        task_id = random.choice(self.task_ids)
        update_data = {
            "title": f"Updated Task {uuid.uuid4().hex[:6]}",
            "description": "Updated by Locust load test",
            "status": random.choice(["pending", "in_progress", "completed"]),
            "priority": random.choice(["low", "medium", "high"])
        }
        
        with self.client.put(f"/updateTask/{task_id}", json=update_data, name="/updateTask/[id]", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Task might have been deleted, remove from our list
                if task_id in self.task_ids:
                    self.task_ids.remove(task_id)
                response.success()  # Don't count 404 as failure for this test
            else:
                response.failure(f"Failed to update task: {response.status_code}")
    
    @task(2)
    def delete_task(self):
        """Delete a task"""
        if not self.task_ids:
            return
        
        task_id = random.choice(self.task_ids)
        
        with self.client.delete(f"/deleteTask/{task_id}", name="/deleteTask/[id]", catch_response=True) as response:
            if response.status_code == 200:
                if task_id in self.task_ids:
                    self.task_ids.remove(task_id)
                response.success()
            elif response.status_code == 404:
                # Task already deleted, remove from our list
                if task_id in self.task_ids:
                    self.task_ids.remove(task_id)
                response.success()  # Don't count 404 as failure
            else:
                response.failure(f"Failed to delete task: {response.status_code}")
    
    @task(1)
    def health_check(self):
        """Health check endpoint"""
        with self.client.get("/health", name="/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(1)
    def metrics_endpoint(self):
        """Test metrics endpoint for monitoring"""
        with self.client.get("/metrics", name="/metrics", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Metrics endpoint failed: {response.status_code}")


class DatabaseStressUser(HttpUser):
    """
    Intensive database operations to test HPA scaling
    """
    
    wait_time = between(0.1, 0.5)  # More aggressive timing
    
    @task
    def intensive_list_operations(self):
        """Perform intensive list operations to stress the database"""
        # Multiple concurrent requests
        for _ in range(random.randint(3, 7)):
            params = {
                "page": random.randint(1, 10),
                "limit": random.choice([20, 50, 100])
            }
            self.client.get("/listTasks", params=params, name="/listTasks-intensive")
    
    @task
    def batch_create_operations(self):
        """Create multiple tasks in quick succession"""
        for i in range(random.randint(5, 10)):
            task_data = {
                "title": f"Batch Task {i}-{uuid.uuid4().hex[:6]}",
                "description": f"Batch creation test task #{i}",
                "priority": random.choice(["low", "medium", "high"])
            }
            self.client.post("/addTask", json=task_data, name="/addTask-batch")


# Event listeners for custom metrics and logging
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("🚀 Starting Task API Load Test")
    print(f"Target: {environment.host}")
    print(f"Users: {environment.runner.target_user_count}")
    
    # Test initial connectivity
    try:
        import requests
        response = requests.get(f"{environment.host}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Initial connectivity test passed")
        else:
            print(f"⚠️ Initial connectivity test returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Initial connectivity test failed: {e}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("🏁 Load test completed")
    
    # Print summary statistics
    stats = environment.runner.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Max response time: {stats.total.max_response_time:.2f}ms")
    print(f"RPS: {stats.total.current_rps:.2f}")


@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """Log request failures for debugging"""
    print(f"❌ Request failed: {request_type} {name} - {exception}")


# Additional user types for different load patterns
class ReadOnlyUser(HttpUser):
    """User that only reads data - simulates monitoring/dashboard users"""
    
    wait_time = between(2, 5)
    weight = 3  # 3 times more likely to be chosen
    
    @task(10)
    def browse_tasks(self):
        params = {"page": random.randint(1, 3), "limit": 10}
        self.client.get("/listTasks", params=params, name="/listTasks-readonly")
    
    @task(1)
    def check_health(self):
        self.client.get("/health", name="/health-readonly")


class AdminUser(HttpUser):
    """User with administrative patterns - more creates/updates/deletes"""
    
    wait_time = between(1, 2)
    weight = 1  # Less common
    
    task_ids = []
    
    @task(5)
    def admin_create_task(self):
        task_data = {
            "title": f"Admin Task {uuid.uuid4().hex[:8]}",
            "description": "Administrative task creation",
            "priority": "high"  # Admins typically create high priority tasks
        }
        
        response = self.client.post("/addTask", json=task_data, name="/addTask-admin")
        if response.status_code == 201:
            data = response.json()
            task_id = data.get("task", {}).get("id")
            if task_id:
                self.task_ids.append(task_id)
    
    @task(3)
    def admin_bulk_operations(self):
        # Simulate bulk operations
        for i in range(5):
            params = {"page": i+1, "limit": 50}
            self.client.get("/listTasks", params=params, name="/listTasks-bulk")


if __name__ == "__main__":
    # Configuration from environment variables
    config = {
        "host": os.getenv("LOCUST_HOST", "http://localhost:3000"),
        "users": int(os.getenv("LOCUST_USERS", "10")),
        "spawn_rate": int(os.getenv("LOCUST_SPAWN_RATE", "2")),
        "run_time": os.getenv("LOCUST_RUN_TIME", "5m"),
        "headless": os.getenv("LOCUST_HEADLESS", "false").lower() == "true"
    }
    
    print("Locust Configuration:")
    print(json.dumps(config, indent=2))
