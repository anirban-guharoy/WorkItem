# common-mcp-server

`common-mcp-server` is a Model Context Protocol (MCP) server organized around four modules, `figma`, `jira`, `confluence`, and `mongodb`. You can run them together through the shared server or independently through dedicated entrypoints.

## Prerequisites

- Node.js 18+
- npm
- Figma account with API token access
- Jira account with API token access if Jira tools are needed
- Confluence account with API token access if Confluence tools are needed
- MongoDB deployment with vector search support if MongoDB vector tools are needed
- VS Code with Github Copilot Chat extension

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Set up environment variables (see SETUP.md)

## Running

```bash
npm start
```

Domain-specific entrypoints are also available:

```bash
npm run start:figma
npm run start:jira
```

## Configuration

Configure this MCP server in VS Code settings for use with Github Copilot Chat. See [SETUP.md](./SETUP.md) for detailed instructions.

For full documentation, see SETUP.md.

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `FIGMA_API_TOKEN` | Your Figma personal access token | Required for Figma tools |
| `JIRA_BASE_URL` | Your Jira instance base URL | Required for Jira tools |
| `JIRA_EMAIL` | Your Jira account email | Required for Jira tools |
| `JIRA_API_TOKEN` | Your Jira API token | Required for Jira tools |
| `CONFLUENCE_BASE_URL` | Your Confluence site or wiki base URL | Required for Confluence tools |
| `CONFLUENCE_EMAIL` | Your Confluence account email | Required for Confluence tools |
| `CONFLUENCE_API_TOKEN` | Your Confluence API token | Required for Confluence tools |
| `MONGODB_URI` | MongoDB connection string | Required for MongoDB vector tools |
| `MONGODB_DATABASE` | MongoDB database name | Required for MongoDB vector tools |
| `MONGODB_COLLECTION` | MongoDB collection name | Required for MongoDB vector tools |
| `MONGODB_VECTOR_INDEX` | MongoDB vector search index name | Required for MongoDB vector tools |

## API Tools

### figma_get_files
List Figma files from a project or team.

**Usage:**
```
Tool: figma_get_files
Arguments:
  - project_id: Optional Figma project ID to list files from
  - team_id: Optional Figma team ID to list project files from
```

### figma_get_file
Get detailed information about a specific Figma file.

**Usage:**
```
Tool: figma_get_file
Arguments:
  - file_key: The unique file identifier from the Figma URL
```

### figma_get_file_nodes
Retrieve specific nodes (design elements) from a file.

**Usage:**
```
Tool: figma_get_file_nodes
Arguments:
  - file_key: The Figma file identifier
  - node_ids: Array of node IDs to fetch
```

### figma_get_component
Get component details from a Figma file.

**Usage:**
```
Tool: figma_get_component
Arguments:
  - file_key: The Figma file identifier
  - component_id: The component ID
```

### figma_extract_design_tokens
Extract design tokens (colors, typography, spacing) from a Figma file.

**Usage:**
```
Tool: figma_extract_design_tokens
Arguments:
  - file_key: The Figma file identifier
```

### figma_map_tokens_to_angular
Map Figma design tokens to Angular component styles and properties.

**Usage:**
```
Tool: figma_map_tokens_to_angular
Arguments:
  - tokens: Design tokens object from figma_extract_design_tokens
  - component_name: Name for the generated Angular component
```

### jira_get_issues
Get issues from a Jira project.

**Usage:**
```
Tool: jira_get_issues
Arguments:
  - project_key: The Jira project key
  - max_results: Maximum number of issues to return (optional)
```

### jira_create_issue
Create a new Jira issue.

**Usage:**
```
Tool: jira_create_issue
Arguments:
  - project_key: The Jira project key
  - issue_type: The type of issue (e.g., Bug, Task, Story)
  - summary: A brief summary of the issue
  - description: A detailed description of the issue
```

### jira_get_issue
Get details for a specific Jira issue.

**Usage:**
```
Tool: jira_get_issue
Arguments:
  - issue_key: The Jira issue key (e.g., PROJ-1)
```

### confluence_search_pages
Search Confluence pages by query text.

**Usage:**
```
Tool: confluence_search_pages
Arguments:
  - query: Text to search for
  - limit: Maximum number of pages to return (optional)
  - space_key: Optional space key filter
```

### confluence_get_page
Get a Confluence page by id.

**Usage:**
```
Tool: confluence_get_page
Arguments:
  - page_id: The Confluence page id
```

### confluence_create_page
Create a Confluence page in a space.

**Usage:**
```
Tool: confluence_create_page
Arguments:
  - space_key: The Confluence space key
  - title: Page title
  - body: Page body in Confluence storage format
  - parent_page_id: Optional parent page id
```

### confluence_update_page
Update an existing Confluence page.

**Usage:**
```
Tool: confluence_update_page
Arguments:
  - page_id: The Confluence page id
  - title: Updated page title
  - body: Updated page body in Confluence storage format
  - version_number: Optional next Confluence version number; if omitted, the current version is fetched automatically
```

### mongodb_vector_upsert
Upsert a vector document into MongoDB.

**Usage:**
```
Tool: mongodb_vector_upsert
Arguments:
  - document_id: Stable id for the vector document
  - content: Optional text content stored with the vector
  - embedding: Numeric embedding array
  - metadata: Optional metadata object
```

