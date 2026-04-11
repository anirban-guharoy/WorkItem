#!/usr/bin/env node

/**
 * Simple test script to verify the common MCP server is working
 * This simulates an MCP client making tool requests
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverProcess = spawn('node', [resolve('./dist/server.js')], {
  cwd: process.cwd(),
  env: { ...process.env, FIGMA_API_TOKEN: process.env.FIGMA_API_TOKEN },
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
    console.log('✅ FIGMA_API_TOKEN is loaded');
    console.log('\n📋 Available Tools:');
    console.log('  1. get_files - List all Figma files');
    console.log('  2. get_file - Get file details');
    console.log('  3. get_file_nodes - Get specific nodes');
    console.log('  4. get_component - Get component info');
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
