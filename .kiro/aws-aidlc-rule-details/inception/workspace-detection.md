# Workspace Detection

**Purpose**: Determine workspace state and check for existing AI-DLC projects

## Project Context: Thiên Đạo Game
This workspace contains the **Thiên Đạo Game** project — a Gacha Tu Tiên auto-battler game. The project follows the same architecture patterns as the existing Production (Go backend) and ProductionFE (React frontend) projects in the workspace.

**Key Technical Decisions (Pre-determined)**:
- Backend: Go with Gin + Uber Fx + GORM (same patterns as Production)
- Frontend: React + Vite + TypeScript + TailwindCSS (same patterns as ProductionFE)
- Database: PostgreSQL (users, characters, equipment, battles, afk_events)
- Auth: JWT (golang-jwt/jwt/v5)
- Deploy: Docker Compose (VPS 4GB RAM, PostgreSQL 1.5GB limit)
- Game Config: JSON file for balance data (gacha rates, combat formulas, etc.)
- Randomness: crypto/rand for gacha fairness

**Reference Projects in Workspace**:
- `Production/` — Go backend reference (Uber Fx, Gin, clean architecture, GORM)
- `ProductionFE/` — React frontend reference (Vite, TailwindCSS, TypeScript)

## Step 1: Check for Existing AI-DLC Project

Check if `aidlc-docs/aidlc-state.md` exists:
- **If exists**: Resume from last phase (load context from previous phases)
- **If not exists**: Continue with new project assessment

## Step 2: Scan Workspace for Existing Code

**Determine if workspace has existing code:**
- Scan workspace for source code files (.go, .ts, .tsx, .js, .jsx, etc.)
- Check for build files (go.mod, package.json, etc.)
- Look for project structure indicators
- Identify workspace root directory (NOT aidlc-docs/)
- **Check for ThienDaoGame/ and ThienDaoGameFE/ directories**

**Record findings:**
```markdown
## Workspace State
- **Existing Code**: [Yes/No]
- **Programming Languages**: [List if found]
- **Build System**: [Go modules/npm/etc. if found]
- **Project Structure**: [Monolith/Microservices/Library/Empty]
- **Workspace Root**: [Absolute path]
- **Reference Projects**: Production (Go BE), ProductionFE (React FE)
```

## Step 3: Determine Next Phase

**IF workspace is empty (no ThienDaoGame code)**:
- Set flag: `brownfield = false`
- Next phase: Requirements Analysis

**IF workspace has existing ThienDaoGame code**:
- Set flag: `brownfield = true`
- Check for existing reverse engineering artifacts in `aidlc-docs/inception/reverse-engineering/`
- **IF reverse engineering artifacts exist**: Load them, skip to Requirements Analysis
- **IF no reverse engineering artifacts**: Next phase is Reverse Engineering

## Step 4: Create Initial State File

Create `aidlc-docs/aidlc-state.md`:

```markdown
# AI-DLC State Tracking

## Project Information
- **Project Name**: Thiên Đạo Game (Gacha Tu Tiên)
- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO timestamp]
- **Current Stage**: INCEPTION - Workspace Detection
- **Game Design Doc**: deep-research-report.md

## Workspace State
- **Existing Code**: [Yes/No]
- **Reverse Engineering Needed**: [Yes/No]
- **Workspace Root**: [Absolute path]
- **Backend Dir**: ThienDaoGame/
- **Frontend Dir**: ThienDaoGameFE/

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Backend**: ThienDaoGame/ (Go, giống Production/)
- **Frontend**: ThienDaoGameFE/ (React, giống ProductionFE/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress
[Will be populated as workflow progresses]
```

## Step 5: Present Completion Message

**For Brownfield Projects:**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Brownfield project
• [AI-generated summary of workspace findings in bullet points]
• **Next Step**: Proceeding to **Reverse Engineering** to analyze existing codebase...
```

**For Greenfield Projects:**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Greenfield project (Thiên Đạo Game)
• **Reference**: Production (Go BE patterns), ProductionFE (React FE patterns)
• **Next Step**: Proceeding to **Requirements Analysis**...
```

## Step 6: Automatically Proceed

- **No user approval required** - this is informational only
- Automatically proceed to next phase:
  - **Brownfield**: Reverse Engineering (if no existing artifacts) or Requirements Analysis (if artifacts exist)
  - **Greenfield**: Requirements Analysis
