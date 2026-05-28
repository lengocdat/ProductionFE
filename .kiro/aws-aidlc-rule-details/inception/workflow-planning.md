# Workflow Planning (Always Execute)

**Purpose**: Create execution plan showing which stages to run and in what order.

## Thiên Đạo Game Context
The workflow plan determines how to break down the game implementation into manageable units. Given the game's complexity, typical units might be:

**Suggested Unit Breakdown**:
1. **Unit: Foundation** — Project setup, config, DB connection, auth (JWT)
2. **Unit: Gacha System** — Character dictionary, gacha logic, pity, traits
3. **Unit: Equipment System** — Equipment dictionary, equip/unequip, set bonuses
4. **Unit: Combat Engine** — Stats calculation, auto-battler, ngũ hành, battle log
5. **Unit: AFK & Progression** — AFK rewards, leveling, star upgrades
6. **Unit: Social** — PvP leaderboard, world boss (stretch)
7. **Unit: Frontend Core** — Layout, auth pages, navigation
8. **Unit: Frontend Game** — Gacha animation, combat replay, character/equipment UI

**Note**: Units can be merged or split based on user preference and scope.

## Prerequisites
- Requirements Analysis must be complete
- User Stories must be complete (if executed)

## Execution Steps

### Step 1: Load All Prior Context
- [ ] Load reverse engineering artifacts (if brownfield)
- [ ] Load requirements document
- [ ] Load user stories (if executed)
- [ ] Load deep-research-report.md for game design reference

### Step 2: Determine Construction Stages Per Unit
- [ ] For each proposed unit, determine:
  - Functional Design needed? (new business logic)
  - NFR Requirements needed? (performance, security)
  - NFR Design needed? (patterns to apply)
  - Infrastructure Design needed? (Docker, deployment)
  - Code Generation (always)

### Step 3: Create Execution Plan
- [ ] List all units in execution order
- [ ] For each unit, list stages to execute
- [ ] Estimate complexity per unit
- [ ] Identify dependencies between units

### Step 4: Generate Workflow Visualization
- [ ] Create Mermaid diagram showing unit flow
- [ ] Validate Mermaid syntax before writing
- [ ] Show dependencies and parallel opportunities

### Step 5: Create Workflow Plan Document
- [ ] Save to `aidlc-docs/inception/plans/workflow-plan.md`
- [ ] Include unit breakdown with stages
- [ ] Include dependency graph
- [ ] Include estimated effort per unit

### Step 6: Validate Content
- [ ] Validate all Mermaid diagrams
- [ ] Validate ASCII art (if any)
- [ ] Check content parsing compatibility

### Step 7: Present Recommendations

```markdown
# 📋 Workflow Planning Complete

Execution plan:
• **Units**: [count] units of work identified
• **Order**: [brief execution order]
• **Stages per unit**: [summary of which stages apply]

[Mermaid diagram or ASCII visualization]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the workflow plan at: `aidlc-docs/inception/plans/workflow-plan.md`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Modify unit breakdown, add/remove stages, change order
> ➕ **Add/Remove Units** - Adjust the scope of work
> ✅ **Approve & Continue** - Approve plan and proceed to **Construction Phase**

---
```

**Emphasize user control**: User can override any recommendation (add stages, remove stages, merge units, split units, change order).

### Step 8: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md

### Step 9: Update State
- [ ] Update aidlc-state.md with approved workflow plan
- [ ] Mark Workflow Planning as complete
- [ ] Set next stage to first unit's first stage
