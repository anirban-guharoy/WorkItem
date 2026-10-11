# common-mcp-server

`common-mcp-server` is a Model Context Protocol (MCP) server organized around modules for `figma`, `jira`, `confluence`, `xray`, SharePoint context search, and the Backstage software catalog. IDE users connect to the authenticated remote server and sign in individually with Entra ID. Figma, Jira, Confluence, and Xray calls use server-side service-account credentials; SharePoint uses the signed-in user's delegated Entra identity through On-Behalf-Of (OBO); Backstage calls use the MCP host's Entra application identity.

## Prerequisites

- Node.js 22+
- npm
- Figma service account with API token access
- Jira service account with API token access if Jira tools are needed
- Confluence service account with API token access if Confluence tools are needed
- Xray Cloud API key (client ID and secret) if Xray tools are needed
- Microsoft 365 tenant with SharePoint access if remote SharePoint search is needed
- Remote Backstage Catalog API protected by Entra ID if Backstage tools are needed
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

Configure the IDE to connect to the deployed `MCP_PUBLIC_URL` using Entra authorization-code flow with PKCE.

## Configuration

Configure the IDE to connect to the deployed remote MCP URL and authenticate using Entra ID. See [SETUP.md](./SETUP.md) for detailed instructions.

For full documentation, see SETUP.md.

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `FIGMA_API_TOKEN` | Server-side Figma service-account token | Required for Figma tools |
| `JIRA_BASE_URL` | Your Jira instance base URL | Required for Jira tools |
| `JIRA_EMAIL` | Jira service-account email | Required for Jira tools |
| `JIRA_API_TOKEN` | Server-side Jira service-account API token | Required for Jira tools |
| `CONFLUENCE_BASE_URL` | Your Confluence site or wiki base URL | Required for Confluence tools |
| `CONFLUENCE_EMAIL` | Confluence service-account email | Required for Confluence tools |
| `CONFLUENCE_API_TOKEN` | Server-side Confluence service-account API token | Required for Confluence tools |
| `XRAY_CLIENT_ID` | Xray Cloud API key client ID | Required for Xray tools |
| `XRAY_CLIENT_SECRET` | Server-side Xray Cloud API key client secret | Required for Xray tools |
| `XRAY_BASE_URL` | Xray Cloud host; defaults to `https://xray.cloud.getxray.app` (regional: `us.`, `eu.`, `au.` prefixes) | Optional |
| `BACKSTAGE_BASE_URL` | Base URL of the remote Backstage instance | Required for Backstage tools |
| `BACKSTAGE_API_SCOPE` | Entra application scope for the Backstage API (for example `api://<app-id>/.default`) | Required for Backstage tools |
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_CLIENT_SECRET` | Standard Azure Identity credentials for local development, or `AZURE_CLIENT_ID` to select a user-assigned managed identity | Optional |
| `ENTRA_AUTH_ENABLED` | Require Entra authentication for the remote MCP endpoint; must be `true` | Required for remote mode |
| `ENTRA_TENANT_ID` | Entra tenant that issues IDE user tokens | Required for remote mode |
| `ENTRA_CLIENT_ID` | Client ID of the MCP API app registration; also used for SharePoint OBO | Required for remote mode |
| `ENTRA_CLIENT_SECRET` | Server-only confidential credential used for SharePoint OBO | Required for SharePoint search |
| `ENTRA_ALLOWED_USER_EMAILS` | Optional comma-separated allow-list of user UPN/email values | Optional |
| `MCP_PUBLIC_URL` | Public HTTPS URL of the remote MCP endpoint, including its path (for example `https://mcp.example.com/mcp`) | Required for remote mode |
| `MCP_HOST` / `MCP_PORT` | Network interface and port for the remote HTTP listener | Optional (defaults `0.0.0.0:3000`) |
| `MCP_ALLOWED_HOSTS` | Additional accepted HTTP Host values | Optional (public URL host is always accepted) |
| `MCP_ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS; `*` permits all | Optional |
| `ENTRA_APP_ID_URI` | Identifier URI of the Entra-protected API, used in OAuth metadata | Optional (defaults to `api://ENTRA_CLIENT_ID`) |
| `ENTRA_API_SCOPE` | Required delegated API scope in the token's `scp` claim | Optional (defaults to `access_as_user`) |

