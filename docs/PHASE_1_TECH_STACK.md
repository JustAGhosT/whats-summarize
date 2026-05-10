# Technology Stack & Best Practices Assessment

## Phase 1a – Technology & Context Assessment

### Project Overview
*   **Project Type:** SaaS / Web Application
*   **Domain:** Social Media Analysis (WhatsApp)
*   **Monorepo Structure:** pnpm + Turborepo

### Technology Stack Overview

#### Frontend (`apps/web`)
*   **Framework:** Next.js 15.4.7 (App Router)
*   **Language:** TypeScript 5.x
*   **Styling:**
    *   **Primary:** Tailwind CSS 3.4
    *   **Component Library:** Hybrid of `shadcn/ui` (via `packages/ui`) and `antd` (Ant Design 5.26).
    *   **Icons:** Lucide React (via shadcn) & Ant Design Icons.
*   **State Management:** React Context (via `@convolens/contexts`) + Local State.
*   **Data Fetching:** Standard `fetch` / Axios.
*   **Authentication:** Supabase Auth (SSR).

#### Backend (`apps/api`)
*   **Runtime:** Node.js (Engine >=16, Recommended 18+)
*   **Framework:** Express.js 4.18
*   **Language:** TypeScript (ES Modules `type: module`)
*   **Database:** SQLite (via `sqlite3`)
*   **ORM:** TypeORM 0.3.26
*   **Real-time:** Socket.io 4.7
*   **Authentication:** Custom JWT + bcryptjs (Note: Diverges from Frontend's Supabase Auth).
*   **Logging:** Winston.

#### Tooling & Dev Experience
*   **Package Manager:** pnpm 8.x
*   **Build System:** Turborepo
*   **Linting/Formatting:** ESLint, Prettier, Husky (Git Hooks).
*   **Testing:** Jest (Unit/Integration), Playwright (E2E - inferred from root deps).

#### Deployments & Ops
*   **Infrastructure:** Azure (implied by `infra/` folder and README).
*   **Containerization:** Docker (implied by `infra` context).

---

## Phase 1b – Best-Practices Research Baseline

This benchmark defines the standards used to evaluate the current implementation.

### 1. Frontend Architecture (Next.js 15)
*   **Server Components:** Maximize usage of RSC (React Server Components) for data fetching and heavy lifting.
*   **Client Components:** Restrict `use client` to leaf nodes requiring interactivity.
*   **Routing:** Use the App Router (`app/`) directory structure exclusively.
*   **Forms:** Use Server Actions for mutations (progressive enhancement).
*   **Styling:**
    *   **Single Source of Truth:** Avoid mixing component libraries (e.g., AntD + Tailwind/Radix). The target is strict Tailwind/Shadcn.
    *   **Variables:** Use CSS variables/Tailwind colors for theming (Dark Mode).
*   **Performance:**
    *   Core Web Vitals (LCP, CLS, INP) optimization.
    *   `next/image` for all assets.
    *   Route Groups `(group)` for logical separation without URL impact.

### 2. Backend Architecture (Express/Node)
*   **Structure:** Controller-Service-Repository pattern or Domain-Driven Design (DDD).
*   **Validation:** Strict input validation (e.g., Zod) for all endpoints.
*   **Error Handling:** Centralized error handling middleware. structured JSON error responses.
*   **Async/Await:** No callbacks; proper `try/catch` or wrapper for async route handlers.
*   **Security:**
    *   Rate limiting (e.g., `express-rate-limit`).
    *   Helmet for headers.
    *   CORS configured strictly.
*   **Database:** Migrations must be versioned and automated.

### 3. Testing Strategy
*   **Unit Tests (Jest):** Coverage > 80% for util functions and complex logic.
*   **Integration Tests (Jest/Supertest):** Cover happy paths and critical error cases for all API endpoints.
*   **E2E Tests (Playwright):** Cover critical user flows (Login, Upload, Summary View).
*   **Visual Regression:** Snapshot tests for UI components (Storybook/Playwright).

### 4. Code Quality & Standards
*   **Strict TypeScript:** `noImplicitAny`, strict null checks enabled.
*   **Imports:** Absolute imports (aliases) over relative paths (e.g., `@/components` vs `../../components`).
*   **Secrets:** No hardcoded secrets. Environment variables validated on startup (e.g., `t3-env` or custom check).
*   **Comments:** `JSDoc` for public functions; avoid "what" comments, focus on "why".

### 5. Monorepo Best Practices (Turborepo)
*   **Boundaries:**
    *   `packages/ui` should not import from `apps/*`.
    *   `apps/*` should depend on shared packages.
*   **Caching:** Inputs/Outputs correctly defined in `turbo.json` to maximize cache hits.
*   **Docker:** Pruned builds using `turbo prune` for smaller container images.
