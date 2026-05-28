# Code Generation - Detailed Steps

## Overview
This stage generates code for each unit of work through two integrated parts:
- **Part 1 - Planning**: Create detailed code generation plan with explicit steps
- **Part 2 - Generation**: Execute approved plan to generate code, tests, and artifacts

**Note**: For brownfield projects, "generate" means modify existing files when appropriate, not create duplicates.

## Thiên Đạo Game Code Generation Context

### Backend Project Structure (Go — giống Production):
```
ThienDaoGame/
├── cmd/main.go                    # Entry point with Uber Fx
├── config/config.go               # Viper config (PostgreSQL, JWT, Game)
├── api/v1/
│   ├── router.go                  # Route registration
│   ├── module.go                  # Fx module
│   ├── auth.go                    # Login/Register endpoints
│   ├── gacha.go                   # Gacha roll endpoints
│   ├── character.go               # Character management
│   ├── combat.go                  # Battle endpoints
│   ├── equipment.go               # Equipment endpoints
│   └── health_check.go
├── internal/
│   ├── middleware/
│   │   ├── auth.go                # JWT middleware
│   │   └── ratelimit.go
│   ├── dto/
│   │   ├── request/
│   │   │   ├── auth_req.go
│   │   │   ├── gacha_req.go
│   │   │   └── combat_req.go
│   │   └── response/
│   │       ├── auth_resp.go
│   │       ├── gacha_resp.go
│   │       ├── character_resp.go
│   │       └── combat_resp.go
│   ├── model/
│   │   ├── user.go                # User entity
│   │   ├── character_dict.go      # Character dictionary (shared)
│   │   ├── user_character.go      # Player's characters
│   │   ├── equipment_dict.go      # Equipment dictionary (shared)
│   │   ├── user_equipment.go      # Player's equipment
│   │   ├── battle_log.go          # Battle history
│   │   └── afk_event.go           # AFK reward events
│   ├── service/
│   │   ├── module.go
│   │   ├── auth.go                # JWT token generation/validation
│   │   ├── gacha.go               # Gacha logic (rates, pity, traits)
│   │   ├── combat.go              # Auto-battler engine
│   │   ├── character.go           # Character management
│   │   ├── equipment.go           # Equipment & set bonus
│   │   └── afk.go                 # AFK rewards generator
│   └── repository/
│       ├── module.go
│       ├── user.go
│       ├── character.go
│       ├── equipment.go
│       └── battle.go
├── pkg/
│   ├── postgres/
│   │   ├── postgres.go            # GORM connection
│   │   └── module.go
│   └── gameconfig/
│       └── config.go              # Game balance config loader
├── httpserver/
│   ├── server.go
│   └── module.go
├── migrations/
│   ├── 001_init.sql
│   └── 002_seed_data.sql
├── game_config.json               # Game balance data
├── deployment/
│   ├── Dockerfile
│   ├── docker-compose.yaml
│   └── nginx/nginx.conf
├── Makefile
├── go.mod
├── .env
└── .env.example
```

### Frontend Project Structure (React — giống ProductionFE):
```
ThienDaoGameFE/
├── src/
│   ├── components/
│   │   ├── gacha/
│   │   │   ├── GachaScreen.tsx
│   │   │   ├── GachaAnimation.tsx
│   │   │   └── GachaResult.tsx
│   │   ├── combat/
│   │   │   ├── CombatReplay.tsx
│   │   │   ├── BattleLog.tsx
│   │   │   └── HPBar.tsx
│   │   ├── character/
│   │   │   ├── CharacterCard.tsx
│   │   │   ├── CharacterList.tsx
│   │   │   └── TraitBadge.tsx
│   │   ├── equipment/
│   │   │   ├── EquipmentSlot.tsx
│   │   │   └── SetBonusDisplay.tsx
│   │   └── common/
│   │       ├── Layout.tsx
│   │       ├── Navbar.tsx
│   │       ├── Loading.tsx
│   │       └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Gacha.tsx
│   │   ├── Combat.tsx
│   │   ├── Characters.tsx
│   │   ├── Equipment.tsx
│   │   ├── Leaderboard.tsx
│   │   └── Login.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useApi.ts
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── authService.ts
│   │   ├── gachaService.ts
│   │   ├── characterService.ts
│   │   ├── combatService.ts
│   │   └── equipmentService.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── gameStore.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── character.ts
│   │   ├── equipment.ts
│   │   ├── combat.ts
│   │   └── gacha.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── assets/                    # Game images, icons
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── Dockerfile
└── .env
```

