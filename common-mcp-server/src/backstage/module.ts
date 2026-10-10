import { ToolModule } from "../common/mcp.js";
import { getBackstageTools, handleBackstageTool } from "./backstage-tools.js";

export function createBackstageModule(): ToolModule {
  return {
    name: "backstage",
    tools: getBackstageTools(),
    handleTool: handleBackstageTool,
  };
}
