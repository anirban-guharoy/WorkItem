#!/usr/bin/env node

/**
 * Fetch Figma design structure to find POC designs
 */

import fetch from 'node-fetch';

const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN;
const FILE_KEY = process.argv[2] || process.env.FIGMA_FILE_KEY;

if (!FIGMA_API_TOKEN) {
  console.error('Error: FIGMA_API_TOKEN environment variable is not set');
  process.exit(1);
}

if (!FILE_KEY) {
  console.error('Error: Figma file key is required. Pass it as the first argument or set FIGMA_FILE_KEY.');
  process.exit(1);
}

async function fetchFigmaFile() {
  try {
    console.log('📥 Fetching Figma file structure...\n');
    
    const response = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, {
      headers: {
        'X-Figma-Token': FIGMA_API_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // List all frames and components
    function listNodes(nodes, depth = 0) {
      if (!nodes) return;
      
      for (const node of nodes) {
        const indent = '  '.repeat(depth);
        const icon = node.type === 'COMPONENT' ? '🧩' : node.type === 'FRAME' ? '📦' : '📄';
        console.log(`${indent}${icon} ${node.name} (${node.type}${node.id ? `, id: ${node.id}` : ''})`);
        
        if (node.children && node.children.length > 0) {
          listNodes(node.children, depth + 1);
        }
      }
    }

    console.log('📊 Figma File Structure:\n');
    if (data.document && data.document.children) {
      listNodes(data.document.children);
    }
    
    console.log('\n💾 Full data saved to figma-structure.json');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fetchFigmaFile();
