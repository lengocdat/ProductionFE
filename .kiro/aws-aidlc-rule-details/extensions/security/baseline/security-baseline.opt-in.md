# Security Baseline Extension - Opt-In

## Description
Enforces security best practices for the Thiên Đạo Game project including:
- JWT token security (secret strength, expiry, refresh)
- Gacha fairness (crypto/rand, no manipulation)
- Input validation on all endpoints
- SQL injection prevention (GORM parameterized)
- Rate limiting on sensitive endpoints
- No secrets in code or logs

## Opt-In Prompt

**Q: Would you like to enable the Security Baseline extension?**

This extension enforces:
- A) **Yes** — Enforce security rules (JWT best practices, crypto/rand for gacha, input validation, rate limiting)
- B) **No** — Skip security enforcement (faster development, add security later)

Recommended: **A** (security issues are harder to fix later)

[Answer]:
