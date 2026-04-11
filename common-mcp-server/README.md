# common-mcp-server

`common-mcp-server` is a Model Context Protocol (MCP) server for integrating with both Figma and Jira, enabling GitHub Copilot to access design data and project issues from one shared server.

## Prerequisites

- Node.js 18+
- npm
- Figma account with API token access
- Jira account with API token access if Jira tools are needed
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

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `FIGMA_API_TOKEN` | Your Figma personal access token | Required for Figma tools |
| `JIRA_BASE_URL` | Your Jira instance base URL | Required for Jira tools |
| `JIRA_EMAIL` | Your Jira account email | Required for Jira tools |
| `JIRA_API_TOKEN` | Your Jira API token | Required for Jira tools |

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

### get_issues
Get issues from a Jira project.

**Usage:**
```
Tool: get_issues
Arguments:
  - project_key: The Jira project key
  - max_results: Maximum number of issues to return (optional)
```

### create_issue
Create a new Jira issue.

**Usage:**
```
Tool: create_issue
Arguments:
  - project_key: The Jira project key
  - issue_type: The type of issue (e.g., Bug, Task, Story)
  - summary: A brief summary of the issue
  - description: A detailed description of the issue
```

### get_issue
Get details for a specific Jira issue.

**Usage:**
```
Tool: get_issue
Arguments:
  - issue_key: The Jira issue key (e.g., PROJ-1)
```

## Scripts

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
- `figma/update-component-from-figma.mjs`

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
- **Figma Utilities**: Standalone helper scripts live under `figma/`
- **Tools**: Provide structured interfaces to Figma functionality

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Figma Developer API](https://www.figma.com/developers/api)
- [Figma API Reference](https://www.figma.com/developers/api)

## License

MIT
