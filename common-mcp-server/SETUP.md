# Common MCP Server - Quick Setup Guide

**Note:** This workspace now runs a shared Node.js/TypeScript MCP server for both Figma and Jira.

## What is this?

This is a Model Context Protocol (MCP) server that allows AI assistants like GitHub Copilot to interact with both Figma and Jira programmatically. It provides tools to fetch design data from Figma and issues from Jira.

## Prerequisites

- Node.js 18 or higher
- A Figma account with API access if you want Figma tools
- A Figma personal access token if you want Figma tools
- A Jira account and API token if you want Jira tools
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
        "FIGMA_API_TOKEN": "your_token_here"
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
4. Add a new server with the following details:
  - Name: `common`
   - Command: `node`
  - Arguments: `${workspaceFolder}/dist/server.js`
   - Environment: `FIGMA_API_TOKEN=your_token_here`

## Available Tools

Once configured, the MCP server provides these tools in Github Copilot Chat:

### 1. `get_files`
Lists Figma files from a project or team.

**Arguments:**
  - `project_id` (optional): The Figma project ID to list files from
  - `team_id` (optional): The Figma team ID to list files across team projects

### 2. `get_file`
Gets detailed information about a specific file.
```
Retrieves specific design elements from a file.
```
Arguments:
  - file_key: The Figma file ID
  - node_ids: Array of node IDs to fetch
```

### 4. `get_component`
Gets information about a component in Figma.
```
Arguments:
  - file_key: The Figma file ID
  - component_id: The component ID
```

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
├── src/
│   ├── figma/             # Figma client and tool handlers
│   ├── jira/              # Jira client and tool handlers
│   └── server.ts          # Main shared MCP server implementation
├── dist/                  # Compiled JavaScript output
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # Full documentation
```

## Next Steps

1. ✅ Install and build
2. ✅ Configure with your Figma token
3. ✅ Test the server
4. ✅ Configure in Github Copilot (VS Code)
5. ✅ Start using it to analyze and discuss Figma designs!

For more details, see [README.md](./README.md).