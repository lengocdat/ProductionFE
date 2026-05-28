# Units Generation (Conditional)

**Purpose**: Decompose the system into multiple units of work for structured implementation.

## Thiên Đạo Game Context
The game has multiple interconnected systems that benefit from structured decomposition:

**Recommended Units** (can be adjusted by user):

| Unit | Scope | Dependencies |
|------|-------|-------------|
| Foundation | Project setup, config, DB, auth | None |
| Gacha | Character dict, gacha logic, pity, traits | Foundation |
| Equipment | Equipment dict, equip/unequip, set bonus | Foundation |
| Combat | Stats calc, auto-battler, ngũ hành, log | Foundation, Gacha, Equipment |
| AFK & Progression | AFK rewards, leveling, star upgrades | Foundation, Gacha |
| Social | PvP leaderboard, world boss | Foundation, Combat |
| Frontend Core | Layout, auth, navigation, common components | Foundation (API) |
| Frontend Game | Gacha UI, combat replay, character/equipment UI | Frontend Core, all BE units |

## Prerequisites
- Application Design must be complete (if executed)
- Workflow Planning must be complete

## Execute IF:
- System needs decomposition into multiple units
- Multiple services or modules required
- Complex system requiring structured breakdown

## Skip IF:
- Single simple unit
- No decomposition needed
- Straightforward single-component implementation

## Execution Steps

### Step 1: Analyze System Complexity
- [ ] Count distinct game systems
- [ ] Identify natural boundaries
- [ ] Map dependencies between systems
- [ ] Determine if BE and FE should be separate units

### Step 2: Define Units
- [ ] For each unit, define:
  - Name and description
  - Scope (which game systems/features)
  - Database entities owned
  - Service interfaces provided
  - Dependencies on other units
  - Estimated complexity (S/M/L)

### Step 3: Create Dependency Graph
- [ ] Map unit dependencies
- [ ] Identify execution order
- [ ] Find parallelization opportunities
- [ ] Validate no circular dependencies

### Step 4: Assign Stories to Units
- [ ] Map user stories (if created) to units
- [ ] Ensure complete coverage
- [ ] Identify cross-unit stories

### Step 5: Save Units Document
- [ ] Save to `aidlc-docs/inception/units/units-generation.md`
- [ ] Include unit definitions
- [ ] Include dependency graph (Mermaid)
- [ ] Include story assignments

### Step 6: Present Completion Message

```markdown
# 🧩 Units Generation Complete

Units defined:
• **Total Units**: [count]
• **Execution Order**: [ordered list]
• **Dependencies**: [brief dependency summary]

[Mermaid dependency diagram]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the units at: `aidlc-docs/inception/units/units-generation.md`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Modify units, merge/split, change order
> ✅ **Approve & Continue** - Approve units and proceed to **Construction Phase**

---
```

### Step 7: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
