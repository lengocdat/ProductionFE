# Reverse Engineering (Brownfield Only)

**Purpose**: Analyze existing codebase to understand architecture, patterns, and components before making changes.

## Thiên Đạo Game Context
If ThienDaoGame/ or ThienDaoGameFE/ already exist with code, this stage analyzes the existing implementation to understand what's already built and what needs modification.

**Reference Projects**: Also analyze Production/ and ProductionFE/ to understand the patterns that ThienDaoGame should follow.

## Prerequisites
- Workspace Detection must be complete
- Brownfield flag must be set to true

## Step 1: Analyze All Packages and Components

### Backend (ThienDaoGame/)
- [ ] Scan all Go packages and their responsibilities
- [ ] Identify Uber Fx modules and DI graph
- [ ] Map service interfaces and implementations
- [ ] Document repository layer and database interactions
- [ ] Identify middleware chain
- [ ] Map API routes and handlers

### Frontend (ThienDaoGameFE/)
- [ ] Scan all React components and pages
- [ ] Identify state management approach
- [ ] Map API service layer
- [ ] Document routing structure
- [ ] Identify shared utilities and hooks

## Step 2: Generate Architecture Documentation

Create `aidlc-docs/inception/reverse-engineering/architecture.md`:
- System overview diagram
- Backend architecture (layers, DI, middleware)
- Frontend architecture (components, state, routing)
- Database schema (tables, relationships)
- API contract (endpoints, request/response)

## Step 3: Generate Component Inventory

Create `aidlc-docs/inception/reverse-engineering/component-inventory.md`:
- All Go packages with descriptions
- All React components with descriptions
- Database tables and their purposes
- External dependencies

## Step 4: Generate Technology Stack

Create `aidlc-docs/inception/reverse-engineering/technology-stack.md`:
- Backend: Go version, Gin, Uber Fx, GORM, JWT, slog
- Frontend: React, Vite, TypeScript, TailwindCSS, Axios
- Database: PostgreSQL version, GORM migrations
- Deploy: Docker, Nginx, Docker Compose
- Game-specific: crypto/rand, game_config.json

## Step 5: Generate Business Overview

Create `aidlc-docs/inception/reverse-engineering/business-overview.md`:
- Game systems implemented (gacha, combat, equipment, etc.)
- Player journeys (registration → gacha → combat → progression)
- Monetization flows
- AFK reward system

## Step 6: Present Completion Message

```markdown
# 🔍 Reverse Engineering Complete

Analysis findings:
• **Backend**: [summary of Go backend state]
• **Frontend**: [summary of React frontend state]
• **Database**: [summary of schema state]
• **Game Systems**: [which systems are implemented]
• **Gaps**: [what's missing vs deep-research-report.md]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the reverse engineering artifacts at: `aidlc-docs/inception/reverse-engineering/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the analysis
> ✅ **Approve & Continue** - Approve and proceed to **Requirements Analysis**

---
```

## Step 7: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