### mongodb_vector_search
Run a vector similarity search against MongoDB.

**Usage:**
```
Tool: mongodb_vector_search
Arguments:
  - query_vector: Numeric embedding array to search with
  - limit: Maximum results to return (optional)
  - num_candidates: Candidate pool size (optional)
  - filter: Optional filter document
```

### mongodb_vector_get_document
Get one MongoDB vector document by id.

**Usage:**
```
Tool: mongodb_vector_get_document
Arguments:
  - document_id: Vector document id
```

### mongodb_vector_delete_document
Delete one MongoDB vector document by id.

**Usage:**
```
Tool: mongodb_vector_delete_document
Arguments:
  - document_id: Vector document id
```

## Scripts

### Server entrypoints

- `npm start`: Run the shared server with Figma, Jira, Confluence, and MongoDB modules.
- `npm run start:mongodb`: Run only the MongoDB vector module.
- `npm run start:confluence`: Run only the Confluence module.
- `npm run start:figma`: Run only the Figma module.
- `npm run start:jira`: Run only the Jira module.
- `npm run dev:mongodb`: Build and run only the MongoDB vector module.
- `npm run dev:confluence`: Build and run only the Confluence module.
- `npm run dev:figma`: Build and run only the Figma module.
- `npm run dev:jira`: Build and run only the Jira module.
- `npm run test:figma-tokens`: Run the mock Figma token-mapping utility.
- `npm run jira:get-issues`: Fetch recent Jira issues with the standalone Jira helper.
- `npm run jira:get-issue`: Fetch one Jira issue with the standalone Jira helper.
- `npm run jira:create-issue`: Create a Jira issue with the standalone Jira helper.

### figma/map-tokens-to-angular.mjs
Standalone script to extract design tokens from Figma and generate a complete Angular component.

**Usage:**
```bash
node figma/map-tokens-to-angular.mjs
```

This script will:
- Extract design tokens from your Figma file
- Generate CSS custom properties (variables)
- Create an Angular component with token-based styling
- Output files to `generated-component/` directory

Additional standalone Figma utilities are grouped under `figma/`:
- `figma/explore-figma.mjs`
- `figma/generate-component.mjs`
- `figma/test-token-mapper.mjs`
- `figma/update-component-from-figma.mjs`

Standalone Jira utilities are grouped under `jira/`:
- `jira/get-issues.mjs`
- `jira/get-issue.mjs`
- `jira/create-issue.mjs`

Standalone Confluence utilities are grouped under `confluence/`:
- `confluence/search-pages.mjs`
- `confluence/get-page.mjs`
- `confluence/create-page.mjs`
- `confluence/update-page.mjs`

## Configuration

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `FIGMA_API_TOKEN` | Your Figma personal access token | Required for Figma tools |
| `JIRA_BASE_URL` | Your Jira instance base URL | Required for Jira tools |
| `JIRA_EMAIL` | Your Jira account email | Required for Jira tools |
| `JIRA_API_TOKEN` | Your Jira API token | Required for Jira tools |
| `CONFLUENCE_BASE_URL` | Your Confluence site or wiki base URL | Required for Confluence tools |
| `CONFLUENCE_EMAIL` | Your Confluence account email | Required for Confluence tools |
| `CONFLUENCE_API_TOKEN` | Your Confluence API token | Required for Confluence tools |
| `MONGODB_URI` | MongoDB connection string | Required for MongoDB vector tools |
| `MONGODB_DATABASE` | MongoDB database name | Required for MongoDB vector tools |
| `MONGODB_COLLECTION` | MongoDB collection name | Required for MongoDB vector tools |
| `MONGODB_VECTOR_INDEX` | MongoDB vector search index name | Required for MongoDB vector tools |

## Troubleshooting

**"FIGMA_API_TOKEN is not set"**
- Make sure you've created a `.env` file with your API token
- Verify the token is valid and hasn't expired

**"Figma API error: 401"**
- Your API token is invalid or expired
- Generate a new token from your Figma account settings

**"Figma API error: 404"**
- The file_key or node_id doesn't exist
- Check that you're using correct identifiers

## Development

To add new tools or features:

1. Add the tool to the relevant domain module under `src/figma/`, `src/jira/`, `src/confluence/`, or `src/mongodb/`
2. Keep cross-cutting server wiring in `src/common/server.ts`
3. Expose the module through `src/figma/module.ts` or `src/jira/module.ts`
4. Rebuild with `npm run build`

## Architecture

- **Shared server builder**: `src/common/server.ts` composes any set of tool modules into an MCP server.
- **Figma module**: `src/figma/` contains the Figma client, tools, and Figma-only entrypoint, while `figma/` contains standalone Figma utilities.
- **Jira module**: `src/jira/` contains the Jira client, tools, and Jira-only entrypoint, while `jira/` contains standalone Jira utilities.
- **Confluence module**: `src/confluence/` contains the Confluence client, tools, and Confluence-only entrypoint, while `confluence/` contains standalone Confluence utilities.
- **MongoDB module**: `src/mongodb/` contains the MongoDB vector client, tools, and MongoDB-only entrypoint.
- **Combined server**: `src/server.ts` composes all four modules into the shared server.

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Figma Developer API](https://www.figma.com/developers/api)
- [Figma API Reference](https://www.figma.com/developers/api)

## License

MIT
