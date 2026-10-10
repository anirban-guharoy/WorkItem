import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { BackstageClient } from "./backstage-client.js";

const backstageTools: Tool[] = [
  {
    name: "backstage_catalog_search",
    description:
      "Search Backstage catalog entities with a Backstage catalog filter, such as kind=component,metadata.name=petstore. Filter conditions use Backstage's documented equality and existence syntax.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Backstage catalog filter expression, for example kind=component,metadata.namespace=default",
        },
        limit: {
          type: "number",
          description: "Maximum number of catalog entities to return (1-100)",
          default: 20,
        },
      },
      required: ["filter"],
    },
  },
  {
    name: "backstage_catalog_get_entity",
    description: "Get one Backstage catalog entity by kind, namespace, and name.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description: "Entity kind, for example Component, API, or Resource",
        },
        namespace: {
          type: "string",
          description: "Entity namespace (defaults to default)",
          default: "default",
        },
        name: {
          type: "string",
          description: "Entity name",
        },
      },
      required: ["kind", "name"],
    },
  },
];

let client: BackstageClient | undefined;

function getClient(): BackstageClient {
  if (client) {
    return client;
  }

  const config = requireServiceEnv(
    ["BACKSTAGE_BASE_URL", "BACKSTAGE_API_SCOPE"],
    "Backstage app authentication"
  );
  client = new BackstageClient(config.BACKSTAGE_BASE_URL, config.BACKSTAGE_API_SCOPE);
  return client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBackstageTools(): Tool[] {
  return backstageTools;
}

export async function handleBackstageTool(toolName: string, args: unknown): Promise<ToolResult> {
  if (!isRecord(args)) {
    return failure("Error: tool arguments must be an object");
  }

  switch (toolName) {
    case "backstage_catalog_search": {
      const filter = typeof args.filter === "string" ? args.filter.trim() : "";
      const limit = args.limit === undefined ? 20 : args.limit;
      if (!filter) {
        return failure("Error: filter is required");
      }
      if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return failure("Error: limit must be an integer between 1 and 100");
      }

      try {
        return success(await getClient().searchEntities(filter, limit));
      } catch (error) {
        return failure(`Backstage catalog search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    case "backstage_catalog_get_entity": {
      const kind = typeof args.kind === "string" ? args.kind.trim() : "";
      const namespace = args.namespace === undefined ? "default" : args.namespace;
      const name = typeof args.name === "string" ? args.name.trim() : "";
      if (!kind || !name) {
        return failure("Error: kind and name are required");
      }
      if (typeof namespace !== "string" || !namespace.trim()) {
        return failure("Error: namespace must be a non-empty string");
      }

      try {
        return success(await getClient().getEntity(kind, namespace.trim(), name));
      } catch (error) {
        return failure(`Backstage catalog entity lookup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    default:
      return failure(`Unknown Backstage tool: ${toolName}`);
  }
}
