#!/usr/bin/env node

/**
 * Find and extract POC design from Figma
 */

import fetch from 'node-fetch';
import fs from 'fs';

const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN;
const FILE_KEY = 'yFsZrVGKYZvCnaL7AcnU8n';

if (!FIGMA_API_TOKEN) {
  console.error('Error: FIGMA_API_TOKEN environment variable is not set');
  process.exit(1);
}

async function findPOCDesign() {
  try {
    console.log('📥 Fetching Figma file...\n');
    
    const response = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, {
      headers: {
        'X-Figma-Token': FIGMA_API_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const designs = [];
    
    // Find all frames and components
    function searchNodes(nodes, parentPath = '') {
      if (!nodes) return;
      
      for (const node of nodes) {
        const fullPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
        
        if (node.type === 'FRAME' || node.type === 'COMPONENT') {
          designs.push({
            name: node.name,
            id: node.id,
            type: node.type,
            path: fullPath,
            childCount: node.children ? node.children.length : 0,
          });
        }
        
        if (node.children && node.children.length > 0) {
          searchNodes(node.children, fullPath);
        }
      }
    }

    if (data.document && data.document.children) {
      searchNodes(data.document.children);
    }
    
    // Display designs
    console.log('🎨 Available Designs in Figma:\n');
    designs.forEach((design, idx) => {
      console.log(`${idx + 1}. ${design.name}`);
      console.log(`   Type: ${design.type} | ID: ${design.id} | Elements: ${design.childCount}`);
      console.log(`   Path: ${design.path}\n`);
    });
    
    // Find POC-related designs
    const pocDesigns = designs.filter(d => 
      d.name.toLowerCase().includes('poc') || 
      d.name.toLowerCase().includes('poc named design') ||
      d.name.toLowerCase().includes('design')
    );

    if (pocDesigns.length > 0) {
      console.log('\n🔍 POC-related designs found:\n');
      pocDesigns.forEach(design => {
        console.log(`✓ ${design.name} (${design.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findPOCDesign();
