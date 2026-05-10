# ConvoLens

> **Note:** This project was previously known as **WhatsSummarize**. The brand rename is now landing in stages — see [NAMING_RECOMMENDATIONS.md](NAMING_RECOMMENDATIONS.md) for context.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A comprehensive platform for analyzing and summarizing conversations across messaging platforms using AI-powered tools. Upload chat exports, gain insights, and get intelligent summaries of your messaging history.

**"See Your Conversations Clearly"** - The ConvoLens tagline embodies our mission to bring clarity and insight to your communication patterns.

---

## 🚀 Project Overview

**ConvoLens** allows users to unlock insights from their conversation history across messaging platforms. By uploading standard `.txt` export files, users can visualize communication patterns, activity levels, and generate AI-driven qualitative summaries.

### Brand Identity

- **Name:** ConvoLens
- **Tagline:** "See Your Conversations Clearly"
- **Colors:** Deep Purple (#6B46C1) + Bright Cyan (#06B6D4)
- **Philosophy:** Focus, clarity, and insight through the "lens" of data

### Core Value Proposition

- **Privacy-First:** Secure data handling with encryption.
- **AI-Powered:** Deep insights using OpenAI/Anthropic (Topics, Sentiment, Summaries).
- **User-Centric:** Simple upload flow and dashboard visualizations.
- **Platform-Agnostic:** Starting with WhatsApp, expanding to Telegram, Discord, and more.

---

## 🛠 Technology Stack

### Monorepo Structure (pnpm + Turbo)

- `apps/web`: Next.js 15 (App Router) Frontend.
- `apps/api`: Express.js + TypeORM Backend.
- `packages/ui`: Shared UI library (Shadcn/UI based).

### Frontend (`apps/web`)

- **Framework:** Next.js 15.4
- **Styling:** Tailwind CSS + Shadcn/UI (Note: Migrating away from Ant Design).
- **Auth:** Supabase Auth (SSR).
- **State:** React Context + Supabase.

### Backend (`apps/api`)

- **Runtime:** Node.js 18+
- **Database:** SQLite (Dev) / PostgreSQL (Prod/Supabase).
- **ORM:** TypeORM.
- **Auth:** Custom JWT (Note: Transitioning to Supabase Auth).

For a detailed analysis, see [Technology Stack Assessment](docs/PHASE_1_TECH_STACK.md).

---

## 🎨 Design System

**ConvoLens Brand Identity** following `shadcn/ui` + Tailwind CSS principles.

- **Primary Color:** Deep Purple (`#6B46C1`) - Wisdom, insight, premium
- **Secondary Color:** Bright Cyan (`#06B6D4`) - Clarity, technology, trust
- **Accent Color:** Soft Lavender (`#C4B5FD`) - Approachability, calm
- **Font:** Inter
- **Visual Style:** Lens/focus metaphor, clean lines, modern gradients, dark mode support

> **Note:** The project is currently in a hybrid state, transitioning from Ant Design to a pure Tailwind/Shadcn system with ConvoLens branding.

---

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm i -g pnpm`)
- Docker (Optional, for DB)

### Installation

1.  **Clone:**

    ```bash
    git clone https://github.com/JustAGhosT/whats-summarize.git
    cd whats-summarize
    ```

2.  **Install:**

    ```bash
    pnpm install
    ```

3.  **Environment Setup:**

    ```bash
    cp apps/web/.env.example apps/web/.env.local
    cp apps/api/.env.example apps/api/.env
    ```

4.  **Run Development:**
    ```bash
    pnpm dev
    ```

### Azure Deployment (Optional)

For deploying to Azure infrastructure:

- **Prerequisites**: Azure subscription and Azure CLI
- **Setup Guide**: See [Azure Setup Guide](docs/AZURE_SETUP.md) for configuring GitHub Actions with OIDC authentication
- **Infrastructure**: See [Infrastructure Guide](infra/README.md) for deployment instructions

---

## 📚 Documentation

- [Documentation Index](docs/README.md): Complete guide to all documentation.
- [**ConvoLens Brand Guide**](NAMING_RECOMMENDATIONS.md): Our new brand identity and implementation roadmap. ⭐
- [**Brand Color Guidelines**](docs/BRAND_COLOR_GUIDELINES.md): How to use ConvoLens colors vs WhatsApp colors. 🎨
- [Program Name Analysis](docs/PROGRAM_NAME_SUGGESTIONS.md): Comprehensive analysis of all name options evaluated.
- [Azure Setup Guide](docs/AZURE_SETUP.md): Configure Azure credentials for GitHub Actions deployment.
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md): Roadmap for upcoming refactors and features.
- [Technical Debt Registry](docs/TECHNICAL_DEBT.md): Known issues and tracking.
- [Code Review Analysis](docs/CODE_REVIEW_ANALYSIS.md): Deep dive into the codebase state.
- [Architecture](docs/architecture.md): System architecture overview.

---

## 🧪 Testing

- **Unit/Integration:** `pnpm test` (Jest)
- **E2E/Visual:** `pnpm test:ui` (Playwright - _Coming Soon_)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md).

1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
