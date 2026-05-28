---
inclusion: auto
---

# Thiên Đạo Game - Gacha Tu Tiên Project Context

## Product Overview
Thiên Đạo Game là game Gacha Tu Tiên idle/auto-battler cho web. Người chơi đóng vai Tông Chủ tông phái Thiên Cơ, sử dụng Thiên Cơ Bàn (hệ thống Gacha) để triệu hồi đệ tử, xây dựng đội hình, chiến đấu tự động, và khôi phục vinh quang tông phái.

## Core Problem
Solo dev cần xây dựng game gacha hoàn chỉnh với monetization, hệ thống chiến đấu auto-battler, và AFK rewards — tất cả chạy trên VPS 4GB RAM.

## MVP Scope - STRICT RULES

### MVP DOES:
- Hệ thống đăng ký/đăng nhập (JWT)
- Gacha system với Pity counter (2% UR, 18% SSR, 80% SR)
- Mệnh Cách (Traits) ngẫu nhiên cho nhân vật
- Hệ thống Ngũ Hành (Kim, Mộc, Thủy, Hỏa, Thổ)
- Auto-battler combat engine
- Trang bị & Set bonus
- AFK rewards (Nhật Ký Tông Môn)
- Lộ trình 7 ngày đầu (onboarding + monetization hooks)
- PvP Leaderboard cơ bản
- Boss Thế Giới (World Boss)

### MVP DOES NOT:
- Real-time multiplayer
- Chat system
- Guild/clan phức tạp
- Payment gateway thật (mock trước)
- Mobile native app (web-first)
- Advanced anti-cheat

### CRITICAL RULE:
Nếu feature KHÔNG trực tiếp giúp "người chơi gacha, chiến đấu, hoặc nạp tiền" — KHÔNG BUILD.

## Architecture

### Backend API (Go) — Tương tự Production
- Framework: Gin + Uber Fx (DI)
- Pattern: Clean Architecture (handler → service → repository)
- Config: Viper + .env
- ORM: GORM (PostgreSQL)
- Auth: JWT (golang-jwt/jwt/v5)
- Logging: log/slog + gin-contrib/slog

### Frontend (React + Vite + TypeScript + TailwindCSS) — Tương tự ProductionFE
- Framework: React 18 + Vite
- Styling: TailwindCSS
- State: Zustand hoặc React Context
- HTTP: Axios
- Routing: React Router v6
- Animation: CSS Keyframes + Framer Motion (gacha effects)

### Database
- PostgreSQL 15 (GORM AutoMigrate + manual migrations)
- Tables: users, character_dicts, user_characters, equipment_dicts, user_equipments, battle_logs, afk_events

### Deploy
- Docker Compose (VPS 4GB RAM)
- Nginx reverse proxy
- PostgreSQL container (1.5GB RAM limit, shared_buffers=512MB)
- Multi-stage Docker builds

## Tech Stack Decisions
- Go backend với patterns từ Production (Uber Fx, Gin, clean architecture)
- PostgreSQL + GORM cho persistent data
- Docker Compose cho deployment
- React + Vite + TailwindCSS cho frontend
- JWT cho authentication
- crypto/rand cho gacha randomness (công bằng)

## Project Structure (Go Backend — giống Production)
```
ThienDaoGame/                      # Backend
├── cmd/main.go                    # Entry point with Uber Fx
├── config/config.go               # Viper config
├── api/v1/
│   ├── router.go                  # Route registration
│   ├── module.go                  # Fx module
│   ├── auth.go                    # Login/Register endpoints
│   ├── gacha.go                   # Gacha roll endpoints
│   ├── character.go               # Character management
│   ├── combat.go                  # Battle endpoints
│   ├── equipment.go               # Equipment endpoints
│   └── health_check.go
├── internal/
│   ├── middleware/
│   │   ├── auth.go                # JWT middleware
│   │   └── ratelimit.go
│   ├── dto/
│   │   ├── request/
│   │   └── response/
│   ├── model/
│   │   ├── user.go
│   │   ├── character_dict.go
│   │   ├── user_character.go
│   │   ├── equipment_dict.go
│   │   ├── user_equipment.go
│   │   ├── battle_log.go
│   │   └── afk_event.go
│   ├── service/
│   │   ├── module.go
│   │   ├── auth.go
│   │   ├── gacha.go
│   │   ├── combat.go
│   │   ├── character.go
│   │   ├── equipment.go
│   │   └── afk.go
│   └── repository/
│       ├── module.go
│       ├── user.go
│       ├── character.go
│       ├── equipment.go
│       └── battle.go
├── pkg/
│   ├── postgres/
│   └── gameconfig/                # Game balance config loader
├── httpserver/
├── migrations/
├── game_config.json               # Game balance data
├── Makefile
├── go.mod
├── .env
└── .env.example
```

## Project Structure (React Frontend — giống ProductionFE)
```
ThienDaoGameFE/                    # Frontend
├── src/
│   ├── components/
│   │   ├── gacha/                 # GachaScreen, GachaAnimation
│   │   ├── combat/               # CombatReplay, BattleLog
│   │   ├── character/            # CharacterCard, CharacterList
│   │   ├── equipment/            # EquipmentSlot, SetBonus
│   │   └── common/              # Layout, Navbar, Loading
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Gacha.tsx
│   │   ├── Combat.tsx
│   │   ├── Characters.tsx
│   │   ├── Equipment.tsx
│   │   └── Login.tsx
│   ├── hooks/
│   ├── services/                  # API calls (axios)
│   ├── store/                     # State management
│   ├── types/                     # TypeScript interfaces
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── Dockerfile
```

## Game Config Reference
```json
{
  "level_cap": 100,
  "exp_per_level": 1000,
  "gacha_cost": 300,
  "pity_threshold": 80,
  "rates": { "UR": 2, "SSR": 18, "SR": 80 },
  "elements": ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"],
  "element_advantage_multiplier": 1.5,
  "combat_formula": "(ATK^2)/(ATK+DEF)",
  "set_bonus_threshold": 2
}
```

## Key Patterns to Follow (from Production)
- Uber Fx modules for DI (each package has module.go with fx.Module)
- Interface-based design (service interfaces, repository interfaces)
- Constructor functions return interfaces
- Gin handlers as exported structs with pointer receivers
- Viper for config loading from .env
- Structured logging with slog
- GORM for database operations
- JWT middleware pattern from Production

## Database Schema (Core Tables)
- **users**: id, username, password_hash, tien_ngoc, linh_thach, pity_counter
- **character_dicts**: id, name, rarity, base_hp, base_atk, base_def, base_speed, element
- **user_characters**: id, user_id, character_dict_id, level, star_level, exp, traits (JSON)
- **equipment_dicts**: id, name, set_name, slot, stat_boosts (JSON)
- **user_equipments**: id, user_id, equipment_dict_id, equipped_to_character_id
- **battle_logs**: id, user_id, opponent_type, result, log (JSON), created_at
- **afk_events**: id, user_id, character_id, event_type, description, rewards (JSON), created_at

## Success Metrics
- Người chơi quay gacha hàng ngày
- Retention rate 7 ngày
- Conversion rate (free → paid)
- Thời gian session trung bình

## DO NOT Optimize For
- Beautiful architecture quá mức
- Microservices (monolith đủ cho MVP)
- Advanced caching (premature optimization)
- Perfect game balance (iterate sau)
