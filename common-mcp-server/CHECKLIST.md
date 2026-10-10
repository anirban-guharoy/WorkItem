# Common MCP Server - Setup Checklist

**Note:** This workspace runs the combined Node.js/TypeScript MCP server over authenticated Streamable HTTP for Figma, Jira, Confluence, and SharePoint.

## Project Setup

- [x] Initialize project structure with TypeScript
- [x] Configure package.json with dependencies
- [x] Set up TypeScript configuration (tsconfig.json)
- [x] Create MCP server implementation
  - Entra-authenticated remote HTTP server
  - Shared server composition layer
  - Domain modules for Figma, Jira, and Confluence
  - Tool definitions (figma_get_files, figma_get_file, figma_get_file_nodes, figma_get_component)
  - Figma API integration
  - Jira API integration
  - Confluence API integration
  - Proper error handling and response formatting
  - **NEW:** Design token extraction and mapping tools
    - figma_extract_design_tokens: Extract colors, typography, spacing from Figma
    - figma_map_tokens_to_angular: Generate Angular components from design tokens

- [x] Build and compilation
  - TypeScript build successful
  - Output: dist/remote-server.js
  - No compilation errors

- [x] Development tools configured
  - VS Code launch configuration
  - Recommended extensions
  - Build and remote server scripts (npm run build, npm start)
  - **NEW:** Token mapping script (npm run map-tokens)
  - **NEW:** Standalone Jira utility scripts under `jira/`

- [x] Documentation
  - README.md with full API documentation
  - SETUP.md with quick start guide
  - .env.example with template configuration
  - **NEW:** Design token mapping examples and usage

- [x] Testing utilities
  - Mock data testing for token mapping
  - Generated component validation

## Before Using

- [ ] Configure Figma, Jira, and Confluence service-account credentials in the server secret store

- [ ] Install dependencies (if not already done):
  ```bash
  npm install
  ```

- [ ] Build the project:
  ```bash
  npm run build
  ```

## Testing

- [ ] Run the authenticated remote server:
  ```bash
  npm start
  ```
  Expected: Server listens at `MCP_PUBLIC_URL`

- [ ] Verify tools are available:
  - figma_get_files
  - figma_get_file
  - figma_get_file_nodes
  - figma_get_component
  - jira_get_issues
  - jira_create_issue
  - jira_get_issue
  - confluence_search_pages
  - confluence_get_page
  - confluence_create_page
  - confluence_update_page

## Integration

- [ ] Configure the IDE's remote MCP client with `MCP_PUBLIC_URL` and Entra ID OAuth

- [ ] Test with Figma files
  - Verify API token has access to your files
  - Test figma_get_files tool to list accessible files
  - Query specific designs or components

## Project Status

✅ **Ready for Development**

The MCP server is fully set up and ready to use. Follow the steps in SETUP.md to get started.

### Key Files
- `src/common/server.ts` - Shared MCP server builder
- `src/remote-server.ts` - Authenticated remote server entrypoint
- `src/confluence/` - Confluence tools, module, and client
- `confluence/` - Standalone Confluence utility scripts
- `src/figma/` - Figma tools, module, and client
- `figma/` - Standalone Figma utility scripts and token-mapper test
- `src/jira/` - Jira tools, module, and client
- `jira/` - Standalone Jira utility scripts
- `dist/remote-server.js` - Compiled remote executable
- `.env` - Configuration (create from .env.example)
- `package.json` - Dependencies and scripts

### Quick Commands
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Watch mode (rebuild on changes)
npm run watch

# Development mode (build and run)
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed instructions.
