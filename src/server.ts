import "dotenv/config";
import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { config } from "./config.js";
import { agent } from "./agent.js";
import { allTools } from "./tools/index.js";

interface ChatPayload {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  credential?: string;
  apiUrl?: string;
  selectedContext?: { file?: string; folder?: string };
}

function resolveCorsOrigin(incomingOrigin?: string): string {
  if (!incomingOrigin || config.allowedOrigins.includes("*")) {
    return "*";
  }

  for (const pattern of config.allowedOrigins) {
    if (pattern === incomingOrigin) {
      return incomingOrigin;
    }
    // Handle wildcard subdomains like https://*.vercel.app
    if (pattern.includes("*")) {
      const regexPattern = "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
      const regex: RegExp = new RegExp(regexPattern);
      if (regex.test(incomingOrigin)) {
        return incomingOrigin;
      }
    }
  }

  return config.allowedOrigins[0] || "*";
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin as string | undefined;
  const allowedOrigin = resolveCorsOrigin(origin);

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (allowedOrigin !== "*") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}

export function createServer(): http.Server {
  return http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    applyCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlPath = (req.url || "").split("?")[0];

    // Health check endpoint (GET /health or GET /)
    if (req.method === "GET" && (urlPath === "/health" || urlPath === "/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          agent: "repnex-agent",
          model: config.modelName,
          uptime: process.uptime(),
        })
      );
      return;
    }

    // Chat endpoint with SSE streaming (POST /chat or POST /stream)
    if (req.method === "POST" && (urlPath === "/chat" || urlPath === "/stream")) {
      let body = "";
      req.on("data", (chunk: Buffer | string) => {
        body += chunk;
      });

      req.on("end", async () => {
        const sendEvent = (event: string, data: unknown) => {
          if (!res.headersSent) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            });
          }
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
          const payload: ChatPayload = JSON.parse(body || "{}");
          const { messages, credential, apiUrl, selectedContext } = payload;

          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing or invalid 'messages' array." }));
            return;
          }

          // Convert incoming messages to LangChain BaseMessage objects
          const lcMessages: BaseMessage[] = [];
          for (let i = 0; i < messages.length; i++) {
            const m = messages[i];
            const isLastUser = i === messages.length - 1 && m.role === "user";

            let content = m.content;
            if (isLastUser && selectedContext) {
              const contextNotes: string[] = [];
              if (selectedContext.file) {
                contextNotes.push(`Focused file in map: "${selectedContext.file}"`);
              } else if (selectedContext.folder) {
                contextNotes.push(`Focused folder in map: "${selectedContext.folder}"`);
              }
              if (contextNotes.length > 0) {
                content = `[Context: ${contextNotes.join(", ")}]\n${content}`;
              }
            }

            if (m.role === "user") {
              lcMessages.push(new HumanMessage(content));
            } else {
              lcMessages.push(new AIMessage(content));
            }
          }

          // Stream LangGraph events
          const eventStream = agent.streamEvents(
            { messages: lcMessages },
            {
              version: "v2",
              configurable: {
                analysis_token: credential || config.analysisToken,
                api_url: apiUrl || config.repnexApiUrl,
              },
            }
          );

          for await (const event of eventStream) {
            if (event.event === "on_tool_start") {
              sendEvent("tool_start", {
                tool: event.name,
                input: event.data?.input,
              });
            } else if (event.event === "on_tool_end") {
              const rawOutput = event.data?.output;
              let outputPreview = "";
              try {
                if (typeof rawOutput === "string") {
                  outputPreview = rawOutput;
                } else if (rawOutput && typeof (rawOutput as { content?: string }).content === "string") {
                  outputPreview = (rawOutput as { content: string }).content;
                } else {
                  outputPreview = JSON.stringify(rawOutput);
                }
              } catch {
                outputPreview = String(rawOutput);
              }

              sendEvent("tool_end", {
                tool: event.name,
                output: outputPreview,
              });
            } else if (event.event === "on_chat_model_stream") {
              const chunk = event.data?.chunk;
              if (chunk && chunk.content) {
                sendEvent("chunk", {
                  text: typeof chunk.content === "string" ? chunk.content : JSON.stringify(chunk.content),
                });
              }
            }
          }

          sendEvent("done", { status: "ok" });
          res.end();
        } catch (err: unknown) {
          const error = err as { message?: string };
          const msg = error.message || String(err);
          sendEvent("error", { message: msg });
          res.end();
        }
      });

      return;
    }

    // 404 handler
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found." }));
  });
}

const server = createServer();

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Repnex Agent Service listening on http://0.0.0.0:${config.port}`);
    console.log(`Model: ${config.modelName}`);
    console.log(`Tools: ${allTools.map((t) => t.name).join(", ")}`);
  });
}

export default server;
