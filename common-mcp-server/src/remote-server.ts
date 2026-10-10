import { createMcpServer, loadEnvironment, startRemoteServer } from "./common/server.js";
import { createConfluenceModule } from "./confluence/module.js";
import { createFigmaModule } from "./figma/module.js";
import { createJiraModule } from "./jira/module.js";
import { createSharePointModule } from "./sharepoint/module.js";
import { createBackstageModule } from "./backstage/module.js";

loadEnvironment();

const createServer = () =>
  createMcpServer({
    name: "common-mcp-server",
    version: "1.0.0",
    modules: [
      createFigmaModule(),
      createJiraModule(),
      createConfluenceModule(),
      createSharePointModule(),
      createBackstageModule(),
    ],
  });

startRemoteServer(createServer, "Common remote MCP server").catch((error) => {
  console.error(error);
  process.exit(1);
});