## Azure Entra ID Authentication

In remote mode, the IDE authenticates each user with Entra ID and sends that user's access token to the MCP endpoint. The server validates the token signature, issuer, audience, tenant, delegated API scope, expiry, and optional user allow-list on every request. Each MCP session is bound to its creating Entra user; a different user cannot reuse it. The IDE's OAuth client must be permitted to request the exposed API scope.

The Jira, Confluence, Xray, and Figma credentials are service-account credentials configured only on the server. They are shared by authenticated MCP users, so grant those service accounts only the permissions required for the tools. Never put the service-account credentials or `ENTRA_CLIENT_SECRET` in IDE configuration.

### Backstage app authentication

`backstage_catalog_search` and `backstage_catalog_get_entity` call the remote Backstage Catalog API with an app-only Entra access token. The client uses Azure Identity `DefaultAzureCredential`, which selects the MCP host's managed identity in Azure and supports standard Azure credentials for local development. Configure `BACKSTAGE_BASE_URL` and `BACKSTAGE_API_SCOPE` on the MCP host, not in IDE settings. The scope is normally the Backstage API's application ID URI followed by `/.default`.

Grant the MCP app or managed identity the required application permission on the Backstage API and grant admin consent. Backstage must validate Entra bearer tokens and authorize that application identity. These catalog calls use the MCP app's shared permissions; they do not run as the IDE user.

### Remote MCP for VS Code and IntelliJ

Remote mode accepts Entra delegated access tokens from the IDE; it does not start a device-code flow or ask the user to sign in again. The IDE must obtain an access token for this API using the user's existing Entra session. Silent SSO depends on the IDE's Entra account and OAuth client configuration; the server cannot guarantee that a particular IDE will never display its own consent or account-selection prompt.

1. Register the MCP API in Entra ID and expose a delegated scope named `access_as_user` (or configure `ENTRA_API_SCOPE` to the scope name you expose). Use the app registration's client ID as `ENTRA_CLIENT_ID`; configure the access-token version to v2.
2. Grant the VS Code and IntelliJ OAuth clients permission to that delegated scope and grant admin consent if required by your tenant. Configure their authorization server as `https://login.microsoftonline.com/<tenant-id>/v2.0` and request `api://<ENTRA_CLIENT_ID>/access_as_user`.
3. Set `ENTRA_AUTH_ENABLED=true`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `MCP_PUBLIC_URL` on the server. Configure Jira, Confluence, Xray, and Figma service-account credentials on the server as needed. Keep TLS enabled at the server or trusted reverse proxy.
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

`npm start` and `npm run start:remote` both run the Entra-authenticated remote endpoint.

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

### search-test-cases
Find existing Xray test cases similar to given acceptance criteria. Keywords are extracted from the criteria and used in a JQL text search over Test issues in the project; candidates are then ranked by term overlap with the criteria. Returns each match's key, summary, test type, labels, and a `similarity` score (0-1). The search is keyword-based, not semantic.

**Usage:**
```
Tool: search-test-cases
Arguments:
  - project_key: Jira project key to search in
  - acceptance_criteria: Acceptance criteria text
  - max_results: Maximum tests to return, 1-50 (optional, default 10)
```

### create-test-cases
Create test cases in Xray and add them to a test plan (test schedule). Tests default to type `Manual`, or `Cucumber` when `gherkin` is provided. A test that fails to create is reported under `failed` without stopping the others; the response also lists `created` tests and those `addedToPlan`.

**Usage:**
```
Tool: create-test-cases
Arguments:
  - test_plan_key: Test plan issue key (e.g., PROJ-123)
  - project_key: Project for the new tests (optional, defaults to the test plan's project)
  - test_cases: Array of { summary, description?, test_type? (Manual|Cucumber|Generic), steps?: [{action, data?, result?}], gherkin?, labels? }
```

