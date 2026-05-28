# GEMINI.md - tecdoit Project Context

## Project Overview
**tecdoit** is a Centralized Laboratory Management System developed by **Zarzilla Games**. It optimizes inventory control, automates preventive maintenance, and facilitates financial decision-making (CAPEX) for a laboratory network through a scalable web environment.

### Core Technologies
- **Frontend:** React (Vite), React Router v7, Recharts (Analytics), React QR Scanner.
- **Backend:** Node.js Express server.
- **Database & Auth:** Supabase (PostgreSQL with Row-Level Security).
- **Testing:** Cypress (E2E and Component testing).

---

## Architecture and Structure

The project follows a decoupled client-server architecture:

### 1. Frontend (`/src`)
- **Main Entry:** `main.jsx` and `App.jsx`.
- **Services:**
  - `src/services/api.js`: Centralized API calls to the Express backend.
  - `src/services/supabase.js`: Direct Supabase client for authentication and direct DB interactions.
- **Components:** `src/components/` contains layout and reusable UI elements (e.g., `Sidebar.jsx`).
- **Pages:** `src/pages/` contains the main module views (Dashboard, Inventario, etc.).

### 2. Backend (`/server`)
- **Main Entry:** `server/index.js`.
- **Design Pattern:** MVC-like structure with `routes/` and `controllers/`.
- **Configuration:** `server/config/supabaseClient.js` uses the `SUPABASE_SERVICE_ROLE_KEY` for privileged database access.

### 3. Testing (`/cypress`)
- E2E tests located in `cypress/e2e`.
- Component tests located in `cypress/component`.
- Base URL configured to `http://localhost:5173`.

---

## Building and Running

### Prerequisites
- Node.js installed.
- Supabase project configured.

### Environment Setup
Create a `.env` file in the root for the frontend and another (or shared) for the backend.

**Frontend `.env` (Root):**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001/api
```

**Backend `.env` (`/server/.env`):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
```

### Installation
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Execution
```bash
# Run Frontend (Vite)
npm run dev

# Run Backend (Express)
cd server
node index.js
```

---

## Development Conventions (Zarzilla Games Standards)

- **KISS (Keep It Simple, Stupid):** Avoid complex SQL queries. Perform financial calculations in the frontend to keep the server lightweight.
- **SRP (Single Responsibility Principle):** Use centralized services (`src/services/`) for DB and API interactions. Do not hardcode credentials or logic in components.
- **Security (RLS):** Respect Row-Level Security policies.
- **Optimistic UI:** Update React state immediately for user responsiveness, then sync with Supabase/Backend in the background.
- **Authentication:** Managed via Supabase Auth in `App.jsx`. Access is restricted to authenticated users.

---

## Key Modules
1. **Dashboard:** Real-time budget calculation (CAPEX/OPEX) and notification center.
2. **Inventario:** CRUD operations for lab equipment with Supabase Storage integration for images.
3. **Mantenimiento:** Preventive and correctivo service records.
4. **Uso de Equipos (QR):** Automated hardware loan tracking via QR codes.
