import { ToolModule } from "../common/mcp.js";
import { getConfluenceTools, handleConfluenceTool } from "./confluence-tools.js";

export function createConfluenceModule(): ToolModule {
	return {
		name: "confluence",
		tools: getConfluenceTools(),
		handleTool: handleConfluenceTool,
	};
}