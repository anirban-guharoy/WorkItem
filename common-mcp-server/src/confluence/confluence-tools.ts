import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { ConfluenceClient } from "./confluence-client.js";

const confluenceTools: Tool[] = [
	{
		name: "confluence_search_pages",
		description: "Search Confluence pages by text query",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Full-text query to search for in Confluence pages",
				},
				limit: {
					type: "number",
					description: "Maximum number of pages to return",
					default: 25,
				},
				space_key: {
					type: "string",
					description: "Optional Confluence space key to constrain the search",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "confluence_get_page",
		description: "Get a Confluence page by id including storage body content",
		inputSchema: {
			type: "object",
			properties: {
				page_id: {
					type: "string",
					description: "Confluence page id",
				},
			},
			required: ["page_id"],
		},
	},
	{
		name: "confluence_create_page",
		description: "Create a Confluence page in a space",
		inputSchema: {
			type: "object",
			properties: {
				space_key: {
					type: "string",
					description: "Confluence space key where the page should be created",
				},
				title: {
					type: "string",
					description: "Page title",
				},
				body: {
					type: "string",
					description: "Page body in Confluence storage format",
				},
				parent_page_id: {
					type: "string",
					description: "Optional parent page id",
				},
			},
			required: ["space_key", "title", "body"],
		},
	},
	{
		name: "confluence_update_page",
		description: "Update an existing Confluence page",
		inputSchema: {
			type: "object",
			properties: {
				page_id: {
					type: "string",
					description: "Confluence page id",
				},
				title: {
					type: "string",
					description: "Updated page title",
				},
				body: {
					type: "string",
					description: "Updated page body in Confluence storage format",
				},
				version_number: {
					type: "number",
					description: "Optional next Confluence version number for the page; if omitted, the current version is fetched automatically",
				},
			},
			required: ["page_id", "title", "body"],
		},
	},
];

function getClient(): ConfluenceClient {
	const config = requireServiceEnv(
		["CONFLUENCE_BASE_URL", "CONFLUENCE_EMAIL", "CONFLUENCE_API_TOKEN"],
		"Confluence"
	);

	return new ConfluenceClient(config.CONFLUENCE_BASE_URL, config.CONFLUENCE_EMAIL, config.CONFLUENCE_API_TOKEN);
}

export function getConfluenceTools(): Tool[] {
	return confluenceTools;
}

export async function handleConfluenceTool(toolName: string, args: unknown): Promise<ToolResult> {
	try {
		const client = getClient();
		const argsObj = (args as Record<string, unknown>) || {};

		switch (toolName) {
			case "confluence_search_pages": {
				const query = argsObj.query as string | undefined;
				const limit = (argsObj.limit as number | undefined) || 25;
				const spaceKey = argsObj.space_key as string | undefined;

				if (!query) {
					return failure("Error: query is required");
				}

				return success(await client.searchPages(query, limit, spaceKey));
			}
			case "confluence_get_page": {
				const pageId = argsObj.page_id as string | undefined;

				if (!pageId) {
					return failure("Error: page_id is required");
				}

				return success(await client.getPage(pageId));
			}
			case "confluence_create_page": {
				const spaceKey = argsObj.space_key as string | undefined;
				const title = argsObj.title as string | undefined;
				const body = argsObj.body as string | undefined;
				const parentPageId = argsObj.parent_page_id as string | undefined;

				if (!spaceKey || !title || !body) {
					return failure("Error: space_key, title, and body are required");
				}

				return success(await client.createPage(spaceKey, title, body, parentPageId));
			}
			case "confluence_update_page": {
				const pageId = argsObj.page_id as string | undefined;
				const title = argsObj.title as string | undefined;
				const body = argsObj.body as string | undefined;
				const versionNumber = argsObj.version_number as number | undefined;

				if (!pageId || !title || !body) {
					return failure("Error: page_id, title, and body are required");
				}

				return success(await client.updatePage(pageId, title, body, versionNumber));
			}
			default:
				return failure(`Unknown Confluence tool: ${toolName}`);
		}
	} catch (error) {
		return failure(`Error: ${error instanceof Error ? error.message : String(error)}`);
	}
}