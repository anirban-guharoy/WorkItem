# Common MCP Server - Quick Setup Guide

**Note:** This workspace exposes a Node.js/TypeScript MCP server for `figma`, `jira`, `confluence`, remote SharePoint context search, and the Backstage software catalog.

## What is this?

This is a Model Context Protocol (MCP) server that allows AI assistants like GitHub Copilot to interact with Figma, Jira, Confluence, SharePoint, and Backstage programmatically. It provides tools to fetch design data from Figma, issues from Jira, pages from Confluence, SharePoint search results, and Backstage catalog entities.

## Prerequisites

- Node.js 22 or higher
- Figma service account with API access if you want Figma tools
- Jira service account and API token if you want Jira tools
- Confluence service account and API token if you want Confluence tools
- Microsoft 365 tenant and Entra app registration if you want remote SharePoint search
- Remote Backstage Catalog API protected by Entra ID if you want Backstage tools
- VS Code with Github Copilot Chat extension

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure the Server

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Keep these credentials on the MCP host (preferably injected from a secret manager). Set server-side service-account credentials for the integrations you enable:

```env
FIGMA_API_TOKEN=figma_service_account_token
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=mcp-service-account@yourcompany.com
JIRA_API_TOKEN=your_jira_api_token_here
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=mcp-service-account@yourcompany.com
CONFLUENCE_API_TOKEN=your_confluence_api_token_here
BACKSTAGE_BASE_URL=https://backstage.example.com
BACKSTAGE_API_SCOPE=api://your-backstage-app-id/.default
```

Register the MCP as an Entra-protected API and configure its remote endpoint. The IDE obtains an individual user token; do not inject a user's access token into the server environment.

```env
ENTRA_AUTH_ENABLED=true
ENTRA_TENANT_ID=your-entra-tenant-id
ENTRA_CLIENT_ID=your-mcp-api-app-id
ENTRA_CLIENT_SECRET=store-this-in-a-secret-manager
ENTRA_APP_ID_URI=api://your-mcp-api-app-id
ENTRA_API_SCOPE=access_as_user
MCP_PUBLIC_URL=https://mcp.example.com/mcp
MCP_HOST=0.0.0.0
MCP_PORT=3000
```

Expose the delegated `access_as_user` scope (or the configured `ENTRA_API_SCOPE`) and grant the IDE's OAuth client permission and consent. Configure the IDE to use `https://login.microsoftonline.com/<tenant-id>/v2.0`, request `api://<ENTRA_CLIENT_ID>/access_as_user`, and use authorization-code flow with PKCE. Each incoming request is validated, and each MCP session is restricted to the Entra user who created it. Silent sign-in depends on the IDE and tenant policy.

For SharePoint, grant the API app delegated Microsoft Graph `Files.Read.All` and consent. The server exchanges the incoming user's API token with OBO, so search results follow that user's SharePoint permissions. `ENTRA_CLIENT_SECRET` remains server-side. For Figma, Jira, and Confluence, the server instead uses the configured service accounts for every authenticated IDE user; grant each service account only the required permissions.

For Backstage, grant the MCP app or managed identity application access to the Backstage API and grant admin consent. Configure `BACKSTAGE_BASE_URL` and the Backstage API's `/.default` scope on the MCP host. The server uses Azure Identity `DefaultAzureCredential` to obtain an app-only token: managed identity in Azure, or standard Azure credentials during local development. Backstage must validate the Entra token and authorize the MCP application identity; these calls do not preserve the IDE user's identity.

The Streamable HTTP endpoint is `MCP_PUBLIC_URL`; OAuth protected-resource metadata is published at `/.well-known/oauth-protected-resource`. HTTPS is required outside localhost. Configure the IDE with the public endpoint URL and its Entra OAuth flow; do not put integration tokens or the OBO client secret in IDE settings.

## Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Step 4: Start the Server

After configuring the environment:

```bash
npm start
```

You should see output like:
```
Common remote MCP server listening at https://mcp.example.com/mcp
```

`npm run start:remote` is an alias for `npm start`.

## Using with GitHub Copilot or another IDE

Configure the IDE with the deployed `MCP_PUBLIC_URL` and Entra authorization-code flow with PKCE for the `access_as_user` scope. The IDE signs in each user and sends that user bearer token. Do not configure Jira, Confluence, or Figma service-account credentials, the SharePoint OBO secret, or a user access token in IDE settings. Follow the IDE remote MCP configuration UI and your tenant OAuth client consent policy.

## Available Tools

The authenticated remote MCP server provides these tools:

### 1. `figma_get_files`
Lists Figma files from a project or team.

**Arguments:**
  - `project_id` (optional): The Figma project ID to list files from
  - `team_id` (optional): The Figma team ID to list files across team projects

### 2. `figma_get_file`
Gets detailed information about a specific file.

**Arguments:**
  - `file_key`: The Figma file ID

### 3. `figma_get_file_nodes`
Retrieves specific design elements from a file.

**Arguments:**
  - `file_key`: The Figma file ID
  - `node_ids`: Array of node IDs to fetch

### 4. `figma_get_component`
Gets information about a component in Figma.

**Arguments:**
  - `file_key`: The Figma file ID
  - `component_id`: The component ID

### 5. `figma_extract_design_tokens`
Extracts design tokens from a Figma file.

**Arguments:**
  - `file_key`: The Figma file ID

