# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**ConvoLens** is an AI-powered conversation analysis platform that transforms messaging exports into insights. Users upload chat exports from WhatsApp (and soon Telegram, Discord, etc.) to visualize communication patterns and generate AI-driven summaries. (Previously known as **WhatsSummarize**.)

## Development Commands

### Prerequisites
- Node.js 18+
- pnpm 8+ (`npm i -g pnpm`)
- Docker (optional, for DB)

### Setup
```bash
pnpm install
```

### Environment Configuration
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

### Running Development Servers
```bash
pnpm dev              # Start all apps in dev mode (Turbo)
pnpm build            # Build all apps
pnpm start            # Start production servers
pnpm lint             # Run ESLint across all workspaces
pnpm test             # Run tests (Jest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage reports
pnpm test:ui          # Playwright tests (Coming Soon)
```

### Useful Scripts
```bash
pnpm generate:test-data    # Generate test data
pnpm organize:tests        # Organize test files
pnpm clean                 # Clean build artifacts
```

## Architecture

### Monorepo Structure (pnpm + Turbo)

This is a **Turborepo monorepo** with multiple apps and shared packages:

```
convolens/
├── apps/
│   ├── web/              # Next.js 15 frontend (App Router)
│   ├── api/              # Express.js + TypeORM backend
│   ├── backend/          # Additional backend services
│   ├── frontend/         # Additional frontend
│   └── chrome-extension/ # Chrome extension for direct WhatsApp extraction
├── packages/
│   ├── ui/               # Shared UI components (Shadcn/UI based)
│   ├── config/           # Shared configs (ESLint, TypeScript, etc.)
│   ├── contexts/         # React contexts
│   ├── monitoring/       # Observability utilities
│   ├── shared/           # Shared types and utilities
│   └── utils/            # Common utilities
├── docs/                 # Comprehensive documentation
├── infra/                # Infrastructure as code (Azure)
├── tests/                # Cross-workspace tests
└── tools/                # Development tools and scripts
```

### Key Technologies
- **Frontend**: Next.js 15.4, Tailwind CSS + Shadcn/UI, Supabase Auth (SSR)
- **Backend**: Node.js 18+, Express, TypeORM
- **Database**: SQLite (dev), PostgreSQL (prod/Supabase)
- **Monorepo**: pnpm workspaces + Turbo
- **Testing**: Jest, Playwright
- **Deployment**: Azure (via GitHub Actions with OIDC)

### Important Architectural Points

#### Chat Export Parsing
**Location**: `apps/api/src/services/chat-export.service.ts`

The `parseWhatsAppExport()` function is the core conversion utility:
- Parses WhatsApp `.txt` export format
- Uses regex patterns to extract: timestamps, senders, messages, media indicators
- Handles both standard and system message formats
- Returns structured `ChatExportData` with participants, messages, and metadata

**Pattern**: `[DD/MM/YYYY, HH:MM:SS] Sender: Message`

#### Chrome Extension Integration
**Location**: `apps/api/src/routes/chat-export.routes.ts`

The `/api/chat-export/extension` endpoint receives structured chat data directly extracted from WhatsApp Web by the Chrome extension, bypassing the need for manual exports.

#### Future Platform Support
The architecture is designed to support multiple messaging platforms:
- WhatsApp (currently implemented)
- Telegram (planned)
- Discord (planned)
- Slack (planned)

**When adding new platform parsers**:
1. Create parser in `apps/api/src/services/` (e.g., `telegram-export.service.ts`)
2. Follow the same interface as `parseWhatsAppExport()`
3. Return `ChatExportData` structure
4. Add validation function like `isValidTelegramExport()`

