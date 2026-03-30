# IncidentDesk

IncidentDesk is Nightshift build 045: a backend-first Bun + Hono + React incident management app with SQLite persistence, timestamped timeline history, SLA countdowns, and a dark operations dashboard.

## Stack

- TypeScript
- Bun
- Hono backend
- React + Vite frontend
- Tailwind CSS dark UI
- SQLite persistence via Drizzle ORM
- Single-container deployment serving API and frontend on one domain

## Features

- Create and edit incidents with severity, owner, tags, impact summary, and status lifecycle.
- Add timestamped timeline comments, ownership handoffs, notes, and status updates per incident.
- Filter the operations dashboard by title, severity, status, and overdue SLA state.
- Review summary metrics for active incidents, overdue incidents, sev1 load, and owner distribution.

## Local development

```bash
bun install
bun run dev
```

The application listens on `http://localhost:3000`.

## Local build verification

```bash
bun install
bun run build
```

## Container

```bash
docker compose up --build
```

This serves the frontend and API from the same Bun process on port `3000`.

## Deployment metadata

- GitHub repo: `https://github.com/obrera/nightshift-045-incidentdesk`
- Live URL: pending deployment
- Intended Dokploy source: `github / obrera / nightshift-045-incidentdesk / main / ./docker-compose.yml`

## Repository contents

- [`server/index.ts`](/home/obrera/projects/nightshift-045-incidentdesk/server/index.ts): Hono server and static asset serving.
- [`server/routes/incidents.ts`](/home/obrera/projects/nightshift-045-incidentdesk/server/routes/incidents.ts): incident CRUD and timeline endpoints.
- [`server/routes/dashboard.ts`](/home/obrera/projects/nightshift-045-incidentdesk/server/routes/dashboard.ts): summary metrics and hot incident feed.
- [`client/src/App.tsx`](/home/obrera/projects/nightshift-045-incidentdesk/client/src/App.tsx): dashboard UI, filters, editor, and timeline workspace.

## License

MIT
