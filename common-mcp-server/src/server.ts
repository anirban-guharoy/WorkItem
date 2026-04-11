import { createMcpServer, loadEnvironment, startServer } from "./common/server.js";
import { createConfluenceModule } from "./confluence/module.js";
import { createFigmaModule } from "./figma/module.js";
import { createJiraModule } from "./jira/module.js";
import { createMongoDbModule } from "./mongodb/module.js";

loadEnvironment();

const server = createMcpServer({
  name: "common-mcp-server",
  version: "1.0.0",
  modules: [createFigmaModule(), createJiraModule(), createConfluenceModule(), createMongoDbModule()],
});

startServer(server, "Common MCP server").catch((error) => {
  console.error(error);
  process.exit(1);
});
