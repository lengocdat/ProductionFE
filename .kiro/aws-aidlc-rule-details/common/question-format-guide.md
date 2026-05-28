# Question Format Guide

**Purpose**: Standardize how questions are asked and answered during the workflow.

## Question Format

When asking questions at any phase:

### Multiple Choice Format
```markdown
**Q1: [Question text]**

A) Option A description
B) Option B description
C) Option C description
D) Option D description
X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

### Rules:
1. Label options as A, B, C, D, E (max 5 standard options)
2. Always include X) Other option for custom responses
3. Options must be mutually exclusive
4. Options should not overlap
5. Keep option descriptions concise but clear

### Answer Validation:
- Valid answers: Single letter (A, B, C, D, E, X)
- If X is chosen, user must provide description
- If answer is ambiguous, ask follow-up question
- If answer contradicts previous answers, flag the contradiction

### Follow-up Questions:
- If any answer is unclear, create follow-up questions
- Keep asking until ALL ambiguities are resolved
- OR until user explicitly asks to proceed

## Thiên Đạo Game Common Questions

### Game Balance Questions:
- Gacha rates (standard vs generous vs stingy)
- Combat difficulty (easy vs balanced vs hard)
- Progression speed (fast vs medium vs slow)
- Monetization aggressiveness (light vs medium vs heavy)

### Technical Questions:
- State management (Zustand vs Context vs Redux)
- Database approach (GORM AutoMigrate vs manual migrations)
- Auth complexity (simple JWT vs refresh tokens)
- Deployment (single Docker vs Docker Compose)
