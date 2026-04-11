import { ToolModule } from "../common/mcp.js";
import { getMongoDbTools, handleMongoDbTool } from "./mongodb-tools.js";

export function createMongoDbModule(): ToolModule {
	return {
		name: "mongodb",
		tools: getMongoDbTools(),
		handleTool: handleMongoDbTool,
	};
}