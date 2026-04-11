#!/usr/bin/env node

/**
 * Test the design token mapping functionality with mock data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock design tokens data
const mockTokens = {
  styles: {
    'Primary Color': {
      type: 'color',
      value: 'rgba(63, 81, 181, 1)',
    },
    'Heading Typography': {
      type: 'typography',
      value: {
        fontFamily: 'Roboto',
        fontSize: 24,
        fontWeight: 500,
        lineHeight: 28.8,
      },
    },
    'Body Typography': {
      type: 'typography',
      value: {
        fontFamily: 'Roboto',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 24,
      },
    },
  },
  variables: {
    'Primary/500': {
      type: 'color',
      value: { r: 0.247, g: 0.318, b: 0.71, a: 1 },
      description: 'Primary brand color',
    },
    'Spacing/Large': {
      type: 'number',
      value: 24,
      description: 'Large spacing value',
    },
    'Border Radius': {
      type: 'number',
      value: 8,
      description: 'Default border radius',
    },
  },
};

function generateCSSVariables(tokens) {
  let css = ':root {\n';

  // Process styles
  for (const [name, style] of Object.entries(tokens.styles)) {
    const varName = tokenNameToCSSVar(name);
    if (style.type === 'color') {
      css += `  ${varName}: ${style.value};\n`;
    }
  }

  // Process variables
  for (const [name, variable] of Object.entries(tokens.variables)) {
    const varName = tokenNameToCSSVar(name);
    if (variable.type === 'color') {
      css += `  ${varName}: ${formatColorValue(variable.value)};\n`;
    } else if (variable.type === 'number') {
      css += `  ${varName}: ${variable.value}px;\n`;
    }
  }

  css += '}\n';
  return css;
}

function generateComponentCSS(tokens, componentNameKebab) {
  let css = `/* ${componentNameKebab} component styles using design tokens */\n\n`;

  css += `.${componentNameKebab}-container {\n`;

  // Apply color tokens
  const colorTokens = extractColorTokens(tokens);
  if (colorTokens.length > 0) {
    css += `  background-color: var(${tokenNameToCSSVar(colorTokens[0])});\n`;
  }

  css += `  padding: var(${tokenNameToCSSVar('Spacing/Large')});\n`;
  css += `  border-radius: var(${tokenNameToCSSVar('Border Radius')});\n`;
  css += `}\n\n`;

  // Add typography styles
  for (const [name, style] of Object.entries(tokens.styles)) {
    if (style.type === 'typography') {
      css += `.typography-${name.toLowerCase().replace(/\s+/g, '-')} {\n`;
      css += `  font-family: ${style.value.fontFamily};\n`;
      css += `  font-size: ${style.value.fontSize}px;\n`;
      css += `  font-weight: ${style.value.fontWeight};\n`;
      css += `  line-height: ${style.value.lineHeight}px;\n`;
      css += `}\n\n`;
    }
  }

  return css;
}

function generateTypeScriptComponent(componentName, componentNameKebab, tokens) {
  let ts = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${componentNameKebab}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${componentNameKebab}.component.html',
  styleUrls: ['./${componentNameKebab}.component.css']
})
export class ${componentName}Component {
  title = '${componentName}';

  // Design token properties
`;

  // Add token properties
  for (const [name, variable] of Object.entries(tokens.variables)) {
    const propName = tokenNameToProperty(name);
    ts += `  ${propName}: ${getTypeScriptType(variable.type)} = ${formatValueForTS(variable.value, variable.type)};\n`;
  }

  ts += `
  constructor() {}

  ngOnInit(): void {
    // Component initialized with design tokens from Figma
  }
}
`;

  return ts;
}

function generateHTMLTemplate(componentNameKebab, tokens) {
  let html = `<div class="${componentNameKebab}-container">
  <h1 class="typography-heading-typography">{{ title }}</h1>
  <p class="typography-body-typography">This component was generated from Figma design tokens.</p>

  <!-- Display design token values -->
  <div class="token-display">
    <h3>Design Tokens:</h3>
`;

  for (const [name, variable] of Object.entries(tokens.variables)) {
    const propName = tokenNameToProperty(name);
    html += `    <p><strong>${name}:</strong> {{ ${propName} }}</p>\n`;
  }

  html += `  </div>
</div>
`;

  return html;
}

function tokenNameToCSSVar(name) {
  return `--${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

function tokenNameToProperty(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function getTypeScriptType(tokenType) {
  const typeMap = {
    'color': 'string',
    'number': 'number',
    'string': 'string',
    'boolean': 'boolean',
  };
  return typeMap[tokenType] || 'any';
}

function formatValueForTS(value, type) {
  if (type === 'string') {
    return `'${value}'`;
  } else if (type === 'color') {
    return `'${formatColorValue(value)}'`;
  }
  return JSON.stringify(value);
}

function formatColorValue(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'r' in value) {
    const { r, g, b, a = 1 } = value;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }
  return 'transparent';
}

function extractColorTokens(tokens) {
  const colors = [];

  for (const [name, style] of Object.entries(tokens.styles)) {
    if (style.type === 'color') {
      colors.push(name);
    }
  }

  for (const [name, variable] of Object.entries(tokens.variables)) {
    if (variable.type === 'color') {
      colors.push(name);
    }
  }

  return colors;
}

function main() {
  console.log('🧪 Testing Figma Design Token to Angular Component Mapper\n');

  const componentName = 'TestTokenComponent';
  const componentNameKebab = componentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Generate outputs
  const cssVariables = generateCSSVariables(mockTokens);
  const componentCSS = generateComponentCSS(mockTokens, componentNameKebab);
  const tsComponent = generateTypeScriptComponent(componentName, componentNameKebab, mockTokens);
  const htmlTemplate = generateHTMLTemplate(componentNameKebab, mockTokens);

  // Save files
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const files = {
    'design-tokens.css': cssVariables,
    [`${componentNameKebab}.component.css`]: componentCSS,
    [`${componentNameKebab}.component.ts`]: tsComponent,
    [`${componentNameKebab}.component.html`]: htmlTemplate,
    'tokens.json': JSON.stringify(mockTokens, null, 2),
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Generated: ${filename}`);
  }

  console.log(`\n🎉 Test completed! Files generated in: ${outputDir}`);
  console.log('\n📋 Generated files:');
  console.log('- design-tokens.css: CSS custom properties from tokens');
  console.log('- test-token-component.component.*: Angular component files');
  console.log('- tokens.json: Original token data');
}

main();