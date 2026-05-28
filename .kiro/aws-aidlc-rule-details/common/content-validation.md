# Content Validation Rules

**Purpose**: Ensure all generated content is valid and parseable.

## Validation Checklist

Before creating ANY file, validate:

### 1. Mermaid Diagrams
- [ ] Valid Mermaid syntax (flowchart, sequence, etc.)
- [ ] No unescaped special characters in labels
- [ ] Proper node/edge definitions
- [ ] Test rendering mentally before writing

### 2. ASCII Art Diagrams
- [ ] Consistent box characters (┌ ┐ └ ┘ │ ─)
- [ ] Proper alignment
- [ ] Text alternatives provided
- [ ] See `ascii-diagram-standards.md` for details

### 3. JSON Content
- [ ] Valid JSON syntax
- [ ] Proper escaping of special characters
- [ ] No trailing commas
- [ ] Consistent formatting

### 4. Code Blocks
- [ ] Correct language identifier (go, tsx, json, yaml, bash)
- [ ] Proper indentation
- [ ] No unclosed brackets/braces
- [ ] Valid syntax for the language

### 5. Markdown
- [ ] Proper heading hierarchy (no skipping levels)
- [ ] Valid link syntax
- [ ] Proper list formatting
- [ ] No broken table formatting

## Game-Specific Validation

### game_config.json
- [ ] All numeric values are valid numbers
- [ ] Gacha rates sum to 100%
- [ ] Element list is complete (5 elements)
- [ ] No negative values for stats

### Go Code
- [ ] Valid Go syntax
- [ ] Proper import paths
- [ ] Interface implementations complete
- [ ] Error handling present

### TypeScript/React Code
- [ ] Valid TypeScript syntax
- [ ] Proper type annotations
- [ ] JSX properly closed
- [ ] Imports resolve correctly
