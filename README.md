# Memory Board

A web app that delivers the [concept-learner](https://github.com/danwiththehat/danwiththehat-skills) skill to any user — guided study sessions, spaced repetition quizzes, and AI-generated study materials, all with persistent per-user memory.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Clerk** — auth
- **Neon** — serverless Postgres
- **Drizzle ORM** — DB schema + queries
- **Anthropic Claude API** — AI with `tool_use` for memory persistence
- **Tailwind CSS** — styling
- **Vercel** — deployment

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd concept-learner-web
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Same |
| `DATABASE_URL` | [Neon dashboard](https://neon.tech) → Connection string (pooled) |
| `ANTHROPIC_API_KEY` | [Anthropic console](https://console.anthropic.com/account/keys) |

### 3. Set up the database

```bash
npm run db:push
```

This runs `drizzle-kit push` to create the tables in Neon.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Deploy

## How It Works

The three skills from the original Claude Code plugin are ported as system prompts:

| Skill | Route | Description |
|---|---|---|
| **Study** | `/learn?skill=study` | Structured guided session — orient → layer → check → save |
| **Quiz** | `/learn?skill=quiz` | Spaced repetition quiz weighted toward weak areas |
| **Materials** | `/learn?skill=materials` | Generate flashcards, summaries, or cheat sheets |

**Memory** (`lt-memory/` files in the original skill) is stored in Postgres:
- `concepts` table — per-user concept notes (replaces `lt-memory/concepts/<name>.md`)
- `progress` table — per-user quiz scores (replaces `lt-memory/progress/<name>.md`)

Claude uses `tool_use` to read these from and write them back to the DB at the end of each session.
