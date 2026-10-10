# common-mcp-server

`common-mcp-server` is a Model Context Protocol (MCP) server organized around four modules, `figma`, `jira`, `confluence`, and `mongodb`. You can run them together through the shared server or independently through dedicated entrypoints.

## Prerequisites

- Node.js 22+
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
| `ENTRA_AUTH_ENABLED` | Enable Azure Entra ID developer authentication (`true`/`false`) | Optional (default `false`) |
| `ENTRA_ACCESS_TOKEN` | Preferred native Entra JWT used to authorize MCP access | Recommended when `ENTRA_AUTH_ENABLED=true` |
| `AZURE_ACCESS_TOKEN` | Alternate native Entra JWT environment variable | Optional |
| `ENTRA_ID_TOKEN` | Alternate native Entra JWT environment variable | Optional |
| `ENTRA_TENANT_ID` | Expected Azure Entra tenant ID and device-code fallback tenant | Optional, but recommended when `ENTRA_AUTH_ENABLED=true` |
| `ENTRA_CLIENT_ID` | Public client application (App registration) ID for device-code fallback | Required only when no native token env var is supplied |
| `ENTRA_SCOPES` | Optional comma-separated OAuth scopes for device-code fallback | Optional (defaults to `https://graph.microsoft.com/User.Read`) |
| `ENTRA_ALLOWED_USER_EMAILS` | Optional comma-separated allow-list of developer UPN/email values | Optional |
| `ENTRA_ALLOWED_TOKEN_AUDIENCES` | Optional comma-separated allow-list of Entra token audiences (`aud`) | Optional |
| `MCP_PUBLIC_URL` | Public HTTPS URL of the remote MCP endpoint, including its path (for example `https://mcp.example.com/mcp`) | Required for remote mode |
| `MCP_HOST` / `MCP_PORT` | Network interface and port for the remote HTTP listener | Optional (defaults `0.0.0.0:3000`) |
| `MCP_ALLOWED_HOSTS` | Additional accepted HTTP Host values | Optional (public URL host is always accepted) |
| `MCP_ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS; `*` permits all | Optional |
| `ENTRA_APP_ID_URI` | Identifier URI of the Entra-protected API | Optional (defaults to `api://ENTRA_CLIENT_ID`) |
| `ENTRA_API_SCOPE` | Required delegated API scope in the token's `scp` claim | Optional (defaults to `access_as_user`) |

## Azure Entra ID Authentication

When `ENTRA_AUTH_ENABLED=true`, the server requires a valid Azure Entra ID token before listing or invoking MCP tools.

- The preferred path is to pass a native Entra JWT through `ENTRA_ACCESS_TOKEN`, `AZURE_ACCESS_TOKEN`, or `ENTRA_ID_TOKEN`.
- Supplied tokens are validated locally for expiry, optional tenant match, optional audience match, and optional user allow-list.
- If no native token env var is supplied, the server falls back to device-code flow and prints sign-in instructions to stderr.
- Device-code access is refreshed as needed while the server is running.
- If `ENTRA_ALLOWED_USER_EMAILS` is set, only those users can use the server.

### Remote MCP for VS Code and IntelliJ

Remote mode accepts Entra delegated access tokens from the IDE; it does not start a device-code flow or ask the user to sign in again. The IDE must obtain an access token for this API using the user's existing Entra session. Silent SSO depends on the IDE's Entra account and OAuth client configuration; the server cannot guarantee that a particular IDE will never display its own consent or account-selection prompt.

1. In the Entra app registration for this MCP API, expose a delegated scope named `access_as_user` (or configure `ENTRA_API_SCOPE` to the scope name you expose). Use the app registration's client ID as `ENTRA_CLIENT_ID`; configure the access-token version to v2.
2. Grant the VS Code and IntelliJ OAuth clients permission to that delegated scope and grant admin consent if required by your tenant. Configure their authorization server as `https://login.microsoftonline.com/<tenant-id>/v2.0` and request `api://<ENTRA_CLIENT_ID>/access_as_user`.
3. Set `ENTRA_AUTH_ENABLED=true`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `MCP_PUBLIC_URL` on the server. Keep TLS enabled at the server or trusted reverse proxy.
4. Start the remote endpoint with `npm run start:remote`. The endpoint serves Streamable HTTP at `MCP_PUBLIC_URL` and OAuth protected-resource metadata at `/.well-known/oauth-protected-resource`.
5. Configure each IDE's remote MCP client to use the `MCP_PUBLIC_URL` endpoint and the Entra OAuth authorization-code flow with PKCE. The IDE sends the resulting access token as a bearer token; each request is validated, and an MCP session cannot be reused by a different Entra user.

Example server configuration:

```env
ENTRA_AUTH_ENABLED=true
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-mcp-api-app-id
ENTRA_APP_ID_URI=api://your-mcp-api-app-id
ENTRA_API_SCOPE=access_as_user
MCP_PUBLIC_URL=https://mcp.example.com/mcp
MCP_HOST=0.0.0.0
MCP_PORT=3000
```

The existing `npm start` and module-specific `npm run start:*` commands continue to use stdio for local integrations.

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