Xray tools use Xray Cloud API keys configured server-side (`XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`, optional `XRAY_BASE_URL`) and call the Xray Cloud GraphQL API. Xray Server/Data Center is not supported.

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

### sharepoint_search
Search SharePoint and OneDrive content accessible to the signed-in user. Available on the authenticated remote MCP server; it uses Entra On-Behalf-Of authentication and Microsoft Graph delegated permissions.

**Usage:**
```
Tool: sharepoint_search
Arguments:
  - query: Text or keywords to search in accessible content
  - limit: Maximum results to return (optional, defaults to 10; maximum 50)
```

### backstage_catalog_search
Search Backstage catalog entities using its filter syntax, for example `kind=component,metadata.namespace=default`.

**Usage:**
```
Tool: backstage_catalog_search
Arguments:
  - filter: Backstage catalog filter expression
  - limit: Maximum number of entities (optional, defaults to 20; maximum 100)
```

### backstage_catalog_get_entity
Get one catalog entity by kind, namespace, and name. The namespace defaults to `default`.

**Usage:**
```
Tool: backstage_catalog_get_entity
Arguments:
  - kind: Entity kind, such as Component or API
  - namespace: Entity namespace (optional, defaults to default)
  - name: Entity name
```

Both tools use the MCP app's Entra identity and require the Backstage API configuration described above.

## Scripts

### Server entrypoints

- `npm start`: Run the Entra-authenticated remote server, including SharePoint context search.
- `npm run start:remote`: Alias for the Entra-authenticated remote server.
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
- `figma/test-token-mapper.mjs`

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
| `FIGMA_API_TOKEN` | Server-side Figma service-account token | Required for Figma tools |
| `JIRA_BASE_URL` | Your Jira instance base URL | Required for Jira tools |
| `JIRA_EMAIL` | Jira service-account email | Required for Jira tools |
| `JIRA_API_TOKEN` | Server-side Jira service-account API token | Required for Jira tools |
| `CONFLUENCE_BASE_URL` | Your Confluence site or wiki base URL | Required for Confluence tools |
| `CONFLUENCE_EMAIL` | Confluence service-account email | Required for Confluence tools |
| `CONFLUENCE_API_TOKEN` | Server-side Confluence service-account API token | Required for Confluence tools |
| `XRAY_CLIENT_ID` | Xray Cloud API key client ID | Required for Xray tools |
| `XRAY_CLIENT_SECRET` | Server-side Xray Cloud API key client secret | Required for Xray tools |
| `XRAY_BASE_URL` | Xray Cloud host (defaults to `https://xray.cloud.getxray.app`) | Optional |

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

1. Add the tool to the relevant domain module under `src/figma/`, `src/jira/`, or `src/confluence/`
2. Keep cross-cutting server wiring in `src/common/server.ts`
3. Expose the module through `src/figma/module.ts` or `src/jira/module.ts`
4. Rebuild with `npm run build`

## Architecture

- **Shared server builder**: `src/common/server.ts` composes any set of tool modules into an MCP server.
- **Figma module**: `src/figma/` contains the Figma client, tools, and Figma-only entrypoint, while `figma/` contains standalone Figma utilities.
- **Jira module**: `src/jira/` contains the Jira client, tools, and Jira-only entrypoint, while `jira/` contains standalone Jira utilities.
- **Confluence module**: `src/confluence/` contains the Confluence client, tools, and Confluence-only entrypoint, while `confluence/` contains standalone Confluence utilities.
- **Xray module**: `src/xray/` contains the Xray Cloud GraphQL client and the `search-test-cases` / `create-test-cases` tools. It is registered on the remote server only.
- **SharePoint module**: `src/sharepoint/` searches SharePoint and OneDrive with Microsoft Graph using the authenticated user's delegated permissions. It is registered on the remote server only.
- **Backstage module**: `src/backstage/` searches the remote catalog and retrieves entities using the MCP host's Entra application identity.
- **Remote server**: `src/remote-server.ts` composes the integration modules behind per-request Entra authentication.

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Figma Developer API](https://www.figma.com/developers/api)
- [Figma API Reference](https://www.figma.com/developers/api)

## License

MIT
