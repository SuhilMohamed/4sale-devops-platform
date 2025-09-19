#!/bin/bash
#
# 4Sale DevOps Platform - Local Deployment Script
# This script deploys the complete platform locally using Docker Compose
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
print_banner() {
    echo "
🚀 4Sale DevOps Platform - Local Deployment
===========================================
    
This script will deploy:
✅ Backend API (Node.js + Express)
✅ Frontend (HTML + Nginx)  
✅ PostgreSQL Database
✅ Prometheus Monitoring
✅ Grafana Dashboards
✅ Jaeger Tracing
✅ Locust Load Testing
    "
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Clean up existing containers
cleanup() {
    log_info "Cleaning up existing containers..."
    docker-compose down -v --remove-orphans 2>/dev/null || true
    docker system prune -f --volumes 2>/dev/null || true
    log_success "Cleanup completed"
}

# Build and start services
deploy_services() {
    log_info "Building and starting services..."
    
    # Create environment file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file..."
        cp app/backend/.env.example .env
    fi
    
    # Start services
    docker-compose up -d --build
    
    log_success "Services started"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for database
    log_info "Waiting for PostgreSQL..."
    timeout 60s bash -c 'until docker-compose exec -T postgres pg_isready -U postgres; do sleep 2; done'
    
    # Wait for backend API
    log_info "Waiting for Backend API..."
    timeout 60s bash -c 'until curl -f http://localhost:3000/health &>/dev/null; do sleep 2; done'
    
    # Wait for frontend
    log_info "Waiting for Frontend..."
    timeout 60s bash -c 'until curl -f http://localhost:8080/health &>/dev/null; do sleep 2; done'
    
    log_success "All services are ready"
}

# Test the deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Test backend health
    if curl -f http://localhost:3000/health &>/dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:8080/health &>/dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Test API functionality
    log_info "Testing API functionality..."
    
    # Create a test task
    TASK_RESPONSE=$(curl -s -X POST http://localhost:3000/addTask \
        -H "Content-Type: application/json" \
        -d '{"title": "Test Task", "description": "Deployment test task", "priority": "high"}')
    
    if echo "$TASK_RESPONSE" | grep -q "Task created successfully"; then
        log_success "Task creation test passed"
    else
        log_error "Task creation test failed"
        return 1
    fi
    
    # List tasks
    if curl -f http://localhost:3000/listTasks &>/dev/null; then
        log_success "Task listing test passed"
    else
        log_error "Task listing test failed"
        return 1
    fi
    
    log_success "All tests passed"
}

# Show service status and URLs
show_service_info() {
    log_info "Service Status:"
    docker-compose ps
    
    echo "
📋 Service URLs:
================
🌐 Frontend:           http://localhost:8080
🔧 Backend API:        http://localhost:3000
📊 Grafana:            http://localhost:3001 (admin/admin123)
📈 Prometheus:         http://localhost:9090
🔍 Jaeger UI:          http://localhost:16686
🧪 Locust UI:          http://localhost:8089

📝 Quick API Tests:
==================
# Health check
curl http://localhost:3000/health

# Create a task
curl -X POST http://localhost:3000/addTask \\
  -H 'Content-Type: application/json' \\
  -d '{\"title\": \"My Task\", \"description\": \"Task description\", \"priority\": \"medium\"}'

# List tasks  
curl http://localhost:3000/listTasks

# View metrics
curl http://localhost:3000/metrics

🐳 Docker Commands:
==================
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
    "
}

# Performance test
run_load_test() {
    log_info "Running performance test..."
    
    if command -v python3 &> /dev/null && pip3 list | grep -q locust; then
        log_info "Starting load test with 10 users..."
        cd scripts
        locust -f locustfile.py --host=http://localhost:3000 --users 10 --spawn-rate 2 --run-time 60s --headless &
        LOCUST_PID=$!
        cd ..
        
        sleep 65  # Wait for test to complete
        
        if kill -0 $LOCUST_PID 2>/dev/null; then
            kill $LOCUST_PID
        fi
        
        log_success "Load test completed"
    else
        log_warning "Locust not installed. Skipping load test."
        log_info "To install: pip3 install locust"
    fi
}

# Monitor resources
monitor_resources() {
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Main execution
main() {
    print_banner
    
    # Parse command line arguments
    SKIP_TESTS=false
    RUN_LOAD_TEST=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --load-test)
                RUN_LOAD_TEST=true
                shift
                ;;
            --cleanup-only)
                cleanup
                exit 0
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests      Skip deployment tests"
                echo "  --load-test       Run load test after deployment"
                echo "  --cleanup-only    Only cleanup existing deployment"
                echo "  -h, --help        Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    cleanup
    deploy_services
    wait_for_services
    
    if [ "$SKIP_TESTS" = false ]; then
        test_deployment
    fi
    
    show_service_info
    monitor_resources
    
    if [ "$RUN_LOAD_TEST" = true ]; then
        run_load_test
    fi
    
    log_success "🎉 4Sale DevOps Platform deployed successfully!"
    log_info "Check the service URLs above to start exploring the platform."
}

# Trap signals for cleanup
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
