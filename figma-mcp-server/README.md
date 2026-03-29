# Figma MCP Server

A Model Context Protocol (MCP) server for integrating with Figma, enabling AI assistants to access and interact with Figma files, components, and design elements.

## Features

- **List Files**: Retrieve all accessible Figma files
- **Get File Details**: Access detailed file structure and metadata
- **Query Nodes**: Fetch specific design elements (nodes) from files
- **Component Access**: Retrieve component information and properties

## Prerequisites

- Node.js 18+
- npm
- Figma account with API token access

## Installation

1. Clone or extract this project
2. Install dependencies:

```bash
npm install
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

## Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Running the Server

### Development Mode

Watch for changes and rebuild automatically while running:

```bash
npm run dev
```

### Production Mode

Start the compiled server:

```bash
npm start
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
