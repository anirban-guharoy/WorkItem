import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

class FigmaServer {
  private server: Server;
  private figmaApiToken: string;
  private figmaApiBaseUrl: string = "https://api.figma.com/v1";

  constructor() {
    this.figmaApiToken = process.env.FIGMA_API_TOKEN || "";

    this.server = new Server(
      {
        name: "figma-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "get_files":
            return await this.getFiles(request.params.arguments);
          case "get_file":
            return await this.getFile(request.params.arguments);
          case "get_file_nodes":
            return await this.getFileNodes(request.params.arguments);
          case "get_component":
            return await this.getComponent(request.params.arguments);
          case "extract_design_tokens":
            return await this.extractDesignTokens(request.params.arguments);
          case "map_tokens_to_angular":
            return await this.mapTokensToAngular(request.params.arguments);
          default:
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Unknown tool: ${request.params.name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: "get_files",
        description: "List Figma files from a project or team",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Optional Figma project ID to list files from",
            },
            team_id: {
              type: "string",
              description: "Optional Figma team ID to list project files from",
            },
          },
        },
      },
      {
        name: "get_file",
        description:
          "Get detailed information about a specific Figma file including its structure",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
          },
          required: ["file_key"],
        },
      },
      {
        name: "get_file_nodes",
        description: "Get specific nodes (elements) from a Figma file",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
            node_ids: {
              type: "array",
              description: "Array of node IDs to retrieve",
              items: { type: "string" },
            },
          },
          required: ["file_key", "node_ids"],
        },
      },
      {
        name: "get_component",
        description: "Get component details from a Figma file",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
            component_id: {
              type: "string",
              description: "The unique identifier for the component",
            },
          },
          required: ["file_key", "component_id"],
        },
      },
      {
        name: "extract_design_tokens",
        description: "Extract design tokens (colors, typography, spacing) from a Figma file",
        inputSchema: {
          type: "object",
          properties: {
            file_key: {
              type: "string",
              description: "The unique identifier for the Figma file",
            },
          },
          required: ["file_key"],
        },
      },
      {
        name: "map_tokens_to_angular",
        description: "Map Figma design tokens to Angular component styles and properties",
        inputSchema: {
          type: "object",
          properties: {
            tokens: {
              type: "object",
              description: "Design tokens extracted from Figma",
            },
            component_name: {
              type: "string",
              description: "Name of the Angular component to generate",
            },
          },
          required: ["tokens", "component_name"],
        },
      },
    ];
  }

  private async getFiles(args?: unknown) {
    if (!this.figmaApiToken) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: FIGMA_API_TOKEN environment variable is not set",
          },
        ],
        isError: true,
      };
    }

    const argsObj = (args as Record<string, unknown>) || {};
    const projectId = argsObj.project_id as string;
    const teamId = argsObj.team_id as string;

    if (!projectId && !teamId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Figma requires a project_id or team_id to list files. Provide project_id to list files within a project, or team_id to list files for projects in a team.",
          },
        ],
        isError: true,
      };
    }

    try {
      let data: unknown;

      if (projectId) {
        const response = await fetch(`${this.figmaApiBaseUrl}/projects/${projectId}/files`, {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        });

        if (!response.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Figma API error: ${response.status} ${response.statusText}`,
              },
            ],
            isError: true,
          };
        }

        data = await response.json();
      } else {
        const teamResponse = await fetch(`${this.figmaApiBaseUrl}/teams/${teamId}/projects`, {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        });

        if (!teamResponse.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Figma API error: ${teamResponse.status} ${teamResponse.statusText}`,
              },
            ],
            isError: true,
          };
        }

        const teamData = (await teamResponse.json()) as any;
        const projectFiles: Array<Record<string, unknown>> = [];

        for (const project of teamData.projects || []) {
          if (!project.id) continue;
          const projectResponse = await fetch(`${this.figmaApiBaseUrl}/projects/${project.id}/files`, {
            headers: {
              "X-Figma-Token": this.figmaApiToken,
            },
          });

          if (!projectResponse.ok) {
            continue;
          }

          const projectData = (await projectResponse.json()) as any;
          projectFiles.push({
            project: project.name,
            project_id: project.id,
            files: projectData.files,
          });
        }

        data = projectFiles;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getFile(args: unknown) {
    const fileKey = (args as Record<string, unknown>).file_key as string;

    if (!fileKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key parameter is required",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await fetch(`${this.figmaApiBaseUrl}/files/${fileKey}`, {
        headers: {
          "X-Figma-Token": this.figmaApiToken,
        },
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getFileNodes(args: unknown) {
    const argsObj = args as Record<string, unknown>;
    const fileKey = argsObj.file_key as string;
    const nodeIds = argsObj.node_ids as string[];

    if (!fileKey || !nodeIds || nodeIds.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key and node_ids are required",
          },
        ],
        isError: true,
      };
    }

    try {
      const nodeIdsParam = nodeIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
      const response = await fetch(
        `${this.figmaApiBaseUrl}/files/${fileKey}/nodes?${nodeIdsParam}`,
        {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        }
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching nodes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getComponent(args: unknown) {
    const argsObj = args as Record<string, unknown>;
    const fileKey = argsObj.file_key as string;
    const componentId = argsObj.component_id as string;

    if (!fileKey || !componentId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key and component_id are required",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await fetch(
        `${this.figmaApiBaseUrl}/files/${fileKey}/nodes?ids=${encodeURIComponent(componentId)}`,
        {
          headers: {
            "X-Figma-Token": this.figmaApiToken,
          },
        }
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Figma API error: ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching component: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async extractDesignTokens(args: unknown) {
    const fileKey = (args as Record<string, unknown>).file_key as string;

    if (!fileKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: file_key parameter is required",
          },
        ],
        isError: true,
      };
    }

    try {
      // Fetch styles (legacy design tokens)
      const stylesResponse = await fetch(`${this.figmaApiBaseUrl}/files/${fileKey}/styles`, {
        headers: {
          "X-Figma-Token": this.figmaApiToken,
        },
      });

      let styles: any = {};
      if (stylesResponse.ok) {
        const stylesData = await stylesResponse.json() as any;
        styles = stylesData.meta?.styles || {};
      }

      // Fetch variables (new design tokens)
      const variablesResponse = await fetch(`${this.figmaApiBaseUrl}/files/${fileKey}/variables`, {
        headers: {
          "X-Figma-Token": this.figmaApiToken,
        },
      });

      let variables: any = {};
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json() as any;
        variables = variablesData.meta?.variables || {};
      }

      // Combine and format tokens
      const designTokens = {
        styles: this.formatStyles(styles),
        variables: this.formatVariables(variables),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(designTokens, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error extracting design tokens: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatStyles(styles: any): any {
    const formatted: any = {};

    for (const [key, style] of Object.entries(styles)) {
      const s = style as any;
      if (s.styleType === 'FILL') {
        formatted[s.name] = {
          type: 'color',
          value: s.description || this.extractColorValue(s),
        };
      } else if (s.styleType === 'TEXT') {
        formatted[s.name] = {
          type: 'typography',
          value: s.description || this.extractTypographyValue(s),
        };
      } else if (s.styleType === 'EFFECT') {
        formatted[s.name] = {
          type: 'effect',
          value: s.description || 'shadow/effect',
        };
      }
    }

    return formatted;
  }

  private formatVariables(variables: any): any {
    const formatted: any = {};

    for (const [key, variable] of Object.entries(variables)) {
      const v = variable as any;
      formatted[v.name] = {
        type: this.mapVariableType(v.resolvedType),
        value: this.extractVariableValue(v),
        description: v.description || '',
      };
    }

    return formatted;
  }

  private extractColorValue(style: any): string {
    // Extract color from style definition
    if (style.fills && style.fills.length > 0) {
      const fill = style.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b, a = 1 } = fill.color;
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }
    return 'unknown';
  }

  private extractTypographyValue(style: any): any {
    // Extract typography from style definition
    return {
      fontFamily: style.fontFamily || 'unknown',
      fontSize: style.fontSize || 'unknown',
      fontWeight: style.fontWeight || 'unknown',
      lineHeight: style.lineHeightPx || 'unknown',
    };
  }

  private mapVariableType(resolvedType: string): string {
    const typeMap: { [key: string]: string } = {
      'COLOR': 'color',
      'FLOAT': 'number',
      'STRING': 'string',
      'BOOLEAN': 'boolean',
    };
    return typeMap[resolvedType] || resolvedType.toLowerCase();
  }

  private extractVariableValue(variable: any): any {
    if (variable.valuesByMode) {
      // Return the first mode's value
      const firstMode = Object.keys(variable.valuesByMode)[0];
      return variable.valuesByMode[firstMode];
    }
    return variable.value;
  }

  private async mapTokensToAngular(args: unknown) {
    const argsObj = args as Record<string, unknown>;
    const tokens = argsObj.tokens as any;
    const componentName = argsObj.component_name as string;

    if (!tokens || !componentName) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: tokens and component_name are required",
          },
        ],
        isError: true,
      };
    }

    try {
      const angularMapping = this.generateAngularFromTokens(tokens, componentName);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(angularMapping, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error mapping tokens to Angular: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private generateAngularFromTokens(tokens: any, componentName: string): any {
    const componentNameKebab = componentName
      .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
      .toLowerCase();

    const componentNameCamel = componentName
      .charAt(0).toUpperCase() + componentName.slice(1);

    // Generate CSS variables from tokens
    const cssVariables = this.generateCSSVariables(tokens);

    // Generate component styles
    const componentStyles = this.generateComponentStyles(tokens);

    // Generate TypeScript component with token properties
    const tsComponent = this.generateTypeScriptComponent(componentNameCamel, componentNameKebab, tokens);

    // Generate HTML template
    const htmlTemplate = this.generateHTMLTemplate(componentNameKebab, tokens);

    return {
      componentName: componentNameCamel,
      files: {
        [`${componentNameKebab}.component.ts`]: tsComponent,
        [`${componentNameKebab}.component.html`]: htmlTemplate,
        [`${componentNameKebab}.component.css`]: componentStyles,
      },
      cssVariables,
    };
  }

  private generateCSSVariables(tokens: any): string {
    let css = ':root {\n';

    // Process styles
    if (tokens.styles) {
      for (const [name, style] of Object.entries(tokens.styles)) {
        const s = style as any;
        const varName = this.tokenNameToCSSVar(name);
        if (s.type === 'color' && typeof s.value === 'string') {
          css += `  ${varName}: ${s.value};\n`;
        }
      }
    }

    // Process variables
    if (tokens.variables) {
      for (const [name, variable] of Object.entries(tokens.variables)) {
        const v = variable as any;
        const varName = this.tokenNameToCSSVar(name);
        if (v.type === 'color' && v.value) {
          css += `  ${varName}: ${this.formatColorValue(v.value)};\n`;
        } else if (v.type === 'number') {
          css += `  ${varName}: ${v.value}px;\n`;
        } else if (v.type === 'string') {
          css += `  ${varName}: "${v.value}";\n`;
        }
      }
    }

    css += '}\n';
    return css;
  }

  private generateComponentStyles(tokens: any): string {
    let css = `/* Component styles using design tokens */\n\n`;

    css += `.component-container {\n`;

    // Apply color tokens
    if (tokens.styles || tokens.variables) {
      const colorTokens = this.extractColorTokens(tokens);
      if (colorTokens.length > 0) {
        css += `  background-color: var(${this.tokenNameToCSSVar(colorTokens[0])});\n`;
      }
    }

    css += `}\n\n`;

    // Add typography styles
    if (tokens.styles) {
      for (const [name, style] of Object.entries(tokens.styles)) {
        const s = style as any;
        if (s.type === 'typography') {
          const varName = this.tokenNameToCSSVar(name);
          css += `.typography-${name.toLowerCase().replace(/\s+/g, '-')} {\n`;
          css += `  font-family: var(${varName}-font-family);\n`;
          css += `  font-size: var(${varName}-font-size);\n`;
          css += `  font-weight: var(${varName}-font-weight);\n`;
          css += `  line-height: var(${varName}-line-height);\n`;
          css += `}\n\n`;
        }
      }
    }

    return css;
  }

  private generateTypeScriptComponent(componentName: string, componentNameKebab: string, tokens: any): string {
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
  // Design token properties
`;

    // Add token properties
    if (tokens.variables) {
      for (const [name, variable] of Object.entries(tokens.variables)) {
        const v = variable as any;
        const propName = this.tokenNameToProperty(name);
        ts += `  ${propName}: ${this.getTypeScriptType(v.type)} = ${this.formatValueForTS(v.value, v.type)};\n`;
      }
    }

    ts += `
  constructor() {}

  ngOnInit(): void {
    // Initialize component with design tokens
  }
}
`;

    return ts;
  }

  private generateHTMLTemplate(componentNameKebab: string, tokens: any): string {
    let html = `<div class="component-container">
  <h1 class="typography-heading">{{ title }}</h1>
  <p class="typography-body">Component generated from Figma design tokens</p>
</div>
`;

    return html;
  }

  private tokenNameToCSSVar(name: string): string {
    return `--${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }

  private tokenNameToProperty(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private getTypeScriptType(tokenType: string): string {
    const typeMap: { [key: string]: string } = {
      'color': 'string',
      'number': 'number',
      'string': 'string',
      'boolean': 'boolean',
    };
    return typeMap[tokenType] || 'any';
  }

  private formatValueForTS(value: any, type: string): string {
    if (type === 'string') {
      return `'${value}'`;
    } else if (type === 'color') {
      return `'${this.formatColorValue(value)}'`;
    }
    return JSON.stringify(value);
  }

  private formatColorValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && 'r' in value) {
      const { r, g, b, a = 1 } = value;
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    }
    return 'transparent';
  }

  private extractColorTokens(tokens: any): string[] {
    const colors: string[] = [];

    if (tokens.styles) {
      for (const [name, style] of Object.entries(tokens.styles)) {
        const s = style as any;
        if (s.type === 'color') {
          colors.push(name);
        }
      }
    }

    if (tokens.variables) {
      for (const [name, variable] of Object.entries(tokens.variables)) {
        const v = variable as any;
        if (v.type === 'color') {
          colors.push(name);
        }
      }
    }

    return colors;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Figma MCP server running on stdio");
  }
}

const server = new FigmaServer();
server.start().catch(console.error);
