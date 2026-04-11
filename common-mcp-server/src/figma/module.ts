import { ToolModule } from "../common/mcp.js";
import { getFigmaTools, handleFigmaTool } from "./figma-tools.js";

export function createFigmaModule(): ToolModule {
  return {
    name: "figma",
    tools: getFigmaTools(),
    handleTool: handleFigmaTool,
  };
}