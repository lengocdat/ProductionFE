# Infrastructure Design (Conditional, Per-Unit)

**Purpose**: Map to actual infrastructure services and deployment architecture.

## Thiên Đạo Game Infrastructure Context

### VPS Specification:
- **RAM**: 4GB total
- **Storage**: ~20GB available
- **OS**: Linux (Ubuntu/Debian)
- **Docker**: Docker Compose deployment

### Resource Allocation:
| Service | RAM Limit | Notes |
|---------|-----------|-------|
| PostgreSQL | 1.5GB | shared_buffers=512MB |
| Go Backend | 512MB | Typical ~200MB |
| Nginx | 128MB | Static files + proxy |
| OS + Docker | ~1.8GB | Overhead |

### Docker Compose Architecture:
```
┌─────────────────────────────────────────┐
│                VPS (4GB RAM)             │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌───────┐  │
│  │  Nginx  │──│ Backend  │──│  DB   │  │
│  │  :80    │  │  :8080   │  │ :5432 │  │
│  └─────────┘  └──────────┘  └───────┘  │
│       │                                  │
│  ┌─────────┐                            │
│  │Frontend │ (static files in Nginx)    │
│  │  dist/  │                            │
│  └─────────┘                            │
└─────────────────────────────────────────┘
```

### Deployment Strategy:
- Frontend: Build → copy dist/ to Nginx container
- Backend: Multi-stage Docker build (Go binary)
- Database: PostgreSQL container with volume persistence
- Nginx: Reverse proxy (API) + static file server (Frontend)

## Execute IF:
- Infrastructure services need mapping
- Deployment architecture required
- Docker configuration needed
- New services being added

## Skip IF:
- No infrastructure changes
- Infrastructure already defined and unchanged

## Execution Steps

### Step 1: Map Services to Infrastructure
- [ ] List all services for this unit
- [ ] Define container requirements
- [ ] Map ports and networking
- [ ] Define volume mounts

### Step 2: Design Docker Configuration
- [ ] Dockerfile for backend (multi-stage)
- [ ] Dockerfile for frontend (multi-stage with Nginx)
- [ ] docker-compose.yaml services
- [ ] Environment variables mapping
- [ ] Resource limits

### Step 3: Design Nginx Configuration
- [ ] API proxy rules (/api/* → backend:8080)
- [ ] Static file serving (/ → /usr/share/nginx/html)
- [ ] CORS headers (if needed)
- [ ] Rate limiting at Nginx level

### Step 4: Create Infrastructure Design Document
- [ ] Save to `aidlc-docs/construction/{unit-name}/infrastructure-design/infrastructure-design.md`
- [ ] Include service architecture diagram
- [ ] Include Docker configuration specs
- [ ] Include resource allocation table
- [ ] Include deployment steps

### Step 5: Present Completion Message

```markdown
# 🏗️ Infrastructure Design Complete - [unit-name]

Infrastructure:
• **Services**: [count] containers defined
• **RAM Allocation**: [breakdown]
• **Deployment**: Docker Compose on VPS 4GB

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine at: `aidlc-docs/construction/[unit-name]/infrastructure-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications
> ✅ **Continue to Next Stage** - Approve and proceed to **Code Generation**

---
```

### Step 6: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
