---
name: repnex-agent-ops
description: Operational guide for the Repnex Repository Intelligence Agent microservice, including LangGraph React agent composition, tool query lifecycle, local testing, and Render deployment keep-alive strategies.
---

# Repnex Agent Operations & Architecture Skill

This skill documents the development, maintenance, and deployment workflows for the `repnex-agent` service.

## 1. Architecture & LangGraph Agent Composition

The agent uses `@langchain/langgraph/prebuilt`'s `createReactAgent` backed by `ChatOpenAI` pointed at OpenRouter:

- **Model Provider**: OpenRouter API (`https://openrouter.ai/api/v1`) using models such as `nvidia/nemotron-3-ultra-550b-a55b:free` or `google/gemini-2.0-flash`.
- **System Instructions**: Located in `src/prompts/instructions.md`. Enforces:
  1. Mandatory tool calling before asserting facts about codebase structure.
  2. Zero speculation: only edges discovered by the ts-morph AST parser are reported.
  3. Strict refusal: denies grading code, debugging, or writing features.
- **Runtime Graph**: The prebuilt ReAct agent receives user messages, executes graph query tools in loops, and yields intermediate streaming events (`on_tool_start`, `on_tool_end`, `on_chat_model_stream`).

## 2. Tool Query Lifecycle & Data Provider

All tools interact with the repository analysis via `src/tools/data-provider.ts`:

1. **Resolution Hierarchy**:
   - In-memory `tokenCache`: Stores `ParseResult` keyed by `analysis_token`.
   - Local File Override (`process.env.REPNEX_DATA_FILE`): Enables offline evaluation and deterministic testing.
   - Remote HTTP Endpoint (`${REPNEX_API_URL}/api/analysis-data`): Fetches the AST dependency graph from the Repnex Next.js app using the repository bearer token.

2. **Core Query Tools**:
   - `summary`: Computes total files, total edges, route counts, and highest fan-in dependencies.
   - `search_files`: Substring matching across relative paths and file classifications.
   - `list_files_by_role`: Filters files by architectural taxonomy (Page routes, API endpoints, Controllers, Services, Middleware, Components, etc.).
   - `file_neighbors`: Queries direct incoming dependents (who imports file) and outgoing dependencies (what file imports).
   - `transitive_walk`: Multi-hop BFS traversing the edge list for blast-radius impact analysis or dependency chains.
   - `route_table`: Recovers URL endpoints and mapped handler files.

## 3. Local Testing & Verification

Run the test suite using:

```bash
npm test
```

This invokes `tsx tests/test-runner.ts`, which:
- Mounts `tests/test-sample.json` into `data-provider.ts`.
- Validates the JSON responses and graph assertions of all 6 tools directly.
- Runs an optional live agent conversation when `OPENROUTER_API_KEY` is present.

To verify compilation to production JavaScript:

```bash
npm run build
```

This runs `tsc` targeting `dist/` with zero TypeScript errors.

## 4. Production Deployment on Render

The service is deployed at `https://repnex-agent.onrender.com`.

### Build & Start Commands
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

### Render Cold Start & Keep-Alive Strategies
Render free tier Web Services spin down after 15 minutes of inactivity:

1. **Automated Ping Cron**: Configure an external ping (UptimeKuma, Cron-Job.org, or GitHub Actions workflow) sending an HTTP `GET /health` request every 10 minutes.
2. **Client-Side Pre-Warming**: The Repnex frontend triggers a pre-warm ping to `https://repnex-agent.onrender.com/health` as soon as the user opens a repository visualization page, ensuring the service is warm before the user submits a chat query.
3. **Graceful SSE Reconnection**: The frontend SSE consumer must handle initial latency and potential reconnects seamlessly using standard `EventSource` / `fetch` readable streams.
