# Common MCP Server - Setup Checklist

**Note:** This workspace now runs modular Node.js/TypeScript MCP servers for Figma, Jira, Confluence, MongoDB, and the combined shared server.

## Project Setup

- [x] Initialize project structure with TypeScript
- [x] Configure package.json with dependencies
- [x] Set up TypeScript configuration (tsconfig.json)
- [x] Create MCP server implementation
  - Server bootstrap with stdio transport
  - Shared server composition layer
  - Domain modules for Figma, Jira, Confluence, and MongoDB
  - Tool definitions (figma_get_files, figma_get_file, figma_get_file_nodes, figma_get_component)
  - Figma API integration
  - Jira API integration
  - Confluence API integration
  - MongoDB vector search integration
  - Proper error handling and response formatting
  - **NEW:** Design token extraction and mapping tools
    - figma_extract_design_tokens: Extract colors, typography, spacing from Figma
    - figma_map_tokens_to_angular: Generate Angular components from design tokens

- [x] Build and compilation
  - TypeScript build successful
  - Output: dist/server.js
  - No compilation errors

- [x] Development tools configured
  - VS Code launch configuration
  - Recommended extensions
  - Build scripts (npm run build, npm start, npm run dev)
  - Module scripts (npm run start:figma, npm run start:jira, npm run start:confluence, npm run start:mongodb)
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

- [ ] Set up Figma API Token
  1. Go to https://www.figma.com/developers/api#access-tokens
  2. Create a new personal access token
  3. Copy the token to `.env` file

- [ ] Install dependencies (if not already done):
  ```bash
  npm install
  ```

- [ ] Build the project:
  ```bash
  npm run build
  ```

## Testing

- [ ] Run the server locally:
  ```bash
  npm start
  ```
  Expected: Server runs on stdio without errors

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
  - mongodb_vector_upsert
  - mongodb_vector_search
  - mongodb_vector_get_document
  - mongodb_vector_delete_document

## Integration

- [ ] Configure with Github Copilot in VS Code
  - Update clay_desktop_config.json with server path
  - Add FIGMA_API_TOKEN to environment
  - Restart the application

- [ ] Test with Figma files
  - Verify API token has access to your files
  - Test figma_get_files tool to list accessible files
  - Query specific designs or components

## Project Status

✅ **Ready for Development**

The MCP server is fully set up and ready to use. Follow the steps in SETUP.md to get started.

### Key Files
- `src/common/server.ts` - Shared MCP server builder
- `src/server.ts` - Combined server entrypoint
- `src/confluence/` - Confluence tools, module, and client
- `src/mongodb/` - MongoDB vector tools, module, and client
- `confluence/` - Standalone Confluence utility scripts
- `src/figma/` - Figma tools, module, and client
- `figma/` - Standalone Figma utility scripts and token-mapper test
- `src/jira/` - Jira tools, module, and client
- `jira/` - Standalone Jira utility scripts
- `dist/server.js` - Compiled executable
- `dist/confluence/server.js` - Confluence-only executable
- `dist/mongodb/server.js` - MongoDB-only executable
- `dist/figma/server.js` - Figma-only executable
- `dist/jira/server.js` - Jira-only executable
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

# Start Figma-only server
npm run start:figma

# Start Jira-only server
npm run start:jira

# Start Confluence-only server
npm run start:confluence

# Start MongoDB-only server
npm run start:mongodb

# Watch mode (rebuild on changes)
npm run watch

# Development mode (build and run)
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed instructions.
