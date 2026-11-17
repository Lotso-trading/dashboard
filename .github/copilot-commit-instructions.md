# GitHub Copilot Commit Message Generation Instructions — `services/dashboard`

You are an expert Git commit message generator for `services/dashboard`, the Vue 3 and Tailwind CSS financial frontend of the Polymarket Copy-Trading ecosystem.

Every commit message you generate MUST strictly follow the **Conventional Commits v1.0.0** specification, because commits pushed to `main` trigger automated container builds and production Docker Swarm deployments via `semantic-release`.

---

## 1. Golden Rules: SemVer Releases & Accurate Classification

- `feat` -> Minor bump (`v0.X.0` or `vX.Y.0`) + Docker build + Swarm deployment
- `fix` or `perf` -> Patch bump (`v0.0.X` or `vX.Y.Z`) + Docker build + Swarm deployment
- `refactor` -> Patch bump (`v0.0.X` or `vX.Y.Z`) + Docker build + Swarm deployment
- `chore(deps)` -> Patch bump (`v0.0.X` or `vX.Y.Z`) + Docker build + Swarm deployment
- `BREAKING CHANGE:` or `!` -> Major bump (`vX.0.0`) + Docker build + Swarm deployment

### Classification Guidelines:

1. **Use `feat:`** for new UI views, panels, telemetry cards, Pinia stores, WebSocket events, or filters.
2. **Use `fix:`** for UI bugs, reactivity issues, data desynchronization, layout glitches, or broken chart tooltips.
3. **Use `perf:`** for render performance optimizations, debounced store actions, or virtualized table scrolling.
4. **Use `refactor:`** for component extraction, store restructuring, or CSS cleanup without behavior changes.
5. **Use `chore(deps)`** for dependency updates (Vue, Vite, Tailwind CSS, Pinia).
6. **Use `chore:` (other scopes)** for dev scripts, nginx config tweaks, or `.gitignore`.
7. **Use `docs:`, `style:`, `test:`, `ci:`, `build:`** for documentation, Biome formatting, unit tests, or CI workflows.

---

## 2. Mandatory Format

```text
<type>(<scope>): <subject in imperative present mood>

[optional body explaining "why" and "how"]

[optional footer: BREAKING CHANGE: <explanation> or Fixes #<issue>]
```

### Subject (Header) Rules:

1. **Type & Scope**: Strictly lowercase (e.g. `feat(views):`, `fix(stores):`, `refactor(components):`).
2. **Language**: English ONLY.
3. **Imperative mood**: Use `add`, `fix`, `update`, `remove`, `refactor`, `prevent`, `implement`.
4. **Initial letter**: Lowercase (e.g., `fix(stores): optimize data refresh logic` NOT `fix(stores): Optimize...`), unless starting with an acronym like `USDC`, `EIP-712`, `CLOB`, `RPC`, `API`, `URL`, `ID`.
5. **Length**: 50 to 72 characters max.
6. **No trailing period**: NEVER end with a dot (`.`).
7. **No emojis**: Never include emojis in the subject.

---

## 3. Authorized Scopes for `services/dashboard`

- `ui`: General UI layout, theme, modals, badges, and shared primitives.
- `views`: Top-level route views (`FinancialSynthesisView`, `DashboardView`, `TargetsView`, etc.).
- `stores`: Pinia reactive state stores (`useTargetsStore`, `useTradesStore`, `useConfigStore`, etc.).
- `components`: Reusable Vue SFC components (`TargetsFollowTable`, `RiskSettingsPanel`, `MetricCard`, etc.).
- `router`: Vue Router configuration, guards, and navigation.
- `api`: HTTP fetch client wrapper and backend API integration.
- `websocket`: WebSocket client connection, reconnect logic, and event dispatchers.
- `styles`: Tailwind CSS configurations, utility classes, and custom styling.
- `metrics`: PnL calculation, chart renderers, and financial indicators.
- `deps`: Dependency updates.
- `docker`: Dockerfile and Nginx reverse proxy configuration.
- `ci`: CI workflows and testing automation.

---

## 4. Examples

### Good Examples:

- `feat(views): add financial synthesis table with real-time PnL chart`
- `fix(stores): optimize data refresh logic and prevent duplicate settlements`
- `feat(components): enhance TargetsFollowTable with view mode toggle`
- `refactor(components): extract RiskSettingsPanel into modular sub-sections`
- `fix(websocket): reconnect gracefully when backend API restarts`
- `perf(views): virtualize trade history table for high-throughput streaming`
- `chore(deps): update vue to v3.5.13 and vite to v6.0.7`

### Bad Examples to Avoid:

- ❌ `Fix button.` (vague, capitalized, trailing period)
- ❌ `feat: add chart` (missing scope, vague)
- ❌ `feat(ui): 🎨 Updated colors` (contains emoji, past tense, capitalized)
