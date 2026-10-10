import { ToolModule } from "../common/mcp.js";
import { getSharePointTools, handleSharePointTool } from "./sharepoint-tools.js";

export function createSharePointModule(): ToolModule {
  return {
    name: "sharepoint",
    tools: getSharePointTools(),
    handleTool: handleSharePointTool,
  };
}