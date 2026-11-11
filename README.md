# Repnex Agent Service

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green.svg)](https://nodejs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.x-orange.svg)](https://github.com/langchain-ai/langgraphjs)
[![Render](https://img.shields.io/badge/Deployed-Render-black.svg)](https://repnex-agent.onrender.com)

`repnex-agent` is the standalone repository intelligence microservice for **Repnex** (an AST codebase visualization and dependency graph mapping engine). It provides natural-language codebase Q&A grounded exclusively in parsed AST dependency graphs, blast-radius calculations, and architectural taxonomy.

Deployed production URL: `https://repnex-agent.onrender.com`

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Repnex Web (Next.js)          │
                      └───────┬────────────────────────▲───────┘
           1. POST /chat with │                        │ 4. SSE Stream
          messages + context  │                        │ (chunks, tool events)
                              ▼                        │
                      ┌────────────────────────────────┴───────┐
                      │         Repnex Agent Service           │
                      │         (Node.js / LangGraph)          │
                      └───────┬────────────────────────▲───────┘
            2. AST Graph Tool │                        │ 3. Tool results
              Queries         ▼                        │
                      ┌────────────────────────────────┴───────┐
                      │    AST Parse Result & Cache Provider   │
                      │   (HTTP fetch or local mock fixture)   │
                      └────────────────────────────────────────┘
```

The agent executes with strict principles:
1. **Mandatory Tool Calling**: All repository claims must be verified by calling graph tools (`summary`, `search_files`, `list_files_by_role`, `file_neighbors`, `transitive_walk`, `route_table`).
2. **Zero Speculation**: Relationships exist only if an edge exists in the AST graph.
3. **Strict Refusal**: Declines requests to grade code quality, debug logic, or write application features.

---

## Directory Layout

```text
repnex-agent/
├── .agents/
│   └── skills/
│       └── repnex-agent-ops/
│           └── SKILL.md            # Skill detailing how to run, test, and add tools
├── src/
│   ├── config.ts                  # Environment parsing, defaults & strict validation
│   ├── server.ts                  # HTTP Server with SSE streaming, CORS & /health
│   ├── agent.ts                   # createReactAgent setup using ChatOpenAI (OpenRouter)
│   ├── types.ts                   # Parser data contracts and graph types
│   ├── lib/                       # Pure graph math and file classification utilities
│   │   ├── classification.ts
│   │   └── graph-math.ts
│   ├── prompts/
│   │   └── instructions.md        # System prompt with strict tool-first rules
│   └── tools/                     # Graph query tools
│       ├── index.ts               # Tool registry & exports
│       ├── data-provider.ts       # Analysis data fetcher with in-memory cache
│       ├── summary.ts             # Repo summary metrics tool
│       ├── search-files.ts        # Substring search across file paths
│       ├── list-roles.ts          # List files by architectural framework role
│       ├── neighbors.ts           # Direct dependencies & dependents
│       ├── transitive-walk.ts     # Blast radius & transitive chain walker
│       └── route-table.ts         # Recovered HTTP routes table
├── tests/
│   ├── test-runner.ts             # CLI test runner for tool calls
│   └── test-sample.json           # Mock analysis payload for testing
├── .env.example                   # Environment variable documentation
├── README.md                      # Architecture, API contract, and deployment guide
├── tsconfig.json                  # Strict TypeScript build configuration
└── package.json                   # Build, test, and start scripts
```

---

## Getting Started

### Prerequisites
- Node.js >= 20 (Node 22+ recommended)
- npm or pnpm

### 1. Installation
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and provide your credentials:

```bash
cp .env.example .env
```

```ini
PORT=3001
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
ALLOWED_ORIGINS=http://localhost:3000,https://*.vercel.app
REPNEX_API_URL=http://localhost:3000
```

### 3. Development
Start the service in hot-reload mode:

```bash
npm run dev
```

The service will listen on `http://localhost:3001`.

### 4. Running Tests
Run the automated tool verification suite:

```bash
npm test
```

### 5. Production Build
Compile TypeScript to `dist/`:

```bash
npm run build
```

Start the compiled service:

```bash
npm start
```

---

## API Contract

### `GET /health`
Returns service status, model configuration, and uptime.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "agent": "repnex-agent",
  "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "uptime": 124.52
}
```

---

### `POST /chat` (or `POST /stream`)
Initiates an agent conversation turn with Server-Sent Events (SSE) streaming.

**Request Headers**:
```http
Content-Type: application/json
Accept: text/event-stream
```

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "where is authentication handled?" }
  ],
  "credential": "optional_bearer_token",
  "apiUrl": "http://localhost:3000",
  "selectedContext": {
    "file": "lib/auth.ts"
  }
}
```

**Streamed Server-Sent Events (`text/event-stream`)**:

- `tool_start`: Emitted when the agent calls a tool.
  ```text
  event: tool_start
  data: {"tool":"search_files","input":{"query":"auth"}}
  ```

- `tool_end`: Emitted when a tool finishes execution.
  ```text
  event: tool_end
  data: {"tool":"search_files","output":"{ ... }"}
  ```

- `chunk`: Emitted as the model streams tokens.
  ```text
  event: chunk
  data: {"text":"Authentication is handled in `lib/auth.ts`..."}
  ```

- `done`: Emitted on successful completion of the turn.
  ```text
  event: done
  data: {"status":"ok"}
  ```

- `error`: Emitted if an unhandled error occurs.
  ```text
  event: error
  data: {"message":"Failed to fetch repository analysis"}
  ```

---

## Render Deployment Guide

The service is pre-configured for automated deployment on **Render**:

1. **Create Web Service**:
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/health`

2. **Environment Variables**:
   Set the following variables in the Render Dashboard:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `OPENROUTER_MODEL`: `nvidia/nemotron-3-ultra-550b-a55b:free` (or desired model).
   - `ALLOWED_ORIGINS`: `http://localhost:3000,https://*.vercel.app,https://repnex.vercel.app`
   - `NODE_ENV`: `production`

3. **Preventing Cold Starts**:
   Render's free tier spins down idle instances after 15 minutes. Use an automated ping service (e.g. Cron-Job.org or Uptime Kuma) pinging `https://repnex-agent.onrender.com/health` every 10 minutes to maintain active availability.