### 6. `figma_map_tokens_to_angular`
Maps Figma design tokens to Angular component output.

**Arguments:**
  - `tokens`: Output from `figma_extract_design_tokens`
  - `component_name`: Name for the generated Angular component

### 7. `jira_get_issues`
Lists issues from a Jira project.

**Arguments:**
  - `project_key`: The Jira project key
  - `max_results` (optional): Maximum number of issues to return

### 8. `jira_create_issue`
Creates a Jira issue.

**Arguments:**
  - `project_key`: The Jira project key
  - `issue_type`: The Jira issue type
  - `summary`: Issue summary
  - `description` (optional): Issue description

### 9. `jira_get_issue`
Gets one Jira issue by key.

**Arguments:**
  - `issue_key`: The Jira issue key

### 10. `confluence_search_pages`
Searches Confluence pages by text query.

**Arguments:**
  - `query`: Search text
  - `limit` (optional): Maximum results
  - `space_key` (optional): Confluence space key filter

### 11. `confluence_get_page`
Gets a Confluence page by id.

**Arguments:**
  - `page_id`: Confluence page id

### 12. `confluence_create_page`
Creates a Confluence page.

**Arguments:**
  - `space_key`: Confluence space key
  - `title`: Page title
  - `body`: Page content in storage format
  - `parent_page_id` (optional): Parent page id

### 13. `confluence_update_page`
Updates an existing Confluence page.

**Arguments:**
  - `page_id`: Confluence page id
  - `title`: Updated page title
  - `body`: Updated page content in storage format
  - `version_number` (optional): Next version number for the page; if omitted, the current version is fetched automatically

### 14. `sharepoint_search`
Searches SharePoint and OneDrive content available to the signed-in user.

**Arguments:**
  - `query`: Text or keywords to search
  - `limit` (optional): Maximum number of results (1-50, defaults to 10)

Available on the authenticated remote MCP server. Requires delegated Microsoft Graph `Files.Read.All` consent and server-side `ENTRA_CLIENT_SECRET` for OBO.

### 15. `backstage_catalog_search`
Searches Backstage catalog entities using its filter syntax, for example `kind=component,metadata.namespace=default`.

**Arguments:**
  - `filter`: Backstage catalog filter expression
  - `limit` (optional): Maximum number of entities (1-100, defaults to 20)

### 16. `backstage_catalog_get_entity`
Gets one Backstage catalog entity by kind, namespace, and name. Namespace defaults to `default`.

**Arguments:**
  - `kind`: Entity kind, such as Component or API
  - `namespace` (optional): Entity namespace
  - `name`: Entity name

Both tools use the MCP app's Entra identity. Configure `BACKSTAGE_BASE_URL` and `BACKSTAGE_API_SCOPE` on the server.

## Troubleshooting

### "FIGMA_API_TOKEN is not set"
- Verify you created a `.env` file
- Check that the token is correctly added
- Restart the server

### "API error: 401 Unauthorized"
- Your token is invalid or expired
- Generate a new token and update `.env`

### "API error: 403 Forbidden"
- Your token doesn't have permission to access the file
- Check file sharing settings in Figma

### "API error: 404 Not Found"
- The file_key or node_id doesn't exist
- Verify you're using correct IDs from Figma URLs

## Finding File Keys and Node IDs

### File Key
In a Figma URL: `https://www.figma.com/file/abc123xyz/MyProject`
The file key is: `abc123xyz`

### Node IDs
Can be found in Figma:
1. Right-click a layer/component
2. Copy the node ID from developer tools or API responses

### Watch mode
Automatically rebuild on changes:
```bash
npm run watch
```

### Development with rebuilding
```bash
npm run dev
```

## Project Structure

```
.
├── figma/                 # Standalone Figma utilities and token-mapper test
├── jira/                  # Standalone Jira utilities
├── src/
│   ├── common/            # Shared MCP composition and response helpers
│   ├── confluence/        # Confluence module and Confluence-only server entrypoint
│   ├── figma/             # Figma module and Figma-only server entrypoint
│   ├── jira/              # Jira module and Jira-only server entrypoint
│   ├── sharepoint/        # Remote-only SharePoint search via Microsoft Graph OBO
│   └── remote-server.ts   # Entra-authenticated remote server entrypoint
├── dist/                  # Compiled JavaScript output
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # Full documentation
```

## Standalone Helper Scripts

Figma utilities:
- `node figma/explore-figma.mjs <fileKey>`
- `node figma/map-tokens-to-angular.mjs <fileKey> <componentName>`
- `node figma/test-token-mapper.mjs`

Jira utilities:
- `node jira/get-issues.mjs <projectKey> [maxResults]`
- `node jira/get-issue.mjs <issueKey>`
- `node jira/create-issue.mjs <projectKey> <issueType> <summary> [description]`

Confluence utilities:
- `node confluence/search-pages.mjs <query> [limit] [spaceKey]`
- `node confluence/get-page.mjs <pageId>`
- `node confluence/create-page.mjs <spaceKey> <title> <body> [parentPageId]`
- `node confluence/update-page.mjs <pageId> <title> <body> [versionNumber]`

## Next Steps

1. ✅ Install and build
2. ✅ Configure service-account credentials on the server
3. ✅ Test the server
4. ✅ Configure the IDE to connect to the remote endpoint with Entra ID
5. ✅ Use the hybrid-authenticated MCP server.

For more details, see [README.md](./README.md).