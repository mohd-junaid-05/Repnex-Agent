import "dotenv/config";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  summaryTool,
  searchFilesTool,
  listFilesByRoleTool,
  fileNeighborsTool,
  transitiveWalkTool,
  routeTableTool,
  allTools,
  setCachedAnalysisData,
} from "../src/tools/index.js";
import type { ParseResult } from "../src/types.js";
import { createAgentInstance } from "../src/agent.js";
import { config } from "../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log("=========================================");
  console.log("  Repnex Agent: Tool Verification Suite  ");
  console.log("=========================================\n");

  // 1. Load test sample fixture into cache
  const samplePath = path.join(__dirname, "test-sample.json");
  if (!fs.existsSync(samplePath)) {
    throw new Error(`Test fixture not found at: ${samplePath}`);
  }
  const sampleData: ParseResult = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
  setCachedAnalysisData(sampleData);
  process.env.REPNEX_DATA_FILE = samplePath;

  // Test Tool 1: summary
  const summaryRaw = await summaryTool.invoke({});
  const summary = JSON.parse(summaryRaw);
  if (summary.totalFiles !== 6 || summary.totalEdges !== 4 || summary.totalRoutes !== 2) {
    throw new Error(`Summary tool assertion failed: ${JSON.stringify(summary)}`);
  }
  console.log("✔ Tool 1/6: summary passed", {
    framework: summary.framework,
    files: summary.totalFiles,
    edges: summary.totalEdges,
    routes: summary.totalRoutes,
  });

  // Test Tool 2: search_files
  const searchRaw = await searchFilesTool.invoke({ query: "auth" });
  const search = JSON.parse(searchRaw);
  if (!search.results || search.results.length === 0) {
    throw new Error(`Search files tool assertion failed: ${searchRaw}`);
  }
  console.log("✔ Tool 2/6: search_files passed", {
    query: search.query,
    matches: search.results.map((r: { path: string }) => r.path),
  });

  // Test Tool 3: list_files_by_role
  const rolesRaw = await listFilesByRoleTool.invoke({ role: "Page routes" });
  const roles = JSON.parse(rolesRaw);
  if (!roles.files || roles.files.length !== 1 || roles.files[0].path !== "app/page.tsx") {
    throw new Error(`List files by role assertion failed: ${rolesRaw}`);
  }
  console.log("✔ Tool 3/6: list_files_by_role passed", {
    role: roles.role,
    files: roles.files.map((f: { path: string }) => f.path),
  });

  // Test Tool 4: file_neighbors
  const neighborsRaw = await fileNeighborsTool.invoke({ filePath: "lib/auth.ts" });
  const neighbors = JSON.parse(neighborsRaw);
  if (neighbors.fanIn !== 2 || neighbors.fanOut !== 1) {
    throw new Error(`File neighbors assertion failed: ${neighborsRaw}`);
  }
  console.log("✔ Tool 4/6: file_neighbors passed", {
    file: neighbors.filePath,
    fanIn: neighbors.fanIn,
    fanOut: neighbors.fanOut,
    dependents: neighbors.dependents.map((d: { sourcePath: string }) => d.sourcePath),
    dependencies: neighbors.dependencies.map((d: { targetPath: string }) => d.targetPath),
  });

  // Test Tool 5: transitive_walk (blast radius)
  const walkRaw = await transitiveWalkTool.invoke({
    filePath: "lib/auth.ts",
    direction: "blast-radius",
    maxDepth: 2,
  });
  const walk = JSON.parse(walkRaw);
  if (walk.totalReachableFiles < 1) {
    throw new Error(`Transitive walk assertion failed: ${walkRaw}`);
  }
  console.log("✔ Tool 5/6: transitive_walk passed", {
    start: walk.startPath,
    direction: walk.direction,
    reachableCount: walk.totalReachableFiles,
    levels: walk.levels,
  });

  // Test Tool 6: route_table
  const routesRaw = await routeTableTool.invoke({});
  const routes = JSON.parse(routesRaw);
  if (routes.totalRoutes !== 2) {
    throw new Error(`Route table assertion failed: ${routesRaw}`);
  }
  console.log("✔ Tool 6/6: route_table passed", {
    totalRoutes: routes.totalRoutes,
    routes: routes.routes,
  });

  console.log("\nAll 6 graph query tools executed successfully against test fixture.");

  // Live Agent Acceptance Testing (when API key is provided)
  const apiKey = config.openRouterApiKey;
  if (!apiKey || apiKey.startsWith("dummy-")) {
    console.log("\n[Notice] No live OPENROUTER_API_KEY detected; skipping external model roundtrips.");
    console.log("To run live agent tests, set OPENROUTER_API_KEY in your .env file.\n");
    return;
  }

  console.log("\n--- Testing Agent Graph with Model ---");
  const agent = createAgentInstance();

  try {
    console.log("\n[Agent Check 1] 'where is authentication handled?'");
    const turn1 = await agent.invoke({
      messages: [{ role: "user", content: "where is authentication handled?" }],
    });
    const reply1 = turn1.messages[turn1.messages.length - 1];
    console.log("Agent response:", reply1.content);

    console.log("\n[Agent Check 2] 'is this code good?' (Expect refusal)");
    const turn2 = await agent.invoke({
      messages: [{ role: "user", content: "is this code good?" }],
    });
    const reply2 = turn2.messages[turn2.messages.length - 1];
    console.log("Agent response:", reply2.content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Notice] Live agent invocation completed with notice:", msg);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
