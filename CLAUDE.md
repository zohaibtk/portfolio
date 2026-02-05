# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build → dist/
npm run lint       # ESLint (flat config)
npm run preview    # Serve the production build locally
```

No test suite is configured.

## Architecture

A single-page React project management dashboard. No backend — all state persists to `localStorage` via a singleton data-service layer.

### Layout of `src/`

```
src/
├── App.jsx              # Root orchestrator: state, DndContext, route declarations
├── App.css              # All styles (~2 300 lines, single global stylesheet)
├── constants.js         # STATUS_LABELS, PRIORITY_LABELS shared across the tree
├── utils/
│   └── projectUtils.js  # Pure helpers: parseDate, isPast, computeProjectDerived
├── components/          # Reusable UI pieces
│   ├── Sidebar.jsx
│   ├── Filters.jsx
│   ├── ProjectCard.jsx          # Full project card (largest component)
│   ├── ProjectEditor.jsx        # Create / edit modal
│   ├── SortableProjectCard.jsx  # @dnd-kit wrapper around ProjectCard
│   ├── SortableTableRow.jsx     # @dnd-kit sortable <tr>
│   ├── RichTextEditor.jsx       # ReactQuill wrapper
│   ├── RiskChip.jsx
│   └── StatusPill.jsx
├── views/               # One file per route (or group of routes)
│   ├── OverviewView.jsx         # /overview — filters + card grid
│   ├── StatusView.jsx           # /discovery, /development, /on-hold, /completed (parameterised)
│   ├── TimelineView.jsx         # /timeline — Gantt-style milestones
│   ├── ProjectListView.jsx      # /projects — sortable table
│   ├── ProjectDetailsView.jsx   # /projects/:id
│   └── SettingsView.jsx         # /settings — self-contained export/import
├── services/
│   └── dataService.js   # Singleton: localStorage CRUD + observer pattern
└── data/
    └── projects.json    # Seed data (only loaded when localStorage is empty)
```

### State and data flow

- **No global state library.** All shared state (`projects`, `filter`, `editorOpen`, `editingProject`, DnD `activeId`) lives in the root `App` component.
- On mount `App` calls `dataService.initialize()`, then subscribes to change notifications. All mutations (create / update / delete) go through `dataService`, which persists to localStorage and calls `notifyListeners()`, triggering a re-render automatically.
- **Derived data is computed with `useMemo` inside `App`** before being passed down: `projectsWithDerived`, `orderedProjectsWithDerived`, `filteredOrdered`. The derivation function is `computeProjectDerived()` in `utils/projectUtils.js` — it calculates risk level, late artifacts, and days-late from the project's dates.
- **Custom project order** is stored in a separate localStorage key (`pm-projects-order`), managed by `dataService.getProjectOrder()` / `updateProjectOrder()`.

### Drag-and-drop

A single `<DndContext>` in `App` wraps all routes and the shared `<DragOverlay>`. Each view that has sortable items renders its own `<SortableContext>` (only one route is mounted at a time, so there is never ambiguity). Reorder always operates on the global order via `dataService.updateProjectOrder()`.

### Route → view mapping

| Path | View component | Notes |
|---|---|---|
| `/` | — | Redirects to `/overview` |
| `/overview` | `OverviewView` | Uses `Filters` + `filteredOrdered` |
| `/discovery` | `StatusView` | `status="discovery"` |
| `/development` | `StatusView` | `status="development"` |
| `/on-hold` | `StatusView` | `status="on_hold"` (URL hyphen ≠ data key underscore) |
| `/completed` | `StatusView` | `status="completed"` |
| `/timeline` | `TimelineView` | Receives `projectsWithDerived` |
| `/projects` | `ProjectListView` | Table + "Add project" |
| `/projects/:id` | `ProjectDetailsView` | Uses `useParams` |
| `/settings` | `SettingsView` | Self-contained; owns `fileInputRef` and export/import handlers |

### Styling

Single global stylesheet `App.css`. Class names follow a BEM-like convention (`project-card`, `project-card__header`, `project-card__section`). Design tokens are hard-coded hex values — primary `#4f46e5` (indigo), risk colours green/amber/red. Responsive breakpoints at 900 / 768 / 600 / 400 px.

### Deployment

Deployed to Vercel. `vercel.json` rewrites all paths to `index.html` for client-side routing.
