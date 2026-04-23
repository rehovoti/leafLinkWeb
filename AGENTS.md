# AGENTS.md — leaflink

This file is a high-level guide for humans and coding agents working in this repo: what runs where, how requests flow, and where to make changes.

## Architecture (at a glance)

**Runtime topology (Docker Compose)**

- **db**: Postgres database (container `postgresql_db`), port **5432** on host.
- **pgadmin**: pgAdmin UI, port **5050** on host.
- **backend**: FastAPI + asyncpg (raw SQL), port **8000** on host.
- **frontend**: Vite dev server + React, port **5173** on host.
- **nginx**: reverse proxy, port **5020** on host.

**Request routing**

- Browser → `http://localhost:5020/` → **nginx** → **frontend** (`frontend:5173`).
- Browser → `http://localhost:5020/api/...` → **nginx** → **backend** (`backend:8000`).

Nginx config lives in `nginx/default.conf`.

## Repository layout

- `docker-compose.yml`: dev topology.
- `backend/`: FastAPI app + SQL schema.
  - `backend/src/main.py`: FastAPI app + asyncpg pool lifecycle.
  - `backend/src/settings.py`: environment-driven settings via `pydantic-settings`.
  - `backend/src/api/`: routers (users/devices/channels/auth).
  - `backend/src/schemas/`: Pydantic request/response schemas.
  - `backend/db_setup.sql`: initial SQL schema + sample inserts.
- `frontend/`: Vite + React + Redux Toolkit.
  - `frontend/src/services/API.ts`: RTK Query API slice (HTTP client).
  - `frontend/src/services/*Slice*`: Redux slices.
  - `frontend/src/services/channelUtil.ts`: encode/decode scheduling rules strings.
  - `frontend/src/components/`: MUI components (device select, channel scheduler, etc.).
- `nginx/`: reverse proxy container.

## Backend (FastAPI) details

**Entry point**

- The app is created in `backend/src/main.py`.
- On startup it creates an asyncpg connection pool and stores it on `app.state.db`.
- Routers are mounted via `app.include_router(main_router)` from `backend/src/api/__init__.py`.

**API routers**

Routers currently define endpoints (paths are relative to the nginx rewrite of `/api`):

- Users: `GET /users`, `POST /users`, `PUT /users/{user_id}`, `DELETE /users/{user_id}`
- Devices: `GET /devices`, `POST /devices`, `GET /devices/bymac/{mac_addr}`, `GET /devices/{user_id}`
- Channels: `GET /channels/{deviceId}`, `POST /channels`
- Auth: Google OAuth endpoints (work-in-progress)

**Data access**

- Uses asyncpg directly (`conn.fetch`, `conn.fetchrow`, `conn.executemany`) with SQL strings.
- No ORM / migrations framework is present.

**Settings / env**

`backend/src/settings.py` expects (minimum):

- `DATABASE_URL` (required)
- `SECRET_KEY`, `ALGORITHM` (defaults to `HS256`), `ACCESS_TOKEN_EXPIRE_MINUTES`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Compose also expects DB/pgAdmin vars (see below).

## Database

The initial schema is in `backend/db_setup.sql`:

- `users` (id, name, email, password)
- `devices` (id, title, mac_address, user_ref → users.id)
- `channels` (id, title, run_now_duration, scheduler_active, rules, last_activated, last_duration, device_ref → devices.id)

### Scheduling rules encoding

Channels store a compact string `rules` that encodes schedules. The frontend encodes/decodes this in `frontend/src/services/channelUtil.ts`.

- **Daily** rules begin with `D` and store: time + duration.
- **Weekly** rules begin with `W` and store per-day timeslots.

The backend currently treats `rules` as an opaque string.

## Frontend (React + Vite) details

**Entry points**

- `frontend/src/main.tsx` mounts the app and Redux store.
- `frontend/src/App.tsx` controls the main navigation and shows:
  - `DeviceSelector` when no device is active
  - `Device` when a device is active
  - `LoginScreen` is currently a local mock (no real auth wiring)

**State management**

- Redux Toolkit store in `frontend/src/store.ts`.
- RTK Query API client in `frontend/src/services/API.ts`.

Notable slices:

- `channelSlice`: in-memory channel config objects per channel id.
- `deviceSlice`: active device + list of devices.
- `userSlice`: simple user object.
- `themeSlice`: light/dark mode.

**API calls**

- The API client uses a hardcoded base URL: `http://localhost:5020/`.
- Endpoints include:
  - `GET api/devices`, `POST api/devices`
  - `GET api/channels/{deviceId}`, `POST api/channels`

The “Apply” action in `frontend/src/components/Footer.tsx` encodes the channel state and calls `saveChannels` (POST `api/channels`).

## How to run (dev)

### With Docker Compose

1. Create a `.env` file at repo root with at least:

   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DATABASE_URL` (used by backend; typically `postgresql://DB_USER:DB_PASSWORD@db:5432/DB_NAME`)
   - `PGADMIN_EMAIL`
   - `PGADMIN_PASSWORD`
   - Backend auth vars: `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

2. Start everything:

   - `docker compose up --build`

3. Open:

   - App: `http://localhost:5020/`
   - pgAdmin: `http://localhost:5050/`

### Database setup

There is a helper snippet in `backend/run_db_setup_sh` showing how to pipe `backend/db_setup.sql` into a running container.

Because there is no migrations tool, schema changes must be kept in sync manually.

## Where to make changes

- Add/modify API endpoints: `backend/src/api/*.py` and (usually) `backend/src/schemas/*.py`.
- Add DB tables/columns: update `backend/db_setup.sql` (and recreate DB / apply changes manually).
- Add UI screens/components: `frontend/src/components/`.
- Update API client calls: `frontend/src/services/API.ts`.
- Update schedule encoding: `frontend/src/services/channelUtil.ts`.

## Known issues / footguns (current state)

These are architectural/code-shape issues verified in the current code/schema. They’re grouped by impact so you can fix the “won’t boot / won’t work” items first.

### Critical (blocks startup or core flows)

- **Backend settings are stricter than the app currently needs**: `backend/src/settings.py` requires Google OAuth env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) even if you never hit auth endpoints, so the backend can fail at import time unless they’re set.
- **Auth callback endpoint is not registered**: `backend/src/api/auth.py` defines `callback(...)` but it has no `@router.get(...)` decorator, so Google’s redirect/callback can’t currently hit the backend.
- **Users router inconsistencies**:
  - `GET /users/{nickname}` handler signature uses `name: str` (path param mismatch).
  - `PUT /users/{user_id}` ignores the `user_id` path param and issues an `UPDATE` that references an `age` column that doesn’t exist in `backend/db_setup.sql`.
- **Channels DB schema drift (will break `/channels` writes)**: `backend/src/api/channel.py` inserts/updates columns like `channel_num`, `s_temperature`, `s_moisture`, but `backend/db_setup.sql` does not define them in `channels`.

### Data/semantics mismatches (won’t necessarily crash, but surprising)

- **`run_now_duration` meaning is unclear across layers**: the frontend encodes duration as a 5-char string (`MMMSS`), while the backend schema/types treat it as an integer and persist it to `channels.run_now_duration`.

### Product placeholder (safe to keep for last)

- **Frontend login is mocked**: `frontend/src/components/LoginScreen.tsx` simulates auth and dispatches a hard-coded user; there is no real backend auth integration yet.

If you want, we can turn the “Critical” items into a small fix PR that makes the backend boot reliably and makes `/devices` + `/users` + `/channels` consistent with the SQL schema.