#### Brand Identity (ConvoLens)
**Current State**: ConvoLens (renamed from "WhatsSummarize")
- **Colors**: Deep Purple (#6B46C1) + Bright Cyan (#06B6D4) + Soft Lavender (#C4B5FD)
- **Tagline**: "See Your Conversations Clearly"
- **Design System**: Migrating from Ant Design to pure Tailwind + Shadcn/UI
- **WhatsApp Colors**: Preserved only for WhatsApp-specific features (use green #25D366 sparingly)

See [NAMING_RECOMMENDATIONS.md](NAMING_RECOMMENDATIONS.md) and [docs/BRAND_COLOR_GUIDELINES.md](docs/BRAND_COLOR_GUIDELINES.md) for complete brand guidelines.

## Important Notes

### Monorepo Workflow
- **Do NOT** run `npm install` - always use `pnpm install`
- Changes in `packages/*` affect all apps that depend on them
- Turbo caches build outputs - use `pnpm clean` if you suspect cache issues
- Use `pnpm --filter <workspace>` to run commands in specific workspaces

### Testing Strategy
- Unit tests alongside source files: `__tests__/` directories
- Integration tests in `tests/` at workspace root
- E2E tests with Playwright (in progress)
- Run tests before committing (enforced by Husky)

### Documentation
Comprehensive docs in `docs/` directory:
- [docs/README.md](docs/README.md) - Documentation index
- [docs/architecture.md](docs/architecture.md) - System architecture
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Development roadmap
- [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) - Known issues

### When Working with Chat Parsers

**DO NOT migrate chat parser code to xtox** - These parsers are specific to ConvoLens's business logic:
- They extract participants and conversation metadata
- They're tightly coupled to the ConvoLens data model
- They're designed for messaging platforms, not generic document conversion
- xtox is for "x to x" document conversions (PDF→text, LaTeX→PDF, etc.)

The parsers here transform chat exports into application-specific structured data for analysis and summarization, which is different from xtox's generic document conversion purpose.

### Authentication
Currently in transition:
- **Old**: Custom JWT auth in `apps/api`
- **New**: Migrating to Supabase Auth (SSR)
- See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for details

### Linting & Formatting
- ESLint configured at root and per-workspace
- Prettier for formatting
- lint-staged runs on commit via Husky
- Use `pnpm lint` to check all workspaces

### Azure Deployment
- Infrastructure defined in `infra/`
- GitHub Actions with OIDC authentication
- See [docs/AZURE_SETUP.md](docs/AZURE_SETUP.md) for deployment setup
- See [infra/README.md](infra/README.md) for infrastructure details

## Common Tasks

### Adding a New Shared Package
1. Create in `packages/<package-name>/`
2. Add `package.json` with workspace dependencies
3. Export from `src/index.ts`
4. Reference in app's `package.json`: `"@convolens/<package-name>": "workspace:*"`
5. Run `pnpm install`

### Adding a New Platform Parser
1. Create `apps/api/src/services/<platform>-export.service.ts`
2. Implement `parse<Platform>Export()` and `isValid<Platform>Export()`
3. Follow `ChatExportData` interface
4. Add route in `apps/api/src/routes/chat-export.routes.ts`
5. Write tests in `__tests__/` directory

### Working with UI Components
- Shared components in `packages/ui/`
- Use Shadcn/UI patterns (not Ant Design)
- Apply ConvoLens brand colors (purple/cyan/lavender)
- Follow Tailwind CSS conventions
- Support dark mode

### Running Individual Apps
```bash
pnpm --filter web dev        # Only web app
pnpm --filter api dev        # Only API
pnpm --filter ui build       # Only UI package
```

## Troubleshooting

### "Module not found" errors
- Run `pnpm install` at root
- Check workspace dependencies in `package.json`
- Verify `tsconfig.json` paths

### Turbo cache issues
- Run `pnpm clean` to clear build artifacts
- Delete `.turbo/` directory
- Rebuild with `pnpm build`

### TypeScript errors in shared packages
- Ensure packages are built: `pnpm build`
- Check `tsconfig.base.json` and per-package `tsconfig.json`
- Verify exports in package `src/index.ts`
