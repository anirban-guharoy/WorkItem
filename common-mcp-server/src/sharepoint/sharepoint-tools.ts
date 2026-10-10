import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { getCurrentEntraAssertion } from "../common/request-context.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { SharePointClient } from "./sharepoint-client.js";

const sharePointTools: Tool[] = [
  {
    name: "sharepoint_search",
    description: "Search SharePoint and OneDrive files the signed-in user can access, returning relevant excerpts and links",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text or keywords to search in accessible SharePoint and OneDrive content",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (1-50)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
];

function getClient(userAssertion: string): SharePointClient {
  const config = requireServiceEnv(
    ["ENTRA_TENANT_ID", "ENTRA_CLIENT_ID", "ENTRA_CLIENT_SECRET"],
    "SharePoint OBO authentication"
  );

  return new SharePointClient({
    tenantId: config.ENTRA_TENANT_ID,
    clientId: config.ENTRA_CLIENT_ID,
    clientSecret: config.ENTRA_CLIENT_SECRET,
    userAssertion,
  });
}

export function getSharePointTools(): Tool[] {
  return sharePointTools;
}

export async function handleSharePointTool(toolName: string, args: unknown): Promise<ToolResult> {
  if (toolName !== "sharepoint_search") {
    return failure(`Unknown SharePoint tool: ${toolName}`);
  }

  const argsObj = (args as Record<string, unknown>) || {};
  const query = typeof argsObj.query === "string" ? argsObj.query.trim() : "";
  const limit = argsObj.limit === undefined ? 10 : argsObj.limit;
  if (!query) {
    return failure("Error: query is required");
  }
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return failure("Error: limit must be an integer between 1 and 50");
  }

  const userAssertion = getCurrentEntraAssertion();
  if (!userAssertion) {
    return failure("SharePoint search requires a remote MCP request authenticated with an Entra user token.");
  }

  try {
    return success(await getClient(userAssertion).search(query, limit));
  } catch (error) {
    return failure(`SharePoint search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}