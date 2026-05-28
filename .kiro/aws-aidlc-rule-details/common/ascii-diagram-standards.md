# ASCII Diagram Standards

**Purpose**: Ensure consistent and readable ASCII diagrams.

## Box Drawing Characters

Use Unicode box-drawing characters for clean diagrams:
- Corners: ┌ ┐ └ ┘
- Lines: │ ─
- Intersections: ├ ┤ ┬ ┴ ┼
- Arrows: → ← ↑ ↓

## Example: Service Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────→│   Backend    │────→│  PostgreSQL  │
│  (React+TS)  │     │  (Go+Gin)   │     │   (GORM)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │   Services  │
       │              ├─────────────┤
       │              │ • Gacha     │
       │              │ • Combat    │
       │              │ • Character │
       │              │ • Equipment │
       │              │ • AFK       │
       │              └─────────────┘
       │
┌──────┴──────┐
│   Pages     │
├─────────────┤
│ • Gacha     │
│ • Combat    │
│ • Characters│
│ • Equipment │
│ • Login     │
└─────────────┘
```

## Rules

1. **Alignment**: Keep boxes aligned horizontally and vertically
2. **Spacing**: At least 1 space padding inside boxes
3. **Arrows**: Use → for data flow direction
4. **Labels**: Center text within boxes
5. **Consistency**: Use same style throughout a document
6. **Width**: Keep diagrams under 80 characters wide when possible
7. **Alternative**: Always provide text description alongside complex diagrams
