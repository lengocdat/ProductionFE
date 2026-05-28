# Security Baseline Rules

**Purpose**: Enforce security best practices for Thiên Đạo Game.

## Mandatory Rules (When Enabled)

### 1. Authentication & JWT
- [ ] JWT secret must be at least 32 characters
- [ ] Token expiry: max 24 hours
- [ ] Only store userID in JWT payload (no sensitive data)
- [ ] Validate token on every protected endpoint
- [ ] Use HS256 or RS256 algorithm
- [ ] Never log JWT tokens

### 2. Gacha Fairness
- [ ] MUST use crypto/rand for all gacha randomness
- [ ] NEVER use math/rand for gacha decisions
- [ ] Gacha rates must match game_config.json exactly
- [ ] Pity counter must be atomic (transaction-protected)
- [ ] Log all gacha results for audit (without exposing internal state)

### 3. Input Validation
- [ ] Validate all request bodies with Gin binding tags
- [ ] Validate path parameters (uint IDs, no negative)
- [ ] Validate query parameters (pagination limits)
- [ ] Sanitize string inputs (no XSS in character names)
- [ ] Reject oversized requests (max body size)

### 4. Database Security
- [ ] Use GORM parameterized queries (never raw SQL with string concat)
- [ ] Use transactions for multi-step operations
- [ ] Never expose internal DB errors to client
- [ ] Validate foreign key references before operations

### 5. Rate Limiting
- [ ] Gacha endpoint: max 10 rolls/minute per user
- [ ] Auth endpoints: max 5 attempts/minute per IP
- [ ] Combat endpoint: max 30 battles/minute per user
- [ ] General API: max 100 requests/minute per user

### 6. Secrets Management
- [ ] All secrets in .env file (never in code)
- [ ] .env in .gitignore
- [ ] .env.example with placeholder values
- [ ] Never log secret values
- [ ] Docker secrets via environment variables

### 7. Frontend Security
- [ ] Store JWT in httpOnly cookie OR localStorage with XSS prevention
- [ ] CORS configuration (allow only known origins)
- [ ] No sensitive data in frontend state/localStorage
- [ ] Validate API responses before rendering

## Compliance Check

At each stage, verify:
- Are new endpoints protected by JWT middleware?
- Are new gacha/random operations using crypto/rand?
- Are new inputs validated?
- Are new DB operations parameterized?
- Are secrets properly managed?

## Non-Compliance = Blocking Finding
If any rule is violated, the stage CANNOT be marked complete until fixed.
