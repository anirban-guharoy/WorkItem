import { createMcpServer, loadEnvironment, startServer } from "../common/server.js";
import { createMongoDbModule } from "./module.js";

loadEnvironment();

const server = createMcpServer({
	name: "common-mcp-server-mongodb",
	version: "1.0.0",
	modules: [createMongoDbModule()],
});

startServer(server, "MongoDB MCP server").catch((error) => {
	console.error(error);
	process.exit(1);
});