### Key Patterns to Follow (from Production/ProductionFE):
- **Backend**: Uber Fx modules for DI, interface-based design, constructor functions return interfaces, Gin handlers as exported structs, Viper config, slog logging, GORM for DB
- **Frontend**: Component-based architecture, TypeScript strict mode, TailwindCSS utility classes, Axios for HTTP, React Router v6, custom hooks for logic
- **Game-specific**: crypto/rand for gacha fairness, JSON config for game balance, transaction-based gacha rolls

### Database: PostgreSQL + GORM
- AutoMigrate for development
- Manual migrations in `migrations/` for production
- Tables: users, character_dicts, user_characters, equipment_dicts, user_equipments, battle_logs, afk_events
- JSON columns for traits, stat_boosts, battle_log, rewards

### Game Systems Implementation Order:
1. Auth (JWT login/register)
2. Character Dictionary & Gacha System
3. Equipment Dictionary & Management
4. Combat Engine (auto-battler)
5. AFK Rewards System
6. PvP Leaderboard
7. World Boss (stretch goal)

## Prerequisites
- Unit Design Generation must be complete for the unit
- All unit design artifacts must be available
- Unit is ready for code generation

---

# PART 1: PLANNING

## Step 1: Analyze Unit Context
- [ ] Read unit design artifacts from Unit Design Generation
- [ ] Read unit story map to understand assigned stories
- [ ] Identify unit dependencies and interfaces
- [ ] Validate unit is ready for code generation

## Step 2: Create Detailed Unit Code Generation Plan
- [ ] Read workspace root and project type from `aidlc-docs/aidlc-state.md`
- [ ] Determine code location (Backend: ThienDaoGame/, Frontend: ThienDaoGameFE/)
- [ ] **Brownfield only**: Review reverse engineering code-structure.md for existing files to modify
- [ ] Document exact paths (never aidlc-docs/)
- [ ] Create explicit steps for unit generation:
  - Project Structure Setup (greenfield only)
  - Database Models (GORM structs)
  - Repository Layer Generation
  - Service Layer Generation (business logic)
  - API Handler Generation (Gin endpoints)
  - Middleware (if needed)
  - Frontend Components Generation
  - Frontend Services (API calls)
  - Frontend Pages
  - Game Config (game_config.json updates)
  - Database Migration Scripts
  - Docker/Deployment Artifacts
- [ ] Number each step sequentially
- [ ] Include story mapping references
- [ ] Add checkboxes [ ] for each step

## Step 3: Include Unit Generation Context
- [ ] For this unit, include:
  - Game systems implemented by this unit
  - Dependencies on other units/services
  - Expected interfaces and contracts
  - Database entities owned by this unit
  - Service boundaries and responsibilities
  - Game balance parameters from game_config.json

## Step 4: Create Unit Plan Document
- [ ] Save complete plan as `aidlc-docs/construction/plans/{unit-name}-code-generation-plan.md`
- [ ] Include step numbering
- [ ] Include unit context and dependencies
- [ ] Ensure plan is executable step-by-step

## Step 5: Summarize Unit Plan
- [ ] Provide summary of the unit code generation plan to the user
- [ ] Highlight unit generation approach
- [ ] Explain step sequence and game system coverage

## Step 6: Log Approval Prompt
- [ ] Before asking for approval, log the prompt with timestamp in `aidlc-docs/audit.md`

