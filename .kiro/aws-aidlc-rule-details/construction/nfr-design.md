# NFR Design (Conditional, Per-Unit)

**Purpose**: Incorporate NFR patterns into the design.

## Thiên Đạo Game NFR Design Patterns

### Performance Patterns:
- **Connection Pooling**: GORM with pgx pool (max 25 connections)
- **Caching**: In-memory cache for character_dicts and equipment_dicts (rarely change)
- **Pagination**: Cursor-based for battle logs, offset for character lists
- **Lazy Loading**: Load equipment stats only when needed for combat

### Security Patterns:
- **JWT Middleware**: Validate on every protected endpoint
- **Rate Limiting**: Token bucket per user (10 gacha rolls/minute)
- **Input Validation**: Gin binding tags + custom validators
- **Crypto Random**: crypto/rand.Int for all gacha decisions

### Reliability Patterns:
- **Database Transactions**: Wrap gacha roll in single transaction
- **Graceful Shutdown**: Uber Fx lifecycle hooks
- **Error Wrapping**: fmt.Errorf with %w for error chains
- **Health Check**: /health endpoint for Docker healthcheck

### Deployment Patterns:
- **Multi-stage Docker**: Builder + Alpine runtime
- **Resource Limits**: Docker Compose memory limits
- **Nginx Reverse Proxy**: Static files + API proxy
- **Environment Config**: .env files, never hardcode secrets

## Execute IF:
- NFR Requirements was executed
- Patterns need to be incorporated into design

## Skip IF:
- No NFR requirements identified
- NFR Requirements was skipped

## Execution Steps

### Step 1: Select Applicable Patterns
- [ ] Review NFR requirements for this unit
- [ ] Select patterns that address each requirement
- [ ] Document pattern application points

### Step 2: Design Pattern Integration
- [ ] Map patterns to code locations
- [ ] Define configuration parameters
- [ ] Document trade-offs

### Step 3: Create NFR Design Document
- [ ] Save to `aidlc-docs/construction/{unit-name}/nfr-design/nfr-design.md`
- [ ] Include selected patterns
- [ ] Include integration points
- [ ] Include configuration

### Step 4: Present Completion Message

```markdown
# 🛡️ NFR Design Complete - [unit-name]

Patterns applied:
• **Performance**: [patterns selected]
• **Security**: [patterns selected]
• **Reliability**: [patterns selected]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine at: `aidlc-docs/construction/[unit-name]/nfr-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications
> ✅ **Continue to Next Stage** - Approve and proceed

---
```

### Step 5: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
