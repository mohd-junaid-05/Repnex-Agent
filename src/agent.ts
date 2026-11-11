import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { allTools } from "./tools/index.js";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadInstructions(): string {
  const candidatePaths = [
    path.join(__dirname, "prompts", "instructions.md"),
    path.join(__dirname, "../src/prompts", "instructions.md"),
    path.resolve(process.cwd(), "src/prompts/instructions.md"),
    path.resolve(process.cwd(), "prompts/instructions.md"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf-8");
    }
  }

  return `You are the Repnex repository intelligence agent. Always inspect repository dependencies and structure using tools. Never speculate or assume relationships not in the parsed graph.`;
}

export function createModel(customApiKey?: string, customModel?: string) {
  const apiKey = customApiKey || config.openRouterApiKey;
  const modelName = customModel || config.modelName;

  return new ChatOpenAI({
    model: modelName,
    apiKey: apiKey || "dummy-key-for-initialization",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://repnex-agent.onrender.com",
        "X-Title": "Repnex Agent",
      },
    },
    temperature: 0,
  });
}

export function createAgentInstance(customApiKey?: string, customModel?: string) {
  const model = createModel(customApiKey, customModel);
  const prompt = loadInstructions();

  return createReactAgent({
    llm: model,
    tools: allTools,
    prompt,
  });
}

export const agent = createAgentInstance();
