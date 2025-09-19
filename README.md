# 🚀 4Sale DevOps Platform - Secure, Observable, Scalable Cloud Environment

A comprehensive DevOps platform built for 4Sale, demonstrating modern cloud-native architecture with security-first approach, comprehensive monitoring, and automated CI/CD pipelines.

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Local Development](#-local-development)
- [Infrastructure Setup](#-infrastructure-setup)
- [CI/CD Pipelines](#-cicd-pipelines)
- [Security Implementation](#-security-implementation)
- [Monitoring & Observability](#-monitoring--observability)
- [Scaling & Performance](#-scaling--performance)
- [Cost Optimization](#-cost-optimization)
- [Disaster Recovery](#-disaster-recovery)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  AWS WAF + CloudFront                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Application Load Balancer                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   EKS Cluster                               │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   Frontend      │    Backend      │   Monitoring    │    │
│  │   (Nginx)       │   (Node.js)     │  (Prometheus)   │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   RDS PostgreSQL                            │
│                (Multi-AZ, Encrypted)                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **3-Tier Application**
   - Frontend: Static React/HTML served via Nginx
   - Backend: Node.js API with Express framework
   - Database: PostgreSQL with automated backups

2. **Infrastructure**
   - AWS EKS for container orchestration
   - VPC with public/private subnets across multiple AZs
   - RDS for managed database services
   - CloudFront for global CDN

3. **Security**
   - Pod Security Admission (PSA) standards
   - Network Policies for micro-segmentation
   - WAF for DDoS protection
   - Encryption at rest and in transit

4. **Monitoring**
   - Prometheus for metrics collection
   - Grafana for visualization
   - OpenTelemetry + Jaeger for distributed tracing
   - ELK stack for log aggregation

## ✨ Features

### DevSecOps Pipeline
- ✅ Automated security scanning (Trivy, Snyk)
- ✅ Container image signing with Cosign
- ✅ Infrastructure as Code with Terraform
- ✅ GitOps deployment with ArgoCD
- ✅ Secret management with AWS Secrets Manager

### Scalability & Performance
- ✅ Horizontal Pod Autoscaler (HPA)
- ✅ Vertical Pod Autoscaler (VPA)
- ✅ Cluster Autoscaler
- ✅ Load testing with Locust
- ✅ Performance monitoring

### Observability
- ✅ Distributed tracing with Jaeger
- ✅ Metrics visualization with Grafana
- ✅ Log aggregation with Fluentd/ELK
- ✅ Health checks and alerting
- ✅ SLA/SLO monitoring

### Security
- ✅ Non-root containers
- ✅ Read-only root filesystems
- ✅ Network policies
- ✅ RBAC implementation
- ✅ Security scanning in CI/CD
- ✅ Admission controllers

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- kubectl
- AWS CLI configured
- Terraform >= 1.5
- Node.js >= 18
- Git

### Local Development with Docker Compose

1. **Clone the repository:**
```bash
git clone https://github.com/4sale/devops-platform.git
cd 4sale-devops-platform
```

2. **Start local environment:**
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

3. **Access services:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Grafana: http://localhost:3001 (admin/admin123)
- Prometheus: http://localhost:9090
- Jaeger UI: http://localhost:16686
- Locust UI: http://localhost:8089

4. **Test the API:**
```bash
# Health check
curl http://localhost:3000/health

# Create a task
curl -X POST http://localhost:3000/addTask \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Task", "description": "Testing the API", "priority": "medium"}'

# List tasks
curl http://localhost:3000/listTasks
```

## 🏗️ Infrastructure Setup

### AWS Infrastructure Deployment

1. **Configure AWS credentials:**
```bash
aws configure
```

2. **Deploy development environment:**
```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply
```

3. **Deploy production environment:**
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply
```

### Infrastructure Components

#### Network Architecture
- **VPC**: Custom VPC with DNS resolution enabled
- **Subnets**: Public, private, and database subnets across 3 AZs
- **NAT Gateways**: High availability NAT gateways for private subnet internet access
- **Security Groups**: Least-privilege security groups
- **VPC Endpoints**: Cost-optimized VPC endpoints for AWS services

#### EKS Cluster
- **Control Plane**: Managed EKS control plane with private endpoint access
- **Node Groups**: Managed node groups with spot instances for cost optimization
- **Add-ons**: AWS Load Balancer Controller, EBS CSI driver, CoreDNS
- **RBAC**: Fine-grained role-based access control

#### Database
- **RDS PostgreSQL**: Multi-AZ deployment with automated backups
- **Security**: Encryption at rest with AWS KMS
- **Monitoring**: Enhanced monitoring with Performance Insights
- **Backup**: Point-in-time recovery with 7-day retention

## 🔄 CI/CD Pipelines

### Application Pipeline (`.github/workflows/app-deploy.yml`)

**Triggers**: Push to main, PR to main

**Stages**:
1. **Code Quality**
   - ESLint for JavaScript
   - Prettier for code formatting
   - Unit tests with Jest

2. **Security Scanning**
   - Dependency vulnerability scan with Snyk
   - Code security analysis with CodeQL
   - Container image scanning with Trivy

3. **Build & Test**
   - Docker image build
   - Integration tests
   - End-to-end tests with Playwright

4. **Security Hardening**
   - Image signing with Cosign
   - SBOM generation
   - Registry security scan

5. **Deployment**
   - Kubernetes manifest validation
   - Rolling deployment with zero downtime
   - Post-deployment health checks

### Infrastructure Pipeline (`.github/workflows/infra-deploy.yml`)

**Triggers**: Changes to `infrastructure/` directory

**Stages**:
1. **Validation**
   - Terraform format check
   - Terraform validate
   - Checkov security scan
   - Cost estimation with Infracost

2. **Planning**
   - Terraform plan
   - Policy validation with OPA
   - Security compliance check

3. **Deployment**
   - Terraform apply (with manual approval for prod)
   - Infrastructure testing
   - Documentation update

## 🛡️ Security Implementation

### Access Control
- **RBAC**: Kubernetes role-based access control
- **Pod Security**: PSA restricted policy enforcement
- **Network Policies**: Micro-segmentation between services
- **Service Mesh**: Istio for service-to-service encryption

### DDoS Protection & WAF
- **AWS WAF**: Layer 7 DDoS protection with rate limiting
- **CloudFront**: Geographic blocking and bot protection
- **Security Headers**: OWASP security headers implementation

### Data Encryption
- **At Rest**: 
  - RDS encryption with AWS KMS
  - EBS volume encryption
  - S3 bucket encryption
- **In Transit**:
  - TLS 1.2+ for all communications
  - Certificate management with cert-manager
  - Internal service mesh encryption

### Secrets Management
- **AWS Secrets Manager**: Database credentials and API keys
- **External Secrets Operator**: Kubernetes secret management
- **Sealed Secrets**: GitOps-friendly secret encryption
- **Rotation**: Automated secret rotation policies

### Security Testing
```bash
# Run security scans locally
./scripts/security-scan.sh

# Container image scanning
trivy image task-backend:latest

# Infrastructure security scan
checkov -d infrastructure/terraform/

# Dependency vulnerability scan
npm audit
```

## 📊 Monitoring & Observability

### Metrics Collection
- **Prometheus**: Metrics collection from all services
- **Node Exporter**: System-level metrics
- **PostgreSQL Exporter**: Database metrics
- **Custom Metrics**: Application-specific business metrics

### Visualization
- **Grafana Dashboards**:
  - Application Performance Dashboard
  - Infrastructure Overview
  - Database Metrics
  - Security Metrics
  - Cost Analysis

### Distributed Tracing
- **OpenTelemetry**: Auto-instrumentation for Node.js
- **Jaeger**: Trace visualization and analysis
- **Service Map**: Dependency visualization

### Logging
- **Centralized Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
- **Log Aggregation**: Fluentd for log collection
- **Log Retention**: 30 days for application logs, 7 days for system logs
- **Search & Analytics**: Full-text search with Elasticsearch

### Alerting Rules

Critical alerts configured for:
- **High CPU Usage**: >80% for 5 minutes
- **Memory Usage**: >85% for 5 minutes
- **Pod Crash Loops**: >3 restarts in 10 minutes
- **Database Connectivity**: Connection failures
- **API Response Time**: >500ms for 2 minutes
- **Error Rate**: >5% for 5 minutes

### SLA/SLO Monitoring
- **Availability SLO**: 99.9% uptime
- **Response Time SLO**: 95% of requests <200ms
- **Error Rate SLO**: <0.1% 4xx/5xx errors

## 📈 Scaling & Performance

### Horizontal Pod Autoscaling

HPA configured with multiple metrics:
- **CPU Utilization**: Target 70%
- **Memory Utilization**: Target 80%
- **Custom Metrics**: HTTP requests per second
- **Scaling Behavior**: Gradual scale-up, conservative scale-down

### Vertical Pod Autoscaling

VPA recommendations for:
- Resource request optimization
- Cost reduction
- Performance improvement

### Cluster Autoscaling

Cluster Autoscaler configuration:
- **Node Groups**: On-demand and Spot instances
- **Scale-out**: When pods cannot be scheduled
- **Scale-in**: When nodes are underutilized
- **Cost Optimization**: Preferential Spot instance usage

### Load Testing

Locust-based load testing:

```bash
# Run load test against local environment
cd scripts
locust -f locustfile.py --host=http://localhost:3000 --users 100 --spawn-rate 10

# Run load test against Kubernetes deployment
kubectl apply -f k8s/base/monitoring/locust-job.yaml
```

**Test Scenarios**:
- **Normal Load**: 50 concurrent users
- **Peak Load**: 200 concurrent users  
- **Stress Test**: 500 concurrent users
- **Spike Test**: Sudden load increase to 1000 users

## 💰 Cost Optimization

### Infrastructure Optimization
- **Spot Instances**: 70% cost savings for non-critical workloads
- **Reserved Instances**: For predictable workloads
- **Right Sizing**: VPA recommendations for optimal resource allocation
- **Auto-scaling**: Dynamic scaling based on demand

### Storage Optimization
- **EBS GP3**: Cost-effective storage with performance tuning
- **S3 Intelligent Tiering**: Automatic cost optimization
- **Database Storage**: Auto-scaling RDS storage

### Monitoring & FinOps
- **Cost Allocation Tags**: Detailed cost tracking
- **Budget Alerts**: Automated cost notifications
- **Resource Cleanup**: Automated unused resource cleanup
- **Cost Dashboard**: Real-time cost visualization in Grafana

### Monthly Cost Estimates (Production)
- **EKS Cluster**: ~$150/month
- **RDS (Multi-AZ)**: ~$200/month
- **Load Balancer**: ~$25/month
- **Data Transfer**: ~$50/month
- **Storage**: ~$30/month
- **Total**: ~$455/month

## 🔄 Disaster Recovery

### Backup Strategy
- **Database**: 
  - Automated daily backups with 7-day retention
  - Point-in-time recovery capability
  - Cross-region backup replication
- **Configuration**:
  - Infrastructure as Code in version control
  - Kubernetes manifests in Git
  - Secrets backed up in AWS Secrets Manager

### Multi-Region Setup
- **Primary Region**: us-west-2
- **DR Region**: us-east-1
- **RTO**: 1 hour (Recovery Time Objective)
- **RPO**: 15 minutes (Recovery Point Objective)

### Testing
- **Disaster Recovery Drills**: Monthly automated DR testing
- **Chaos Engineering**: Using Chaos Monkey for resilience testing
- **Backup Restoration**: Automated backup validation

## 🧪 Testing Strategy

### Unit Tests
```bash
# Backend unit tests
cd app/backend
npm test

# Frontend unit tests  
cd app/frontend
npm test
```

### Integration Tests
```bash
# API integration tests
npm run test:integration

# Database integration tests
npm run test:db
```

### End-to-End Tests
```bash
# E2E tests with Playwright
npm run test:e2e
```

### Performance Tests
```bash
# Load testing with Locust
locust -f scripts/locustfile.py --host=https://api.4sale.com
```

## 🔧 Local Development

### Development Workflow

1. **Start development environment:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **Make code changes**

3. **Run tests:**
```bash
npm test
```

4. **Commit with conventional commits:**
```bash
git commit -m "feat: add new task priority feature"
```

5. **Push and create PR**

### Debugging

**Backend debugging:**
```bash
# View application logs
docker-compose logs -f backend

# Access database
docker-compose exec postgres psql -U postgres -d taskdb

# Monitor metrics
curl http://localhost:3000/metrics
```

**Frontend debugging:**
```bash
# View nginx logs
docker-compose logs -f frontend

# Access application
open http://localhost:8080
```

## 📚 Documentation

### API Documentation
- **OpenAPI Spec**: Available at `/docs` endpoint
- **Postman Collection**: `docs/api/postman-collection.json`
- **API Examples**: `docs/api/examples/`

### Architecture Documentation
- **System Design**: `docs/architecture/system-design.md`
- **Security Architecture**: `docs/architecture/security.md`
- **Monitoring Strategy**: `docs/architecture/monitoring.md`

### Runbooks
- **Incident Response**: `docs/runbooks/incident-response.md`
- **Scaling Procedures**: `docs/runbooks/scaling.md`
- **Backup & Recovery**: `docs/runbooks/backup-recovery.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow conventional commit messages
- Add tests for new features
- Update documentation
- Ensure security scans pass
- Follow code style guidelines

## 📞 Support

### Getting Help
- **Issues**: Create GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the docs/ directory
- **Runbooks**: Follow incident response procedures

### Troubleshooting

**Common Issues:**

1. **Pod not starting:**
```bash
kubectl describe pod <pod-name> -n task-app
kubectl logs <pod-name> -n task-app
```

2. **Database connection issues:**
```bash
# Check database connectivity
kubectl exec -it deployment/task-backend -n task-app -- nc -zv postgres-service.database.svc.cluster.local 5432
```

3. **High memory usage:**
```bash
# Check resource usage
kubectl top pods -n task-app
kubectl describe hpa -n task-app
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for 4Sale by the DevOps Team**

For more detailed documentation, please refer to the `docs/` directory.
