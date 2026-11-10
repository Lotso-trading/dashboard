# Polymarket Copy-Trading — `services/dashboard` GitHub Copilot Instructions

## Repository Overview

`services/dashboard` is the **financial administration and real-time telemetry web console** of the Polymarket Copy-Trading ecosystem (`Lotso-trading`):
- Built with **Vue 3.5+** (Composition API `<script setup lang="ts">`), **Vite 8**, **Pinia**, and **Tailwind CSS**.
- Connects in real-time to `services/api` via a WebSocket client for instantaneous trade feeds, status updates, and risk alerts.
- Provides interactive target whale management, real-time risk configuration controls, live position monitoring with unrealized PnL, and financial synthesis metrics.
- Shares contracts, types, and schemas with `@polymarket-copy/shared`.

---

## 🎨 UI Architecture & Frontend Standards

1. **Vue 3 Composition API**:
   - Strictly `<script setup lang="ts">` for all single-file components.
   - Reactive stores with **Pinia** (`useTargetsStore`, `useTradesStore`, `usePositionsStore`, `useConfigStore`, `useMetricsStore`).
2. **Strict Typing & Zero `any`**:
   - Zero `any` allowed in templates, props, or store state.
   - Use types imported from `@polymarket-copy/shared` for domain models (e.g. `Trade`, `Position`, `Target`, `RiskConfig`).
3. **Single Biome Standard**:
   - Code formatting and linting via Biome (`biome check .`).
4. **Clean Design & Responsiveness**:
   - High-contrast, financial-grade UI styling with Tailwind CSS.
   - Real-time reactivity without unnecessary re-renders (optimized store selectors and computed refs).

---

## Commit Message Guidelines (Conventional Commits v1.0.0)

- Always follow `<type>(<scope>): <subject>` in imperative present mood (e.g. `feat(views): add financial synthesis table with real-time PnL chart`).
- Primary scopes: `ui`, `views`, `stores`, `components`, `router`, `api`, `websocket`, `styles`, `metrics`, `deps`, `docker`, `ci`.
- Detailed commit instructions: See `.github/copilot-commit-instructions.md`.
