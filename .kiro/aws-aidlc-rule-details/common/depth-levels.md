# Depth Levels Guide

**Purpose**: Define how deep each phase should go based on complexity.

## Three Depth Levels

### Minimal Depth
**When to use**: Simple, clear requests with obvious implementation path.

**Characteristics**:
- Brief documentation
- Skip optional sub-steps
- Focus on essentials only
- Quick turnaround

**Examples for Thiên Đạo Game**:
- Adding a new field to an existing model
- Fixing a bug in gacha calculation
- Updating game_config.json values
- Simple UI text changes

### Standard Depth
**When to use**: Normal complexity, some decisions needed.

**Characteristics**:
- Full documentation of decisions
- All required sub-steps executed
- Clarifying questions when needed
- Balanced thoroughness

**Examples for Thiên Đạo Game**:
- Adding a new equipment set
- Implementing a new AFK event type
- Adding a new API endpoint
- Creating a new frontend page

### Comprehensive Depth
**When to use**: Complex systems, high risk, many interconnections.

**Characteristics**:
- Detailed documentation with diagrams
- All sub-steps including optional ones
- Multiple rounds of clarifying questions
- Thorough edge case analysis
- Game balance considerations

**Examples for Thiên Đạo Game**:
- Full gacha system implementation
- Combat engine from scratch
- Complete auth system
- Full frontend application setup
- Docker deployment configuration

## Depth Selection Criteria

| Factor | Minimal | Standard | Comprehensive |
|--------|---------|----------|---------------|
| Files affected | 1-2 | 3-10 | 10+ |
| New business logic | None | Some | Significant |
| Game balance impact | None | Low | High |
| Risk level | Low | Medium | High |
| Dependencies | None | Few | Many |
| User clarity | Very clear | Mostly clear | Needs discussion |
