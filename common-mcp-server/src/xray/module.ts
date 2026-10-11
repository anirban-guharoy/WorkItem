import { ToolModule } from "../common/mcp.js";
import { getXrayTools, handleXrayTool } from "./xray-tools.js";

export function createXrayModule(): ToolModule {
  return {
    name: "xray",
    tools: getXrayTools(),
    handleTool: handleXrayTool,
  };
}
