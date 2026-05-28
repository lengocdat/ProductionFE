# Requirements Analysis (Adaptive)

**Assume the role** of a product owner / game designer

**Adaptive Phase**: Always executes. Detail level adapts to problem complexity.

**See [depth-levels.md](../common/depth-levels.md) for adaptive depth explanation**

## Thiên Đạo Game Project Context
The requirements for Thiên Đạo Game MVP are largely pre-defined in `deep-research-report.md`. Key areas to validate:
- Gacha system (rates, pity, mệnh cách/traits)
- Combat engine (auto-battler, ngũ hành, công thức sát thương)
- Character & Equipment systems (models, set bonus)
- AFK rewards (nhật ký tông môn, sự kiện ngẫu nhiên)
- Monetization hooks (7-day roadmap, popup offers)
- Database schema (PostgreSQL + GORM)
- Auth system (JWT, simple registration)
- Frontend components (gacha animation, combat replay, character management)

**MVP Rule**: If a feature does NOT directly help "gacha, chiến đấu, hoặc nạp tiền" — DO NOT BUILD IT.

## Prerequisites
- Workspace Detection must be complete
- Reverse Engineering must be complete (if brownfield)

## Execution Steps

### Step 1: Load Reverse Engineering Context (if available)

**IF brownfield project**:
- Load `aidlc-docs/inception/reverse-engineering/architecture.md`
- Load `aidlc-docs/inception/reverse-engineering/component-inventory.md`
- Load `aidlc-docs/inception/reverse-engineering/technology-stack.md`
- Use these to understand existing system when analyzing request

### Step 2: Analyze User Request (Intent Analysis)

#### 2.1 Request Clarity
- **Clear**: Specific, well-defined, actionable
- **Vague**: General, ambiguous, needs clarification
- **Incomplete**: Missing key information

#### 2.2 Request Type
- **New Feature**: Adding new functionality
- **Bug Fix**: Fixing existing issue
- **Refactoring**: Improving code structure
- **Enhancement**: Improving existing feature
- **New Project**: Starting from scratch

#### 2.3 Initial Scope Estimate
- **Single File**: Changes to one file
- **Single Component**: Changes to one component/package
- **Multiple Components**: Changes across multiple components
- **System-wide**: Changes affecting entire system (BE + FE)

#### 2.4 Initial Complexity Estimate
- **Trivial**: Simple, straightforward change
- **Simple**: Clear implementation path
- **Moderate**: Some complexity, multiple considerations
- **Complex**: Significant complexity, many considerations (full game systems)

### Step 3: Determine Requirements Depth

**Based on request analysis, determine depth:**

**Minimal Depth** - Use when:
- Request is clear and simple
- No detailed requirements needed
- Just document the basic understanding

**Standard Depth** - Use when:
- Request needs clarification
- Functional and non-functional requirements needed
- Normal complexity

**Comprehensive Depth** - Use when:
- Full game system implementation
- Multiple interconnected systems
- High complexity with game balance considerations

### Step 4: Assess Current Requirements

Analyze whatever the user has provided:
   - Intent statements or descriptions (already logged in audit.md)
   - deep-research-report.md (full game design document)
   - Existing requirements documents (search workspace if mentioned)
   - Convert any non-markdown documents to markdown format

### Step 5: Thorough Completeness Analysis

**CRITICAL**: Use comprehensive analysis to evaluate requirements completeness. Default to asking questions when there is ANY ambiguity or missing detail.

**MANDATORY**: Evaluate ALL of these areas and ask questions for ANY that are unclear:
- **Game Systems**: Gacha rates, combat formulas, progression curves, monetization
- **Functional Requirements**: Core features, user interactions, system behaviors
- **Non-Functional Requirements**: Performance (VPS 4GB), security (JWT, crypto/rand), scalability
- **User Scenarios**: Player journeys, edge cases, error scenarios
- **Technical Context**: Integration points, data requirements, system boundaries
- **Game Balance**: Level caps, stat formulas, set bonuses, element advantages

### Step 5.1: Extension Opt-In Prompts

**MANDATORY**: Scan all loaded `*.opt-in.md` files for an `## Opt-In Prompt` section. For each extension that declares one, include that question in the clarifying questions file.

After receiving answers:
1. Record each extension's enablement status in `aidlc-docs/aidlc-state.md` under `## Extension Configuration`
2. **Deferred Rule Loading**: For opted-in extensions, load the full rules file now.

### Step 6: Generate Clarifying Questions (PROACTIVE APPROACH)
   - **ALWAYS** create `aidlc-docs/inception/requirements/requirement-verification-questions.md` unless requirements are exceptionally clear
   - Ask questions about ANY missing, unclear, or ambiguous areas
   - Focus on game systems, technical decisions, and MVP scope
   - Request user to fill in all [Answer]: tags
   - If presenting multiple-choice options:
     - Label options as A, B, C, D etc.
     - Ensure options are mutually exclusive
     - ALWAYS include option for custom response: "X) Other (please describe)"
   - Wait for user answers
   - **MANDATORY**: Analyze ALL answers for ambiguities and create follow-up questions if needed

### ⛔ GATE: Await User Answers
DO NOT proceed to Step 7 until all questions are answered and validated.
Present the question file to the user and STOP.

### Step 7: Generate Requirements Document
   - **PREREQUISITE**: Step 6 gate must be passed
   - Create `aidlc-docs/inception/requirements/requirements.md`
   - Include intent analysis summary at the top
   - Include both functional and non-functional requirements
   - Incorporate user's answers to clarifying questions
   - Reference deep-research-report.md for game design details

### Step 8: Update State Tracking

Update `aidlc-docs/aidlc-state.md`:

```markdown
## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (if applicable)
- [x] Requirements Analysis
```

### Step 9: Log and Proceed
   - Log approval prompt with timestamp in `aidlc-docs/audit.md`
   - Present completion message:

```markdown
# 🔍 Requirements Analysis Complete
```

   - AI Summary of requirements (bullet points)
   - Formatted Workflow Message:

```markdown
> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the requirements document at: `aidlc-docs/inception/requirements/requirements.md`



> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the requirements
> [IF User Stories will be skipped:]
> 📝 **Add User Stories** - Choose to Include **User Stories** stage
> ✅ **Approve & Continue** - Approve requirements and proceed to **[User Stories/Workflow Planning]**

---
```

   - Wait for explicit user approval before proceeding
   - Record approval response with timestamp
   - Update Requirements Analysis stage complete in aidlc-state.md
