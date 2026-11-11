import "dotenv/config";

export interface AppConfig {
  port: number;
  openRouterApiKey: string;
  modelName: string;
  allowedOrigins: string[];
  repnexApiUrl: string;
  analysisToken: string;
  dataPath?: string;
}

function parseAllowedOrigins(raw?: string): string[] {
  if (!raw || raw.trim() === "*" || raw.trim() === "") {
    return ["*"];
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function loadConfig(): AppConfig {
  const apiKey = (
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();

  const port = parseInt(
    process.env.PORT || process.env.AGENT_PORT || "3001",
    10
  );

  const modelName =
    process.env.OPENROUTER_MODEL ||
    process.env.GEMINI_MODEL ||
    "nvidia/nemotron-3-ultra-550b-a55b:free";

  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  const repnexApiUrl = (
    process.env.REPNEX_API_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const analysisToken = (process.env.REPNEX_ANALYSIS_TOKEN || "").trim();
  const dataPath = process.env.REPNEX_DATA_FILE?.trim() || undefined;

  return {
    port: isNaN(port) ? 3001 : port,
    openRouterApiKey: apiKey,
    modelName,
    allowedOrigins,
    repnexApiUrl,
    analysisToken,
    dataPath,
  };
}

export const config = loadConfig();
