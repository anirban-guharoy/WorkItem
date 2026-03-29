# Figma MCP Server - Quick Setup Guide

## What is this?

This is a Model Context Protocol (MCP) server that allows AI assistants (like Claude) to interact with Figma designs programmatically. It provides tools to fetch files, design elements, components, and other design data from Figma.

## Prerequisites

- Node.js 18 or higher
- A Figma account with API access
- A Figma personal access token

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
Figma MCP server running on stdio
```

(Press Ctrl+C to stop)

## Using with Claude/AI Tools

To use this MCP server with Claude or other AI tools, you'll need to configure it in your AI tool's settings. Here's how:

### For Claude Desktop

1. Open your `claude_desktop_config.json` (usually in `~/.claude/claude_desktop_config.json`)
2. Add the following configuration:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/path/to/figma-mcp-server/dist/index.js"],
      "env": {
        "FIGMA_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Replace `/path/to/figma-mcp-server` with the actual path to this directory, and add your token.

## Available Tools

Once configured, the MCP server provides these tools:

### 1. `get_files`
Lists all Figma files accessible to your account.

### 2. `get_file`
Gets detailed information about a specific file.
```
Arguments:
  - file_key: The file ID from the Figma URL
```

### 3. `get_file_nodes`
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

## Development

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
│   └── index.ts           # Main MCP server implementation
├── dist/                  # Compiled JavaScript output
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # Full documentation
```

## Next Steps

1. ✅ Install and build
2. ✅ Configure with your Figma token
3. ✅ Test the server
4. ✅ Configure in Claude Desktop or your AI tool
5. ✅ Start using it to analyze and discuss Figma designs!

For more details, see [README.md](./README.md).
