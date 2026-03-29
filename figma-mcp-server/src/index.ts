import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

class FigmaServer {
  private server: Server;
  private figmaApiToken: string;
  private figmaApiBaseUrl: string = "https://api.figma.com/v1";

  constructor() {
    this.figmaApiToken = process.env.FIGMA_API_TOKEN || "";

    this.server = new Server(
      {
        name: "figma-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "get_files":
            return await this.getFiles();
          case "get_file":
            return await this.getFile(request.params.arguments);
          case "get_file_nodes":
            return await this.getFileNodes(request.params.arguments);
          case "get_component":
            return await this.getComponent(request.params.arguments);
          default:
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Unknown tool: ${request.params.name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: "get_files",
        description: "List all Figma files accessible to the authenticated user",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_file",
        description:
          "Get detailed information about a specific Figma file including its structure",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
          },
          required: ["file_key"],
        },
      },
      {
        name: "get_file_nodes",
        description: "Get specific nodes (elements) from a Figma file",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
            node_ids: {
              type: "array",
              description: "Array of node IDs to retrieve",
              items: { type: "string" },
            },
          },
          required: ["file_key", "node_ids"],
        },
      },
      {
        name: "get_component",
        description: "Get component details from a Figma file",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
            component_id: {
              type: "string",
              description: "The unique identifier for the component",
            },
          },
          required: ["file_key", "component_id"],
        },
      },
    ];
  }

  private async getFiles() {
    if (!this.figmaApiToken) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: FIGMA_API_TOKEN environment variable is not set",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await fetch(`${this.figmaApiBaseUrl}/files`, {
        headers: {
          "X-Figma-Token": this.figmaApiToken,
        },
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getFile(args: unknown) {
    const fileKey = (args as Record<string, unknown>).file_key as string;

    if (!fileKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key parameter is required",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await fetch(`${this.figmaApiBaseUrl}/files/${fileKey}`, {
        headers: {
          "X-Figma-Token": this.figmaApiToken,
        },
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getFileNodes(args: unknown) {
    const argsObj = args as Record<string, unknown>;
    const fileKey = argsObj.file_key as string;
    const nodeIds = argsObj.node_ids as string[];

    if (!fileKey || !nodeIds || nodeIds.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key and node_ids are required",
          },
        ],
        isError: true,
      };
    }

    try {
      const nodeIdsParam = nodeIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
      const response = await fetch(
        `${this.figmaApiBaseUrl}/files/${fileKey}/nodes?${nodeIdsParam}`,
        {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        }
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching nodes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getComponent(args: unknown) {
    const argsObj = args as Record<string, unknown>;
    const fileKey = argsObj.file_key as string;
    const componentId = argsObj.component_id as string;

    if (!fileKey || !componentId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key and component_id are required",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await fetch(
        `${this.figmaApiBaseUrl}/files/${fileKey}/nodes?ids=${encodeURIComponent(componentId)}`,
        {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        }
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching component: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Figma MCP server running on stdio");
  }
}

const server = new FigmaServer();
server.start().catch(console.error);
