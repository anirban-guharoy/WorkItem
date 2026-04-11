import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ToolModule, unknownTool } from "./mcp.js";

type ServerOptions = {
  name: string;
  version: string;
  modules: ToolModule[];
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

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

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

export async function startServer(server: Server, label: string): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${label} running on stdio`);
}