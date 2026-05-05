# Churn Guard AI

Frontend (React + MUI + Chart.js) with a separate Node.js backend (Express + MongoDB).

## Project Structure

- `src/` frontend dashboard
- `backend/` Node.js API server with MongoDB models and seed data

## Backend Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Ensure MongoDB is running locally (default URI uses `mongodb://127.0.0.1:27017/churnguard`)
3. Install dependencies:

```bash
cd backend
npm install
```

4. Start backend:

```bash
npm run dev
```

Available API endpoints:

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/tenants/:tenantId/portfolio`
- `GET /api/ai/updates/latest`
- `POST /api/ai/updates/generate`

## Azure OpenAI AI Updates

Configure these values in `backend/.env`:

- `AZURE_OPENAI_ENDPOINT` (example: `https://<resource>.cognitiveservices.azure.com/`)
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION` (default: `2024-12-01-preview`)
- `AZURE_OPENAI_DEPLOYMENT_PRIMARY` (deployment name, e.g. `gpt-5.5_1`)
- `AZURE_OPENAI_DEPLOYMENT_FALLBACK` (optional deployment fallback)

When the dashboard Refresh button is clicked, frontend triggers `POST /api/ai/updates/generate`.
Each AI run is stored in MongoDB and retrievable via `GET /api/ai/updates/latest`.

## Frontend Setup

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
npm install
```

3. Start frontend:

```bash
npm run dev
```

By default, frontend calls backend at `http://localhost:4000/api`.

## Data Seeded in MongoDB

On backend startup, if collections are empty, mock records are inserted for:

- Email interactions
- Incidents
- Leasing data

These records power dashboard and tenant portfolio APIs.
