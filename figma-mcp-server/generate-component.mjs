#!/usr/bin/env node

/**
 * Figma to Angular Component Generator
 * Fetches design from Figma and generates Angular component
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN;
const FILE_KEY = 'yFsZrVGKYZvCnaL7AcnU8n';
const COMPONENT_NAME = 'FigmaPoC';

if (!FIGMA_API_TOKEN) {
  console.error('Error: FIGMA_API_TOKEN environment variable is not set');
  process.exit(1);
}

async function fetchFigmaFile() {
  try {
    console.log('📥 Fetching Figma design file...');
    
    const response = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, {
      headers: {
        'X-Figma-Token': FIGMA_API_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ File fetched successfully');
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching Figma file:', error);
    process.exit(1);
  }
}

function extractDesignInfo(figmaFile) {
  const fileData = figmaFile;
  
  // Extract basic info
  const name = fileData.name || 'Component';
  const nodes = fileData.document?.children || [];
  
  console.log(`📄 File: ${name}`);
  console.log(`📦 Top-level frames/sections: ${nodes.length}`);
  
  // Get first page/frame for basic structure
  const structure = {
    name,
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      children: n.children ? n.children.length : 0,
    })),
  };
  
  return structure;
}

function generateAngularComponent(componentName, design) {
  const componentNameKebab = componentName
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase();

  const componentNameCamel = componentName
    .charAt(0).toUpperCase() + componentName.slice(1);

  // Generate TypeScript component
  const tsComponent = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${componentNameKebab}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${componentNameKebab}.component.html',
  styleUrls: ['./${componentNameKebab}.component.css']
})
export class ${componentNameCamel}Component {
  title = '${componentName}';
  
  // Add your component logic here
  constructor() {}
  
  ngOnInit(): void {
    // Initialize component
  }
}
`;

  // Generate HTML template
  const htmlTemplate = `<div class="figma-component">
  <h1>{{ title }}</h1>
  
  <!-- Component content from Figma design -->
  <div class="design-layout">
    <!-- Replace with actual design elements -->
    <p>Design elements rendered based on Figma structure:</p>
    <ul>
${design.nodes.map(node => `      <li><strong>${node.name}</strong> (${node.type})</li>`).join('\n')}
    </ul>
  </div>
</div>
`;

  // Generate CSS styles
  const cssStyles = `.figma-component {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.figma-component h1 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333333;
}

.design-layout {
  margin-top: 16px;
}

.design-layout p {
  color: #666666;
  margin-bottom: 12px;
}

.design-layout ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.design-layout li {
  padding: 8px;
  margin-bottom: 4px;
  background: #f5f5f5;
  border-left: 3px solid #0066cc;
  border-radius: 4px;
  font-size: 14px;
}

.design-layout li strong {
  color: #0066cc;
}
`;

  // Generate spec file for testing
  const specFile = `import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ${componentNameCamel}Component } from './${componentNameKebab}.component';

describe('${componentNameCamel}Component', () => {
  let component: ${componentNameCamel}Component;
  let fixture: ComponentFixture<${componentNameCamel}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${componentNameCamel}Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(${componentNameCamel}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('${componentName}');
  });
});
`;

  return {
    ts: tsComponent,
    html: htmlTemplate,
    css: cssStyles,
    spec: specFile,
    componentNameKebab,
  };
}

async function main() {
  try {
    // Fetch Figma file
    const figmaFile = await fetchFigmaFile();
    
    // Extract design information
    const design = extractDesignInfo(figmaFile);
    
    // Generate component files
    console.log('\n🔨 Generating Angular component...');
    const componentFiles = generateAngularComponent(COMPONENT_NAME, design);
    
    // Prepare component directory in angular-app
    const angularAppPath = '/Users/anirban/Desktop/WorkItem/Angular PoC/angular-app';
    const componentDir = path.join(angularAppPath, 'src/app', componentFiles.componentNameKebab);
    
    // Create component directory
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
      console.log(`✅ Created directory: ${componentDir}`);
    }
    
    // Write component files
    const files = [
      { name: `${componentFiles.componentNameKebab}.component.ts`, content: componentFiles.ts },
      { name: `${componentFiles.componentNameKebab}.component.html`, content: componentFiles.html },
      { name: `${componentFiles.componentNameKebab}.component.css`, content: componentFiles.css },
      { name: `${componentFiles.componentNameKebab}.component.spec.ts`, content: componentFiles.spec },
    ];
    
    for (const file of files) {
      const filePath = path.join(componentDir, file.name);
      fs.writeFileSync(filePath, file.content);
      console.log(`✅ Created: ${file.name}`);
    }
    
    console.log('\n📦 Component Files Generated:');
    console.log(`📁 ${componentDir}`);
    console.log(`   ├── ${componentFiles.componentNameKebab}.component.ts`);
    console.log(`   ├── ${componentFiles.componentNameKebab}.component.html`);
    console.log(`   ├── ${componentFiles.componentNameKebab}.component.css`);
    console.log(`   └── ${componentFiles.componentNameKebab}.component.spec.ts`);
    
    console.log('\n✨ Next steps:');
    console.log(`1. Import the component in your Angular app`);
    console.log(`2. Use it in templates: <app-${componentFiles.componentNameKebab}></app-${componentFiles.componentNameKebab}>`);
    console.log(`3. Customize the component with your design details`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
