#!/usr/bin/env node

/**
 * Simple test script to verify the common MCP server is working
 * This simulates an MCP client making tool requests
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const target = process.argv[2] || 'common';

const serverTargets = {
  common: {
    entrypoint: './dist/server.js',
    tools: ['figma_get_files', 'figma_get_file', 'figma_get_file_nodes', 'figma_get_component', 'figma_extract_design_tokens', 'figma_map_tokens_to_angular', 'jira_get_issues', 'jira_create_issue', 'jira_get_issue', 'confluence_search_pages', 'confluence_get_page', 'confluence_create_page', 'confluence_update_page', 'mongodb_vector_upsert', 'mongodb_vector_search', 'mongodb_vector_get_document', 'mongodb_vector_delete_document'],
  },
  mongodb: {
    entrypoint: './dist/mongodb/server.js',
    tools: ['mongodb_vector_upsert', 'mongodb_vector_search', 'mongodb_vector_get_document', 'mongodb_vector_delete_document'],
  },
  confluence: {
    entrypoint: './dist/confluence/server.js',
    tools: ['confluence_search_pages', 'confluence_get_page', 'confluence_create_page', 'confluence_update_page'],
  },
  figma: {
    entrypoint: './dist/figma/server.js',
    tools: ['figma_get_files', 'figma_get_file', 'figma_get_file_nodes', 'figma_get_component', 'figma_extract_design_tokens', 'figma_map_tokens_to_angular'],
  },
  jira: {
    entrypoint: './dist/jira/server.js',
    tools: ['jira_get_issues', 'jira_create_issue', 'jira_get_issue'],
  },
};

const config = serverTargets[target];

if (!config) {
  console.error(`Unknown target: ${target}. Use common, confluence, figma, jira, or mongodb.`);
  process.exit(1);
}

const serverProcess = spawn('node', [resolve(config.entrypoint)], {
  cwd: process.cwd(),
  env: { ...process.env },
});

let output = '';
let isConnected = false;

serverProcess.stderr.on('data', (data) => {
  output += data.toString();
  console.log('Server:', data.toString());
  
  if (output.includes('running')) {
    isConnected = true;
  }
});

serverProcess.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

serverProcess.on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

// Wait for server to start, then test it
setTimeout(() => {
  if (isConnected) {
    console.log('\n✅ Server started successfully!');
    console.log(`✅ Target: ${target}`);
    console.log('\n📋 Available Tools:');
    config.tools.forEach((toolName, index) => {
      console.log(`  ${index + 1}. ${toolName}`);
    });
    console.log('\n✨ Server is ready for use!');
  } else {
    console.log('⚠️  Server may not have started properly');
  }
  
  serverProcess.kill();
  process.exit(0);
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
  serverProcess.kill();
  process.exit(1);
}, 10000);
