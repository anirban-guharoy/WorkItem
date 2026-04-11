import { ToolModule } from "../common/mcp.js";
import { getJiraTools, handleJiraTool } from "./jira-tools.js";

export function createJiraModule(): ToolModule {
  return {
    name: "jira",
    tools: getJiraTools(),
    handleTool: handleJiraTool,
  };
}