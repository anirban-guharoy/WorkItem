import { createMcpServer, loadEnvironment, startServer } from "../common/server.js";
import { createConfluenceModule } from "./module.js";

loadEnvironment();

const server = createMcpServer({
	name: "common-mcp-server-confluence",
	version: "1.0.0",
	modules: [createConfluenceModule()],
});

startServer(server, "Confluence MCP server").catch((error) => {
	console.error(error);
	process.exit(1);
});