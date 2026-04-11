import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { JiraClient } from "./jira-client.js";

const jiraTools: Tool[] = [
	{
		name: "jira_get_issues",
		description: "Get issues from a Jira project",
		inputSchema: {
			type: "object",
			properties: {
				project_key: {
					type: "string",
					description: "The Jira project key",
				},
				max_results: {
					type: "number",
					description: "Maximum number of issues to return",
					default: 50,
				},
			},
			required: ["project_key"],
		},
	},
	{
		name: "jira_create_issue",
		description: "Create a new Jira issue",
		inputSchema: {
			type: "object",
			properties: {
				project_key: {
					type: "string",
					description: "The Jira project key",
				},
				issue_type: {
					type: "string",
					description: "The type of issue (e.g., Bug, Task, Story)",
				},
				summary: {
					type: "string",
					description: "A brief summary of the issue",
				},
				description: {
					type: "string",
					description: "A detailed description of the issue",
				},
			},
			required: ["project_key", "issue_type", "summary"],
		},
	},
	{
		name: "jira_get_issue",
		description: "Get details of a specific Jira issue",
		inputSchema: {
			type: "object",
			properties: {
				issue_key: {
					type: "string",
					description: "The Jira issue key (e.g., PROJ-1)",
				},
			},
			required: ["issue_key"],
		},
	},
];

function getClient(): JiraClient {
	const config = requireServiceEnv(["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"], "Jira");
	return new JiraClient(config.JIRA_BASE_URL, config.JIRA_EMAIL, config.JIRA_API_TOKEN);
}

export function getJiraTools(): Tool[] {
	return jiraTools;
}

export async function handleJiraTool(toolName: string, args: unknown): Promise<ToolResult> {
	try {
		const client = getClient();
		const argsObj = (args as Record<string, unknown>) || {};

		switch (toolName) {
			case "jira_get_issues": {
				const projectKey = argsObj.project_key as string | undefined;
				const maxResults = (argsObj.max_results as number | undefined) || 50;
				if (!projectKey) {
					return failure("Error: project_key is required");
				}

				return success(await client.getIssues(projectKey, maxResults));
			}
			case "jira_create_issue": {
				const projectKey = argsObj.project_key as string | undefined;
				const issueType = argsObj.issue_type as string | undefined;
				const summary = argsObj.summary as string | undefined;
				const description = argsObj.description as string | undefined;
				if (!projectKey || !issueType || !summary) {
					return failure("Error: project_key, issue_type, and summary are required");
				}

				return success(await client.createIssue(projectKey, issueType, summary, description));
			}
			case "jira_get_issue": {
				const issueKey = argsObj.issue_key as string | undefined;
				if (!issueKey) {
					return failure("Error: issue_key is required");
				}

				return success(await client.getIssue(issueKey));
			}
			default:
				return failure(`Unknown Jira tool: ${toolName}`);
		}
	} catch (error) {
		return failure(`Error: ${error instanceof Error ? error.message : String(error)}`);
	}
}
