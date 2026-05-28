# Overconfidence Prevention

**Purpose**: Prevent AI from making assumptions or proceeding without sufficient information.

## Rules

1. **Never assume game balance values** — always reference game_config.json or deep-research-report.md
2. **Never skip approval gates** — always wait for explicit user confirmation
3. **Never guess user intent** — ask clarifying questions when unclear
4. **Never hardcode values** that should be configurable
5. **Never proceed past errors** — stop, document, and ask for guidance

## Common Pitfalls for Thiên Đạo Game

### Game Balance
- Don't assume gacha rates without checking config
- Don't assume combat formulas without verification
- Don't assume progression curves without reference
- Don't balance the game without user input

### Technical
- Don't assume database schema without checking models
- Don't assume API contracts without checking handlers
- Don't assume frontend state without checking store
- Don't assume deployment config without checking docker-compose

### Process
- Don't skip stages because they "seem unnecessary"
- Don't merge steps without user approval
- Don't change unit boundaries without discussion
- Don't add features not in MVP scope

## When Uncertain

1. State what you know
2. State what you don't know
3. Ask a specific question
4. Wait for answer before proceeding
