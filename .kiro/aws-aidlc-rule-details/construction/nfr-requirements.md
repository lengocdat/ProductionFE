# NFR Requirements (Conditional, Per-Unit)

**Purpose**: Determine non-functional requirements and constraints for the unit.

## Thiên Đạo Game NFR Context

### Performance (VPS 4GB RAM):
- PostgreSQL: 1.5GB RAM limit, shared_buffers=512MB
- Go backend: ~200MB RAM typical
- Nginx: ~50MB RAM
- Target: <200ms API response time for gacha/combat
- Concurrent users: 100-500 (MVP target)

### Security:
- JWT authentication (HS256, 24h expiry)
- crypto/rand for gacha randomness (provably fair)
- Rate limiting on gacha endpoint (prevent spam)
- Input validation on all endpoints
- SQL injection prevention (GORM parameterized queries)
- No sensitive data in JWT payload (only userID)

### Reliability:
- Transaction-based gacha (no partial state)
- Idempotent combat results (same seed = same result)
- Graceful error handling (no panic in production)
- Database connection pooling

### Scalability (Future):
- Stateless backend (horizontal scaling ready)
- Database indexes on frequently queried columns
- Pagination on list endpoints
- Caching strategy for character/equipment dictionaries

## Execute IF:
- Performance requirements exist (VPS constraints)
- Security considerations needed (auth, randomness)
- New infrastructure components

## Skip IF:
- No NFR requirements
- Simple changes within existing boundaries

## Execution Steps

### Step 1: Assess NFR Categories
- [ ] Performance requirements for this unit
- [ ] Security requirements for this unit
- [ ] Reliability requirements for this unit
- [ ] Scalability considerations

### Step 2: Define Constraints
- [ ] Memory constraints (VPS 4GB total)
- [ ] Response time targets
- [ ] Throughput requirements
- [ ] Storage constraints

### Step 3: Create NFR Document
- [ ] Save to `aidlc-docs/construction/{unit-name}/nfr-requirements/nfr-requirements.md`
- [ ] Include performance targets
- [ ] Include security requirements
- [ ] Include reliability requirements

### Step 4: Present Completion Message

```markdown
# ⚡ NFR Requirements Complete - [unit-name]

Requirements identified:
• **Performance**: [key targets]
• **Security**: [key requirements]
• **Reliability**: [key requirements]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine at: `aidlc-docs/construction/[unit-name]/nfr-requirements/`

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
