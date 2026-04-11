import { Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolModule = {
  name: string;
  tools: Tool[];
  handleTool: (toolName: string, args: unknown) => Promise<ToolResult>;
};

export function success(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function failure(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function unknownTool(toolName: string): ToolResult {
  return failure(`Unknown tool: ${toolName}`);
}