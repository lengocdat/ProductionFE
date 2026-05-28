# User Stories (Conditional)

**Purpose**: Create user stories and personas for game features that affect player experience.

## Thiên Đạo Game Context
User stories focus on player journeys through the game systems:
- Gacha experience (rolling, pity, excitement)
- Combat experience (auto-battle, strategy, ngũ hành)
- Progression (leveling, equipment, set bonuses)
- AFK rewards (returning to see what happened)
- Monetization (spending decisions, value perception)

**Personas**:
- **Cá Voi (Whale)**: Nạp nhiều, muốn UR ngay, top leaderboard
- **Cá Mập Nhỏ (Dolphin)**: Nạp vừa phải, mua gói ưu đãi
- **F2P Player**: Không nạp, tích lũy pity, tối ưu tài nguyên
- **Casual Player**: Chơi AFK chính, check nhật ký tông môn

## Prerequisites
- Requirements Analysis must be complete

## Intelligent Assessment

**ALWAYS Execute IF**:
- New game system being built (gacha, combat, equipment)
- Player-facing features or UI changes
- Monetization flow changes
- Multiple player personas affected

**SKIP IF**:
- Pure backend refactoring
- Infrastructure changes only
- Bug fixes with clear scope
- Developer tooling

## Part 1: Planning

### Step 1: Intelligent Assessment
- [ ] Analyze request against assessment criteria
- [ ] Determine if user stories add value
- [ ] If skipping, document reason and proceed to next stage

### Step 2: Create Story Plan
- [ ] Identify affected player personas
- [ ] Map game systems involved
- [ ] Draft story categories (gacha, combat, progression, monetization)
- [ ] Create questions about player experience expectations

### Step 3: Collect Answers
- [ ] Present questions to user
- [ ] Wait for answers
- [ ] Analyze for ambiguities

### Step 4: Get Plan Approval
- [ ] Present story plan summary
- [ ] Wait for user approval

## Part 2: Generation

### Step 5: Generate User Stories
- [ ] Create stories per persona per game system
- [ ] Format: "As a [persona], I want to [action], so that [benefit]"
- [ ] Include acceptance criteria
- [ ] Include game-specific details (rates, formulas, animations)

### Step 6: Save Stories Document
- [ ] Save to `aidlc-docs/inception/user-stories/user-stories.md`
- [ ] Include persona definitions
- [ ] Include story map (which stories belong to which game system)

### Step 7: Present Completion Message

```markdown
# 📖 User Stories Complete

Stories generated:
• **Personas**: [count] player types defined
• **Stories**: [count] user stories across [count] game systems
• **Coverage**: [list game systems covered]

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine the user stories at: `aidlc-docs/inception/user-stories/user-stories.md`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications
> ✅ **Approve & Continue** - Approve and proceed to **Workflow Planning**

---
```

### Step 8: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
