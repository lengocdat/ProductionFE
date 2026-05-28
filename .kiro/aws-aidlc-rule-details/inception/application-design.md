# Application Design (Conditional)

**Purpose**: High-level component identification and service layer design.

## Thiên Đạo Game Context
Application design focuses on:
- Service layer interfaces (gacha, combat, character, equipment, afk)
- Repository interfaces (user, character, equipment, battle)
- Component dependencies and DI graph (Uber Fx)
- Frontend component hierarchy and state flow
- Game system interactions (gacha → character → equipment → combat)

**Key Design Decisions (Pre-determined)**:
- Clean Architecture: Handler → Service → Repository
- DI: Uber Fx modules (each package has module.go)
- ORM: GORM with interface-based repositories
- Auth: JWT middleware (same pattern as Production)
- Game Config: Loaded at startup, injectable via Fx
- Frontend State: Zustand or React Context for game state

## Prerequisites
- Requirements Analysis must be complete
- Workflow Planning must be complete

## Execute IF:
- New services or components needed
- Service interfaces need definition
- Component dependencies need clarification
- Game system interactions need mapping

## Skip IF:
- Simple changes within existing boundaries
- No new services or components
- Pure implementation changes

## Execution Steps

### Step 1: Define Service Interfaces
- [ ] Map each game system to a service interface
- [ ] Define method signatures for each service
- [ ] Identify shared dependencies

Example:
```go
type GachaService interface {
    Roll(ctx context.Context, userID uint) (*GachaResult, error)
    GetRates() GachaRates
    GetPityCount(ctx context.Context, userID uint) (int, error)
}

type CombatService interface {
    SimulateBattle(ctx context.Context, teamA, teamB []CharacterStats) (*BattleResult, error)
    CalculateStats(ctx context.Context, charID uint) (*CharacterStats, error)
}
```

### Step 2: Define Repository Interfaces
- [ ] Map each data entity to a repository interface
- [ ] Define CRUD + custom query methods
- [ ] Identify transaction boundaries

### Step 3: Map Component Dependencies
- [ ] Create Uber Fx module dependency graph
- [ ] Identify initialization order
- [ ] Document config requirements per component

### Step 4: Design Frontend Architecture
- [ ] Map pages to components
- [ ] Define state management approach
- [ ] Design API service layer
- [ ] Plan routing structure

### Step 5: Document Game System Interactions
- [ ] Gacha → creates UserCharacter with random traits
- [ ] Equipment → modifies character stats via set bonuses
- [ ] Combat → reads final stats, simulates battle, logs result
- [ ] AFK → generates events based on character traits/equipment
- [ ] Progression → level up, star upgrade, trait reroll

### Step 6: Save Design Document
- [ ] Save to `aidlc-docs/inception/application-design/application-design.md`
- [ ] Include service interfaces
- [ ] Include component dependency diagram
- [ ] Include game system interaction map

### Step 7: Present Completion Message

```markdown
# 🏗️ Application Design Complete

Design artifacts:
• **Services**: [count] service interfaces defined
• **Repositories**: [count] repository interfaces defined
• **Components**: [count] frontend components mapped
• **Game Systems**: [interaction diagram]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the design at: `aidlc-docs/inception/application-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Modify interfaces, add/remove components
> ✅ **Approve & Continue** - Approve design and proceed to **Units Generation**

---
```

### Step 8: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
