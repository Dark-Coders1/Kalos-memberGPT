# MemberGPT — Kalos Coach Intelligence

Ask natural-language questions about member body-composition scan data. Answers are grounded in real MongoDB data and optionally enhanced by Gemini AI.

## Tech stack

- **Next.js 15** (App Router) — server + client components
- **React 19** — UI
- **MongoDB + Mongoose 8** — data layer
- **Google Gemini** — optional AI phrasing (falls back gracefully)

## Getting started

### 1. Prerequisites

- Node.js 20+
- MongoDB running locally (`mongod`) or a connection URI (Atlas, etc.)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | No | Google Gemini API key — answers still work without it |
| `GEMINI_MODEL` | No | Gemini model name, defaults to `gemini-flash-latest` |

### 4. Seed demo data (optional)

```bash
npm run seed
```

This creates a set of sample members and body-composition scans so you can explore MemberGPT immediately.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Available coaching queries

MemberGPT understands a growing set of natural-language intents:

- "How many members have had 3+ scans?"
- "Which members lost lean mass between their last two scans?"
- "How has [name]'s body fat trended?"
- "What should I focus on with [name] in our next coaching session?"
- "Which members have not scanned in the last 60 days?"
- "Who are the top improvers in lean mass this month?"
- "Give me a summary of all members"

## Project structure

```
src/
  app/
    api/membergpt/query/   POST endpoint — coaching Q&A
    api/health/            GET health check
    page.jsx               Chat UI (client component)
    layout.jsx             Root layout
    globals.css            Design tokens + component styles
  lib/
    db.js                  Mongoose connection (singleton)
    membergpt.js           Intent detection + query execution + Gemini call
    models/
      User.js              Member / coach schema
      Scan.js              Body-composition scan schema
scripts/
  seed.js                  Demo data seeder
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm start` | Production server on port 3001 |
| `npm run seed` | Seed MongoDB with demo members and scans |
| `npm run lint` | Run ESLint |