## Step 7: Wait for Explicit Approval
- [ ] Do not proceed until the user explicitly approves the unit code generation plan
- [ ] If user requests changes, update the plan and repeat approval process

## Step 8: Record Approval Response
- [ ] Log the user's approval response with timestamp in `aidlc-docs/audit.md`

## Step 9: Update Progress
- [ ] Mark Code Planning complete in `aidlc-state.md`

---

# PART 2: GENERATION

## Step 10: Load Unit Code Generation Plan
- [ ] Read the complete plan from `aidlc-docs/construction/plans/{unit-name}-code-generation-plan.md`
- [ ] Identify the next uncompleted step (first [ ] checkbox)
- [ ] Load the context for that step

## Step 11: Execute Current Step
- [ ] Verify target directory from plan (never aidlc-docs/)
- [ ] **Brownfield only**: Check if target file exists
- [ ] Generate exactly what the current step describes:
  - **If file exists**: Modify it in-place
  - **If file doesn't exist**: Create new file
- [ ] Write to correct locations:
  - **Backend Code**: ThienDaoGame/ (workspace root)
  - **Frontend Code**: ThienDaoGameFE/ (workspace root)
  - **Documentation**: `aidlc-docs/construction/{unit-name}/code/` (markdown only)
  - **Build/Config Files**: Respective project root
- [ ] Follow unit story requirements
- [ ] Respect dependencies and interfaces

## Step 12: Update Progress
- [ ] Mark the completed step as [x] in the unit code generation plan
- [ ] Update `aidlc-docs/aidlc-state.md` current status
- [ ] Save all generated artifacts

## Step 13: Continue or Complete Generation
- [ ] If more steps remain, return to Step 10
- [ ] If all steps complete, proceed to present completion message

## Step 14: Present Completion Message

```markdown
# 💻 Code Generation Complete - [unit-name]
```

- AI Summary: List created/modified files with paths
- Formatted Workflow Message:

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the generated code at:
> - **Backend**: `ThienDaoGame/[relevant-paths]`
> - **Frontend**: `ThienDaoGameFE/[relevant-paths]`
> - **Documentation**: `aidlc-docs/construction/[unit-name]/code/`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the generated code
> ✅ **Continue to Next Stage** - Approve code generation and proceed to **[next-unit/Build & Test]**

---
```

## Step 15: Wait for Explicit Approval
- Do not proceed until the user explicitly approves

## Step 16: Record Approval and Update Progress
- Log approval in audit.md with timestamp
- Mark Code Generation stage as complete for this unit in aidlc-state.md

---

## Critical Rules

### Code Location Rules
- **Backend code**: ThienDaoGame/ only (NEVER aidlc-docs/)
- **Frontend code**: ThienDaoGameFE/ only (NEVER aidlc-docs/)
- **Documentation**: aidlc-docs/ only (markdown summaries)

### Game-Specific Rules
- **Gacha fairness**: Always use crypto/rand, never math/rand
- **Transactions**: All gacha rolls must be atomic (db.Begin/Commit/Rollback)
- **Game config**: Balance values in game_config.json, not hardcoded
- **Pity system**: Must persist across sessions (stored in DB)
- **Combat**: Deterministic given same seed (for replay)

### Pattern Rules (from Production/ProductionFE)
- **Backend**: Follow Uber Fx module pattern, interface-based services, GORM repositories
- **Frontend**: Component-based, TypeScript strict, TailwindCSS, Axios services
- **Both**: Clean separation of concerns, no business logic in handlers/components

### Automation Friendly Code Rules
- Add `data-testid` attributes to interactive elements
- Use consistent naming: `{component}-{element-role}`
- Keep `data-testid` values stable across code changes

## Completion Criteria
- Complete unit code generation plan created and approved
- All steps in unit code generation plan marked [x]
- All code generated following Production/ProductionFE patterns
- Game systems functional and balanced per game_config.json
- Complete unit ready for build and verification
