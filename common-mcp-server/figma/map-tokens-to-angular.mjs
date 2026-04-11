#!/usr/bin/env node

/**
 * Extract design tokens from Figma and map to Angular component
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN;
const FILE_KEY = process.argv[2] || process.env.FIGMA_FILE_KEY;
const COMPONENT_NAME = process.argv[3] || process.env.COMPONENT_NAME;

if (!FIGMA_API_TOKEN) {
  console.error('Error: FIGMA_API_TOKEN environment variable is not set');
  process.exit(1);
}

if (!FILE_KEY) {
  console.error('Error: Figma file key is required. Pass it as the first argument or set FIGMA_FILE_KEY.');
  process.exit(1);
}

if (!COMPONENT_NAME) {
  console.error('Error: Component name is required. Pass it as the second argument or set COMPONENT_NAME.');
  process.exit(1);
}

async function extractDesignTokens(fileKey) {
  console.log('🎨 Extracting design tokens from Figma...\n');

  try {
    // Fetch styles (legacy design tokens)
    const stylesResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/styles`, {
      headers: {
        'X-Figma-Token': FIGMA_API_TOKEN,
      },
    });

    let styles = {};
    if (stylesResponse.ok) {
      const stylesData = await stylesResponse.json();
      styles = stylesData.meta?.styles || {};
      console.log(`✅ Found ${Object.keys(styles).length} styles`);
    }

    // Fetch variables (new design tokens)
    const variablesResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables`, {
      headers: {
        'X-Figma-Token': FIGMA_API_TOKEN,
      },
    });

    let variables = {};
    if (variablesResponse.ok) {
      const variablesData = await variablesResponse.json();
      variables = variablesData.meta?.variables || {};
      console.log(`✅ Found ${Object.keys(variables).length} variables`);
    }

    return { styles, variables };
  } catch (error) {
    console.error('❌ Error extracting tokens:', error);
    process.exit(1);
  }
}

function formatTokensForAngular(tokens) {
  console.log('\n🔄 Mapping tokens to Angular format...\n');

  const { styles, variables } = tokens;

  // Format styles
  const formattedStyles = {};
  for (const [key, style] of Object.entries(styles)) {
    const s = style;
    if (s.styleType === 'FILL') {
      formattedStyles[s.name] = {
        type: 'color',
        value: extractColorValue(s),
      };
    } else if (s.styleType === 'TEXT') {
      formattedStyles[s.name] = {
        type: 'typography',
        value: extractTypographyValue(s),
      };
    }
  }

  // Format variables
  const formattedVariables = {};
  for (const [key, variable] of Object.entries(variables)) {
    const v = variable;
    formattedVariables[v.name] = {
      type: mapVariableType(v.resolvedType),
      value: extractVariableValue(v),
      description: v.description || '',
    };
  }

  return {
    styles: formattedStyles,
    variables: formattedVariables,
  };
}

function extractColorValue(style) {
  if (style.fills && style.fills.length > 0) {
    const fill = style.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const { r, g, b, a = 1 } = fill.color;
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    }
  }
  return 'transparent';
}

function extractTypographyValue(style) {
  return {
    fontFamily: style.fontFamily || 'Arial',
    fontSize: style.fontSize || 16,
    fontWeight: style.fontWeight || 400,
    lineHeight: style.lineHeightPx || style.fontSize * 1.2,
  };
}

function mapVariableType(resolvedType) {
  const typeMap = {
    'COLOR': 'color',
    'FLOAT': 'number',
    'STRING': 'string',
    'BOOLEAN': 'boolean',
  };
  return typeMap[resolvedType] || resolvedType.toLowerCase();
}

function extractVariableValue(variable) {
  if (variable.valuesByMode) {
    const firstMode = Object.keys(variable.valuesByMode)[0];
    return variable.valuesByMode[firstMode];
  }
  return variable.value;
}

function generateAngularComponent(tokens, componentName) {
  console.log('🔨 Generating Angular component from tokens...\n');

  const componentNameKebab = componentName
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase();

  const componentNameCamel = componentName
    .charAt(0).toUpperCase() + componentName.slice(1);

  // Generate CSS variables
  const cssVariables = generateCSSVariables(tokens);

  // Generate component CSS
  const componentCSS = generateComponentCSS(tokens, componentNameKebab);

  // Generate TypeScript component
  const tsComponent = generateTypeScriptComponent(componentNameCamel, componentNameKebab, tokens);

  // Generate HTML template
  const htmlTemplate = generateHTMLTemplate(componentNameKebab, tokens);

  return {
    componentName: componentNameCamel,
    files: {
      [`${componentNameKebab}.component.ts`]: tsComponent,
      [`${componentNameKebab}.component.html`]: htmlTemplate,
      [`${componentNameKebab}.component.css`]: componentCSS,
    },
    cssVariables,
  };
}

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

  css += `  padding: 20px;\n`;
  css += `}\n\n`;

  // Add typography styles
  for (const [name, style] of Object.entries(tokens.styles)) {
    if (style.type === 'typography') {
      const varName = tokenNameToCSSVar(name);
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
  <h1 class="typography-heading">{{ title }}</h1>
  <p class="typography-body">This component was generated from Figma design tokens.</p>

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

async function main() {
  console.log('🚀 Figma Design Token to Angular Component Mapper\n');

  // Extract tokens
  const rawTokens = await extractDesignTokens(FILE_KEY);

  // Format tokens
  const formattedTokens = formatTokensForAngular(rawTokens);

  // Generate Angular component
  const angularComponent = generateAngularComponent(formattedTokens, COMPONENT_NAME);

  // Save files
  const outputDir = path.join(__dirname, 'generated-component');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (const [filename, content] of Object.entries(angularComponent.files)) {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Generated: ${filename}`);
  }

  // Save CSS variables
  const cssVarsPath = path.join(outputDir, 'design-tokens.css');
  fs.writeFileSync(cssVarsPath, angularComponent.cssVariables);
  console.log(`✅ Generated: design-tokens.css`);

  // Save token data
  const tokenDataPath = path.join(outputDir, 'tokens.json');
  fs.writeFileSync(tokenDataPath, JSON.stringify(formattedTokens, null, 2));
  console.log(`✅ Generated: tokens.json`);

  console.log(`\n🎉 Component generated successfully in: ${outputDir}`);
  console.log('\n📝 To use this component:');
  console.log('1. Import the design-tokens.css in your global styles');
  console.log('2. Add the component to your Angular module or use standalone');
  console.log('3. Use the component in your templates');
}

main().catch(console.error);