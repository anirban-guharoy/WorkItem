import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { unknownTool } from "./common/mcp.js";
import { getFigmaTools, handleFigmaTool } from "./figma/figma-tools.js";
import { getJiraTools, handleJiraTool } from "./jira/jira-tools.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(currentDir, "../.env") });

const figmaTools = getFigmaTools();
const jiraTools = getJiraTools();

const server = new Server(
  {
    name: "common-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...figmaTools, ...jiraTools],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  if (figmaTools.some((tool) => tool.name === toolName)) {
    return handleFigmaTool(toolName, request.params.arguments);
  }

  if (jiraTools.some((tool) => tool.name === toolName)) {
    return handleJiraTool(toolName, request.params.arguments);
  }

  return unknownTool(toolName);
});

async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Common MCP server running on stdio");
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
