# Build and Test (Always Execute)

**Purpose**: Generate comprehensive build and test instructions after all units are complete.

## Thiên Đạo Game Build & Test Context

### Backend Build:
```bash
cd ThienDaoGame
go mod tidy
go build -o thien-dao-game ./cmd/main.go
```

### Frontend Build:
```bash
cd ThienDaoGameFE
npm install
npm run build
```

### Docker Build:
```bash
docker-compose -f deployment/docker-compose.yaml up -d --build
```

### Test Categories:

**Unit Tests (Backend)**:
- Gacha service: rate distribution, pity mechanics, trait generation
- Combat service: damage formula, crit calculation, element advantage
- Character service: stat calculation, set bonus application
- Repository: CRUD operations with test DB

**Unit Tests (Frontend)**:
- Component rendering tests
- State management tests
- API service mock tests

**Integration Tests**:
- Gacha flow: roll → character created → pity updated
- Combat flow: select team → simulate → log saved
- Equipment flow: equip → stats recalculated
- Auth flow: register → login → protected endpoint

**Game Balance Tests**:
- Gacha rate verification (1000+ rolls statistical test)
- Combat formula edge cases (0 DEF, max stats)
- Set bonus stacking rules
- Pity counter persistence

## Execution Steps

### Step 1: Generate Build Instructions
- [ ] Create `aidlc-docs/construction/build-and-test/build-instructions.md`
- [ ] Backend build steps (Go)
- [ ] Frontend build steps (Vite)
- [ ] Docker build steps
- [ ] Environment setup (.env configuration)

### Step 2: Generate Unit Test Instructions
- [ ] Create `aidlc-docs/construction/build-and-test/unit-test-instructions.md`
- [ ] Backend test commands and coverage targets
- [ ] Frontend test commands
- [ ] Game-specific test scenarios (gacha rates, combat formulas)

### Step 3: Generate Integration Test Instructions
- [ ] Create `aidlc-docs/construction/build-and-test/integration-test-instructions.md`
- [ ] API endpoint tests (auth, gacha, combat, equipment)
- [ ] Database integration tests
- [ ] Full flow tests (player journey)

### Step 4: Generate Game Balance Test Instructions
- [ ] Create `aidlc-docs/construction/build-and-test/game-balance-tests.md`
- [ ] Statistical gacha rate verification
- [ ] Combat formula validation
- [ ] Progression curve testing
- [ ] Economy balance (Tiên Ngọc income vs spending)

### Step 5: Create Summary
- [ ] Create `aidlc-docs/construction/build-and-test/build-and-test-summary.md`
- [ ] Overview of all test categories
- [ ] Prerequisites and setup
- [ ] CI/CD recommendations (future)

### Step 6: Present Completion Message

```markdown
# 🧪 Build and Test Instructions Complete

Instructions generated:
• **Build**: Backend (Go), Frontend (Vite), Docker
• **Unit Tests**: [count] test scenarios
• **Integration Tests**: [count] flow tests
• **Game Balance**: [count] balance verification tests

> **📋 <u>**REVIEW REQUIRED:**</u>**
> Please examine at: `aidlc-docs/construction/build-and-test/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> Build and test instructions complete. Ready to proceed to **Operations** stage (placeholder)?
>
> Or would you like to:
> 🔧 **Request Changes** - Modify test instructions
> 🏃 **Start Building** - Begin executing the build and test plan

---
```

### Step 7: Wait for Explicit Approval
- DO NOT PROCEED until user confirms
- Log user's response in audit.md
