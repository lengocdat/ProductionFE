# Workflow Changes Log

**Purpose**: Track changes made to the AI-DLC workflow configuration.

## Change History

### 2026-05-25: Project Migration from ShortAI to Thiên Đạo Game
- **What changed**: Complete rewrite of all steering and rule-details files
- **Why**: New project (Gacha Tu Tiên game) replacing ShortAI
- **Impact**: All files updated with game-specific context
- **Reference**: deep-research-report.md for full game design

### Key Differences from Previous Configuration:
| Aspect | ShortAI (Old) | Thiên Đạo Game (New) |
|--------|---------------|---------------------|
| Type | Video processing SaaS | Gacha game |
| Backend | Go + FFmpeg + Asynq | Go + GORM + game logic |
| Frontend | N/A (API only) | React + Vite + TailwindCSS |
| Database | Jobs, clips, transcripts | Users, characters, equipment, battles |
| Queue | Redis + Asynq | None (direct processing) |
| Storage | Temp files, cleanup | Persistent game data |
| Deploy | VPS 20GB | VPS 4GB RAM |

### Files Modified:
- `.kiro/steering/shortai-project.md` → Thiên Đạo Game context
- `.kiro/steering/aws-aidlc-rules/core-workflow.md` → Updated project header
- `.kiro/aws-aidlc-rule-details/common/*` → All updated
- `.kiro/aws-aidlc-rule-details/inception/*` → All updated
- `.kiro/aws-aidlc-rule-details/construction/*` → All updated
