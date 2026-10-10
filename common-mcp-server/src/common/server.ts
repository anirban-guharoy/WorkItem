import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runWithEntraAssertion } from "./request-context.js";
import {
  createEntraRemoteAuthConfigFromEnv,
  DeveloperIdentity,
  verifyEntraRemoteAccessToken,
} from "./auth.js";
import { ToolModule, unknownTool } from "./mcp.js";

type ServerOptions = {
  name: string;
  version: string;
  modules: ToolModule[];
};

type RemoteSession = {
  server: Server;
  transport: StreamableHTTPServerTransport;
  identity: DeveloperIdentity;
};

export function loadEnvironment(): void {
  dotenv.config();
}

export function createMcpServer({ name, version, modules }: ServerOptions): Server {
  const tools = modules.flatMap((module) => module.tools);
  const handlersByToolName = new Map<string, ToolModule>();

  for (const module of modules) {
    for (const tool of module.tools) {
      const existingModule = handlersByToolName.get(tool.name);
      if (existingModule) {
        throw new Error(
          `Tool name conflict: ${tool.name} is defined by both ${existingModule.name} and ${module.name}.`
        );
      }

      handlersByToolName.set(tool.name, module);
    }
  }

  const server = new Server(
    {
      name,
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const module = handlersByToolName.get(toolName);

    if (!module) {
      return unknownTool(toolName);
    }

    return module.handleTool(toolName, request.params.arguments);
  });

  return server;
}

export async function startRemoteServer(createServer: () => Server, label: string): Promise<void> {
  const authEnabled = process.env.ENTRA_AUTH_ENABLED?.trim().toLowerCase();
  if (!authEnabled || !["1", "true", "yes", "on"].includes(authEnabled)) {
    throw new Error("Remote MCP requires ENTRA_AUTH_ENABLED=true.");
  }

  const authConfig = createEntraRemoteAuthConfigFromEnv();
  const publicUrlValue = process.env.MCP_PUBLIC_URL?.trim();
  if (!publicUrlValue) {
    throw new Error("Remote MCP requires MCP_PUBLIC_URL, including its public HTTPS URL and endpoint path.");
  }

  const publicUrl = new URL(publicUrlValue);
  if (publicUrl.protocol !== "https:" && publicUrl.hostname !== "localhost" && publicUrl.hostname !== "127.0.0.1") {
    throw new Error("MCP_PUBLIC_URL must use HTTPS except for localhost development.");
  }

  const endpointPath = publicUrl.pathname.replace(/\/$/, "") || "/mcp";
  const metadataPath = "/.well-known/oauth-protected-resource";
  const metadataUrl = new URL(metadataPath, publicUrl.origin);
  const authorizationServer = `https://login.microsoftonline.com/${encodeURIComponent(authConfig.tenantId)}/v2.0`;
  const appIdUri = (process.env.ENTRA_APP_ID_URI?.trim() || `api://${authConfig.clientId}`).replace(/\/+$/, "");
  const scope = `${appIdUri}/${authConfig.scope}`;
  const allowedHosts = new Set([
    publicUrl.host.toLowerCase(),
    ...parseCsvEnv(process.env.MCP_ALLOWED_HOSTS).map((host) => host.toLowerCase()),
  ]);
  const allowedOrigins = parseCsvEnv(process.env.MCP_ALLOWED_ORIGINS);
  const sessions = new Map<string, RemoteSession>();

  const httpServer = createHttpServer(async (request, response) => {
    setCorsHeaders(request, response, allowedOrigins);
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const requestUrl = new URL(request.url ?? "/", publicUrl.origin);
    if (requestUrl.pathname === metadataPath || requestUrl.pathname === `${metadataPath}${endpointPath}`) {
      sendJson(response, 200, {
        resource: publicUrl.toString(),
        authorization_servers: [authorizationServer],
        scopes_supported: [scope],
        bearer_methods_supported: ["header"],
      });
      return;
    }

    if (!allowedHosts.has((request.headers.host ?? "").toLowerCase())) {
      sendJson(response, 403, { error: "invalid_host", error_description: "This host is not configured for the MCP server." });
      return;
    }

    if (requestUrl.pathname !== endpointPath) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    if (!bearerToken) {
      response.setHeader(
        "WWW-Authenticate",
        `Bearer resource_metadata="${metadataUrl.toString()}", scope="${scope}"`
      );
      sendJson(response, 401, { error: "invalid_token", error_description: "A valid Entra access token is required." });
      return;
    }

    let identity: DeveloperIdentity;
    try {
      identity = await verifyEntraRemoteAccessToken(bearerToken, authConfig);
    } catch (error) {
      response.setHeader(
        "WWW-Authenticate",
        `Bearer resource_metadata="${metadataUrl.toString()}", error="invalid_token"`
      );
      sendJson(response, 401, {
        error: "invalid_token",
        error_description: error instanceof Error ? error.message : "The Entra access token is invalid.",
      });
      return;
    }

    const sessionId = request.headers["mcp-session-id"];
    if (typeof sessionId === "string") {
      const session = sessions.get(sessionId);
      if (!session) {
        sendJson(response, 404, { error: "session_not_found" });
        return;
      }
      if (session.identity.objectId !== identity.objectId || session.identity.tenantId !== identity.tenantId) {
        sendJson(response, 403, { error: "session_user_mismatch" });
        return;
      }

      await handleRemoteRequest(session.transport, request, response, bearerToken);
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 400, { error: "missing_session_id" });
      return;
    }

    const mcpServer = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
      void mcpServer.close();
    };

    try {
      await mcpServer.connect(transport);
      await handleRemoteRequest(transport, request, response, bearerToken);
      if (transport.sessionId) {
        sessions.set(transport.sessionId, { server: mcpServer, transport, identity });
      }
    } catch (error) {
      console.error("Remote MCP request failed:", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "internal_error" });
      }
      await transport.close();
      await mcpServer.close();
    }
  });

  const port = Number.parseInt(process.env.MCP_PORT ?? "3000", 10);
  const host = process.env.MCP_HOST?.trim() || "0.0.0.0";
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, resolve);
  });
  console.error(`${label} listening at ${publicUrl.toString()}`);
}

async function handleRemoteRequest(
  transport: StreamableHTTPServerTransport,
  request: IncomingMessage,
  response: ServerResponse,
  userAssertion: string
): Promise<void> {
  try {
    await runWithEntraAssertion(userAssertion, () => transport.handleRequest(request, response));
  } catch (error) {
    console.error("Remote MCP session request failed:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "internal_error" });
    }
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  response.writeHead(statusCode, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse, allowedOrigins: string[]): void {
  const origin = request.headers.origin;
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    response.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Session-Id, Last-Event-ID");
  response.setHeader("Access-Control-Expose-Headers", "MCP-Session-Id, WWW-Authenticate");
}

function parseCsvEnv(value: string | undefined): string[] {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}
