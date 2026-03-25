# Project State – Emergency Response Equipment Portal

## Tech Stack
- Vite + React + TypeScript
- React Router
- Local mock auth via DevToolbar
- No backend yet
- No TanStack Query yet (planned)

## Repo Structure (validated)
src/
- components/
  - Layout.tsx
  - DevToolbar.tsx
  - AccessDenied.tsx
- pages/
  - Dashboard.tsx (FULL logic restored)
  - Search.tsx (filters + mock results)
  - EquipmentList.tsx (placeholder)
- hooks/
  - useCurrentUser.ts
- App.tsx (route guards)
- main.tsx

## Current App State
- App runs in Codespaces
- Sidebar renders correctly
- DevToolbar works (role switching via localStorage)
- Route protection works (Admin / Search)
- Dashboard:
  - Metrics
  - Status pills
  - Recent table
- Search page:
  - Text search
  - Status filter
  - Category filter
  - Mock data
  - Inputs explicitly styled (Vite CSS issue fixed)

## Known Gotchas
- Vite default CSS hides inputs unless styled
- Only ONE src/ directory allowed
- No nested components/pages folders

## Next Planned Steps
1. Build Equipment List page (filters, pagination)
2. Add CSV export (Reporter + Admin)
3. Introduce fake API layer (TanStack Query)
4. Replace inline styles with shared styles

## How to Resume
- Start app: `npm run dev -- --host`
- Use DevToolbar to switch roles
- Start with EquipmentList.tsx
