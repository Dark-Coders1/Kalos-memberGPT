# MemberGPT — Kalos Coach Intelligence

A natural-language coaching assistant for Kalos gym coaches. Ask questions about member body-composition scan data in plain English — answers are pulled directly from MongoDB and optionally rephrased by Gemini AI.

**Live demo:** [whimsical-pika-d1d86e.netlify.app](https://whimsical-pika-d1d86e.netlify.app)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, plain CSS |
| Database | MongoDB Atlas + Mongoose 8 |
| AI | Google Gemini (optional — fallback answers work without it) |
| Deployment | Netlify + `@netlify/plugin-nextjs` |

---

## Getting started

### 1. Prerequisites

- Node.js 20+
- A MongoDB instance — [MongoDB Atlas free tier](https://cloud.mongodb.com) recommended (local `mongod` also works)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/kalos?retryWrites=true&w=majority
GEMINI_API_KEY=          # optional — get one at aistudio.google.com
GEMINI_MODEL=gemini-flash-latest
JWT_SECRET=              # any long random string
```

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | Yes | Atlas URI or `mongodb://127.0.0.1:27017/kalos` for local |
| `GEMINI_API_KEY` | No | Without it, answers use structured fallbacks — still accurate |
| `GEMINI_MODEL` | No | Defaults to `gemini-flash-latest` |
| `JWT_SECRET` | No | Reserved for future auth — any random string |

### 4. Seed demo data

```bash
npm run seed
```

Inserts 8 members with realistic body-composition histories into your database:

| Member | Scans | Goal |
|---|---|---|
| Sarah Lee | 5 | Reduce body fat to 20% |
| Jordan Kim | 4 | Build lean mass to 75 kg |
| Marcus Webb | 5 | Improve visceral fat score |
| Priya Nair | 3 | Post-pregnancy strength rebuild |
| Tom Reeves | 3 | Maintenance under 15% BF |
| Elena Sousa | 3 | Competition prep |
| Daniel Frost | 4 | Lose 10 kg fat in 6 months |
| Aisha Grant | 2 | Athletic performance |

> Safe to re-run — wipes existing members and scans before inserting.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Supported queries

MemberGPT understands these natural-language intents out of the box:

| Question pattern | What it does |
|---|---|
| "How many members have had 3+ scans?" | Count of members with 3 or more scans |
| "Which members lost lean mass between their last two scans?" | Detects lean mass regression |
| "How has [name]'s body fat trended?" | Body fat % trajectory across all scans |
| "What should I focus on with [name] next session?" | Coaching priority based on latest delta |
| "Which members have not scanned in the last 60 days?" | Overdue scan detection |
| "Who are the top improvers in lean mass?" | Top 3 members by total lean mass gained |
| "What is [name]'s goal?" | Retrieves the member's stated goal |
| "How has [name]'s weight trended?" | Weight trajectory across all scans |
| "Give me a summary of all members" | BF% and lean delta for every member |

Name matching handles first names ("Sarah", "Jordan") as well as full names.

---

## API reference

### `POST /api/membergpt/query`

Ask a coaching question.

**Request**
```json
{ "question": "How has Sarah's body fat trended?" }
```

**Response**
```json
{ "answer": "Sarah Lee's body fat moved down by 5.1 points (28.2% → 23.1%) across 5 scans..." }
```

**Errors**

| Status | Reason |
|---|---|
| `400` | Missing question, question over 500 chars, or invalid JSON |
| `500` | Internal server error |

---

### `GET /api/health`

Returns database connectivity and latency.

```json
{
  "status": "ok",
  "db": "ok",
  "latencyMs": 312,
  "timestamp": "2026-04-15T19:30:26.066Z"
}
```

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── membergpt/query/route.js   POST — coaching Q&A
│   │   └── health/route.js            GET  — health check
│   ├── page.jsx                       Chat UI with conversation history
│   ├── layout.jsx                     Root layout + skip-nav
│   └── globals.css                    All styles
└── lib/
    ├── db.js                          Mongoose connection singleton
    ├── membergpt.js                   Intent detection, DB queries, Gemini call
    └── models/
        ├── User.js                    Member / coach schema (name, email, role, goal)
        └── Scan.js                    Body-composition scan schema
scripts/
└── seed.js                            Demo data seeder (8 members, ~30 scans)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on [localhost:3001](http://localhost:3001) |
| `npm run build` | Production build |
| `npm start` | Production server on port 3001 |
| `npm run seed` | Seed MongoDB with demo members and scans |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier across `src/` |

---

## Deploying to Netlify

1. Push to GitHub
2. Connect repo in Netlify → **Add new site → Import from Git**
3. Set these environment variables in **Site configuration → Environment variables**:
   - `MONGODB_URI` — your Atlas connection string
   - `GEMINI_API_KEY` — your Gemini key
   - `GEMINI_MODEL` — `gemini-flash-latest`
   - `JWT_SECRET` — any random string
4. Deploy — `netlify.toml` handles the build command and plugin automatically

> **Atlas network access:** set to `0.0.0.0/0` to allow Netlify's dynamic IPs.

---

## Data models

### User

```js
{
  name:         String   // required
  email:        String   // required, unique
  passwordHash: String   // reserved for future auth
  role:         String   // 'member' | 'coach'
  goal:         String   // member's stated goal
}
```

### Scan

```js
{
  member:          ObjectId  // ref: User
  scanDate:        Date
  weight:          Number    // kg
  bodyFatPercent:  Number    // %
  leanMass:        Number    // kg
  fatMass:         Number    // kg
  visceralFat:     Number
  notes:           String    // coach notes for this scan
  source:          String    // 'manual' | 'seed'
}
```
