# Common MCP Server - Quick Setup Guide

**Note:** This workspace now exposes modular Node.js/TypeScript MCP servers for `figma`, `jira`, `confluence`, `mongodb`, and a shared combined server.

## What is this?

This is a Model Context Protocol (MCP) server that allows AI assistants like GitHub Copilot to interact with Figma, Jira, Confluence, and MongoDB vector storage programmatically. It provides tools to fetch design data from Figma, issues from Jira, pages from Confluence, and vector documents from MongoDB.

## Prerequisites

- Node.js 18 or higher
- A Figma account with API access if you want Figma tools
- A Figma personal access token if you want Figma tools
- A Jira account and API token if you want Jira tools
- A Confluence account and API token if you want Confluence tools
- A MongoDB deployment with vector search support if you want MongoDB vector tools
- VS Code with Github Copilot Chat extension

## Step 1: Get Your Figma API Token

1. Go to [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Create a new token"
3. Give it a name (e.g., "MCP Server Token")
4. Copy the generated token (you'll only see it once!)

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Then edit `.env` and add your Figma token:

```env
FIGMA_API_TOKEN=your_actual_token_here
```

If you want to use Jira features, also add:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here
```

If you want to use Confluence features, also add:

```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your_confluence_api_token_here
```

If you want to use MongoDB vector features, also add:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=common_mcp
MONGODB_COLLECTION=vectors
MONGODB_VECTOR_INDEX=vector_index
```

## Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Step 5: Test the Server

To verify everything is working:

```bash
npm start
```

You should see output like:
```
Common MCP server running on stdio
```

(Press Ctrl+C to stop)

You can also validate the module-specific entrypoints:

```bash
npm run start:figma
npm run start:jira
npm run start:confluence
npm run start:mongodb
```

## Using with Github Copilot

To use this MCP server with Github Copilot in VS Code, you'll need to configure it in your VS Code settings. Here's how:

### For VS Code with Github Copilot Chat

1. Open VS Code settings (Ctrl/Cmd + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add the following configuration to your VS Code settings:

```json
{
  "github.copilot.chat.mcp": {
    "common": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/server.js"],
      "env": {
        "FIGMA_API_TOKEN": "your_token_here",
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your_jira_token_here",
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net/wiki",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your_confluence_token_here",
        "MONGODB_URI": "mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority",
        "MONGODB_DATABASE": "common_mcp",
        "MONGODB_COLLECTION": "vectors",
        "MONGODB_VECTOR_INDEX": "vector_index"
      }
    },
    "figma": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/figma/server.js"],
      "env": {
        "FIGMA_API_TOKEN": "your_token_here"
      }
    },
    "jira": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/jira/server.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your_jira_token_here"
      }
    },
    "confluence": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/confluence/server.js"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net/wiki",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your_confluence_token_here"
      }
    },
    "mongodb": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/mongodb/server.js"],
      "env": {
        "MONGODB_URI": "mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority",
        "MONGODB_DATABASE": "common_mcp",
        "MONGODB_COLLECTION": "vectors",
        "MONGODB_VECTOR_INDEX": "vector_index"
      }
    }
  }
}
```

Replace `your_token_here` with your actual Figma API token.

Alternatively, you can configure it through the Copilot Chat interface:
1. Open Copilot Chat in VS Code
2. Click on the settings icon (gear)
3. Go to "MCP Servers"
4. Add one or more servers with the following details:
  - Name: `common`
  - Command: `node`
  - Arguments: `${workspaceFolder}/dist/server.js`
  - Environment: `FIGMA_API_TOKEN=your_token_here`, plus Jira env vars if you want Jira tools
  - Name: `figma`
  - Command: `node`
  - Arguments: `${workspaceFolder}/dist/figma/server.js`
  - Environment: `FIGMA_API_TOKEN=your_token_here`
  - Name: `jira`
  - Command: `node`
  - Arguments: `${workspaceFolder}/dist/jira/server.js`
  - Environment: `JIRA_BASE_URL=...`, `JIRA_EMAIL=...`, `JIRA_API_TOKEN=...`
  - Name: `confluence`
  - Command: `node`
  - Arguments: `${workspaceFolder}/dist/confluence/server.js`
  - Environment: `CONFLUENCE_BASE_URL=...`, `CONFLUENCE_EMAIL=...`, `CONFLUENCE_API_TOKEN=...`
  - Name: `mongodb`
  - Command: `node`
  - Arguments: `${workspaceFolder}/dist/mongodb/server.js`
  - Environment: `MONGODB_URI=...`, `MONGODB_DATABASE=...`, `MONGODB_COLLECTION=...`, `MONGODB_VECTOR_INDEX=...`

## Available Tools

Once configured, the MCP server provides these tools in Github Copilot Chat:

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

### 14. `mongodb_vector_upsert`
Upserts a vector document into MongoDB.

**Arguments:**
  - `document_id`: Stable document id
  - `content` (optional): Text content
  - `embedding`: Numeric embedding array
  - `metadata` (optional): Metadata object

### 15. `mongodb_vector_search`
Runs a vector similarity search against MongoDB.

**Arguments:**
  - `query_vector`: Numeric embedding array
  - `limit` (optional): Maximum results
  - `num_candidates` (optional): Candidate pool size
  - `filter` (optional): Filter document

### 16. `mongodb_vector_get_document`
Gets a stored MongoDB vector document by id.

**Arguments:**
  - `document_id`: Vector document id

### 17. `mongodb_vector_delete_document`
Deletes a stored MongoDB vector document by id.

**Arguments:**
  - `document_id`: Vector document id

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
│   ├── mongodb/           # MongoDB vector module and MongoDB-only server entrypoint
│   └── server.ts          # Combined server entrypoint
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
2. ✅ Configure with your Figma token
3. ✅ Test the server
4. ✅ Configure in Github Copilot (VS Code)
5. ✅ Start using the combined or module-specific servers.

For more details, see [README.md](./README.md).