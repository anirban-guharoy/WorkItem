# Figma MCP Server (Node.js Version)


A Model Context Protocol (MCP) server for integrating with Figma, enabling Github Copilot to access and interact with Figma files, components, and design elements.

## Prerequisites

- Node.js 18+
- npm
- Figma account with API token access
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

## Configuration

Configure this MCP server in VS Code settings for use with Github Copilot Chat. See [SETUP.md](./SETUP.md) for detailed instructions.

For full documentation, see SETUP.md.

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

### get_component
Get component details from a Figma file.

**Usage:**
```
Tool: get_component
Arguments:
  - file_key: The Figma file identifier
  - component_id: The component ID
```

### extract_design_tokens
Extract design tokens (colors, typography, spacing) from a Figma file.

**Usage:**
```
Tool: extract_design_tokens
Arguments:
  - file_key: The Figma file identifier
```

### map_tokens_to_angular
Map Figma design tokens to Angular component styles and properties.

**Usage:**
```
Tool: map_tokens_to_angular
Arguments:
  - tokens: Design tokens object from extract_design_tokens
  - component_name: Name for the generated Angular component
```

## Scripts

### map-tokens-to-angular.mjs
Standalone script to extract design tokens from Figma and generate a complete Angular component.

**Usage:**
```bash
node map-tokens-to-angular.mjs
```

This script will:
- Extract design tokens from your Figma file
- Generate CSS custom properties (variables)
- Create an Angular component with token-based styling
- Output files to `generated-component/` directory

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
