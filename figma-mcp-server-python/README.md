# Figma MCP Server

A Model Context Protocol (MCP) server for integrating with Figma, enabling Github Copilot to access and interact with Figma files, components, and design elements.

## Features

- **List Files**: Retrieve all accessible Figma files
- **Get File Details**: Access detailed file structure and metadata
- **Query Nodes**: Fetch specific design elements (nodes) from files
- **Component Access**: Retrieve component information and properties

## Prerequisites

- Python 3.10+ ⚠️ (Required for MCP SDK compatibility)
- pip
- Figma account with API token access
- VS Code with Github Copilot Chat extension

> **Note:** The MCP Python SDK requires Python 3.10 or higher. If you're using an older version of Python, consider upgrading or using the Node.js version instead.

## Installation

1. Clone or extract this project
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Add your Figma API token to `.env`:

```env
FIGMA_API_TOKEN=your_figma_api_token_here
```

**Getting a Figma API Token:**
1. Go to [Figma Settings - API](https://www.figma.com/developers/api#access-tokens)
2. Create a new personal access token
3. Copy the token and paste it in your `.env` file

## Running the Server

Start the server:

```bash
python main.py
```

## API Tools

### get_files
List Figma files from a project or team.

**Usage:**
```
Tool: get_files
Arguments:
  - project_id: Optional Figma project ID to list files from
  - team_id: Optional Figma team ID to list project files from
```

### get_file
Get detailed information about a specific Figma file.

**Usage:**
```
Tool: get_file
Arguments:
  - file_key: The unique file identifier from the Figma URL
```

### get_file_nodes
Retrieve specific nodes (design elements) from a file.

**Usage:**
```
Tool: get_file_nodes
Arguments:
  - file_key: The Figma file identifier
  - node_ids: Array of node IDs to fetch
```

## API Tools

### get_files
List all Figma files accessible to the authenticated user.

**Usage:**
```
Tool: get_files
Arguments: (none)
```

### get_file
Get detailed information about a specific Figma file.

**Usage:**
```
Tool: get_file
Arguments:
  - file_key: The unique file identifier from the Figma URL
```

### get_file_nodes
Retrieve specific nodes (design elements) from a file.

**Usage:**
```
Tool: get_file_nodes
Arguments:
  - file_key: The Figma file identifier
  - node_ids: Array of node IDs to fetch
```

### get_component
Get component details from a Figma file.

**Usage:**
```
Tool: get_component
Arguments:
  - file_key: The Figma file identifier
  - component_id: The component ID
```

## Configuration

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `FIGMA_API_TOKEN` | Your Figma personal access token | Yes |

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

1. Add new tool definitions in the `getTools()` method
2. Implement handler logic in `setupToolHandlers()`
3. Update the TypeScript types as needed
4. Rebuild with `npm run build`

## Architecture

- **MCP Server**: Implements the Model Context Protocol for stdio communication
- **Figma API Client**: Handles authentication and API requests to Figma
- **Tools**: Provide structured interfaces to Figma functionality

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Figma Developer API](https://www.figma.com/developers/api)
- [Figma API Reference](https://www.figma.com/developers/api)

## License

MIT
