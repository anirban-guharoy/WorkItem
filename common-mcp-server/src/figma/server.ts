import { createMcpServer, loadEnvironment, startServer } from "../common/server.js";
import { createFigmaModule } from "./module.js";

loadEnvironment();

const server = createMcpServer({
  name: "common-mcp-server-figma",
  version: "1.0.0",
  modules: [createFigmaModule()],
});

startServer(server, "Figma MCP server").catch((error) => {
  console.error(error);
  process.exit(1);
});