import { createMcpServer, loadEnvironment, startServer } from "../common/server.js";
import { createJiraModule } from "./module.js";

loadEnvironment();

const server = createMcpServer({
  name: "common-mcp-server-jira",
  version: "1.0.0",
  modules: [createJiraModule()],
});

startServer(server, "Jira MCP server").catch((error) => {
  console.error(error);
  process.exit(1);
});