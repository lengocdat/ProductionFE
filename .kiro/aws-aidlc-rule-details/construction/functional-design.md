# Functional Design (Conditional, Per-Unit)

**Purpose**: Detailed business logic design for game systems within a unit.

## Thiên Đạo Game Context
Functional design is critical for game systems that have complex business rules:

**Gacha System**:
- Rates: 2% UR, 18% SSR, 80% SR
- Pity: Guaranteed SSR/UR at 80 rolls (2% UR within pity)
- Cost: 300 Tiên Ngọc per roll
- Traits: 2-3 random Mệnh Cách per character (Red=good, Gray=bad)
- Trait reroll: Tẩy Tủy Đan (costs Tiên Ngọc)

**Combat Engine**:
- Formula: damage = (ATK²) / (ATK + DEF)
- Crit: CritRate chance for 2x damage
- LifeSteal: heal = damage × LifeSteal%
- Ngũ Hành advantage: 1.5x damage multiplier
- Set bonus: 2+ pieces of same set = bonus stats
- Turn order: by Speed stat

**Progression**:
- Level cap: 100
- EXP per level: 1000
- Star upgrade thresholds: [50, 100, 150]
- Đột phá: 40% failure rate (reduces stats temporarily)

**AFK System**:
- Events generated based on character traits
- Random rewards (equipment, resources, skill books)
- Negative events possible (resource loss)
- Event frequency: every 1-2 hours of AFK time

## Execute IF:
- New game system with complex business rules
- Combat formulas need specification
- Gacha rates and mechanics need detailed design
- Progression curves need definition

## Skip IF:
- Simple CRUD operations
- No complex business logic
- Pure UI changes

## Execution Steps

### Step 1: Identify Business Rules
- [ ] List all business rules for this unit's game systems
- [ ] Define input/output for each rule
- [ ] Identify edge cases and error conditions
- [ ] Reference game_config.json parameters

### Step 2: Design Data Flow
- [ ] Map data flow through the system
- [ ] Identify transaction boundaries
- [ ] Define validation rules
- [ ] Document error handling

### Step 3: Define Algorithms
- [ ] Specify algorithms (gacha roll, combat simulation, stat calculation)
- [ ] Include pseudocode or flowcharts
- [ ] Define randomness requirements (crypto/rand vs math/rand)
- [ ] Document game balance parameters

### Step 4: Create Functional Design Document
- [ ] Save to `aidlc-docs/construction/{unit-name}/functional-design/functional-design.md`
- [ ] Include business rules table
- [ ] Include data flow diagrams
- [ ] Include algorithm specifications
- [ ] Include edge cases and error handling

### Step 5: Present Completion Message

```markdown
# 📐 Functional Design Complete - [unit-name]

Design covers:
• **Business Rules**: [count] rules defined
• **Algorithms**: [list key algorithms]
• **Edge Cases**: [count] edge cases documented

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the design at: `aidlc-docs/construction/[unit-name]/functional-design/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications
> ✅ **Continue to Next Stage** - Approve and proceed

---
```

### Step 6: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
