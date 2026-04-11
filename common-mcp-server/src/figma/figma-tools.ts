import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { FigmaClient } from "./figma-client.js";

type TokenRecord = Record<string, { type: string; value: unknown; description?: string }>;

const figmaTools: Tool[] = [
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
		description: "Get detailed information about a specific Figma file including its structure",
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

function getClient(): FigmaClient {
	return new FigmaClient(requireEnv("FIGMA_API_TOKEN"));
}

function formatStyles(styles: Record<string, any>): TokenRecord {
	const formatted: TokenRecord = {};

	for (const style of Object.values(styles)) {
		if (!style?.name) {
			continue;
		}

		if (style.styleType === "FILL") {
			formatted[style.name] = {
				type: "color",
				value: style.description || extractColorValue(style),
			};
		} else if (style.styleType === "TEXT") {
			formatted[style.name] = {
				type: "typography",
				value: style.description || extractTypographyValue(style),
			};
		} else if (style.styleType === "EFFECT") {
			formatted[style.name] = {
				type: "effect",
				value: style.description || "shadow/effect",
			};
		}
	}

	return formatted;
}

function formatVariables(variables: Record<string, any>): TokenRecord {
	const formatted: TokenRecord = {};

	for (const variable of Object.values(variables)) {
		if (!variable?.name) {
			continue;
		}

		formatted[variable.name] = {
			type: mapVariableType(variable.resolvedType),
			value: extractVariableValue(variable),
			description: variable.description || "",
		};
	}

	return formatted;
}

function extractColorValue(style: any): string {
	if (style.fills && style.fills.length > 0) {
		const fill = style.fills[0];
		if (fill.type === "SOLID" && fill.color) {
			const { r, g, b, a = 1 } = fill.color;
			return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
		}
	}

	return "unknown";
}

function extractTypographyValue(style: any) {
	return {
		fontFamily: style.fontFamily || "unknown",
		fontSize: style.fontSize || "unknown",
		fontWeight: style.fontWeight || "unknown",
		lineHeight: style.lineHeightPx || "unknown",
	};
}

function mapVariableType(resolvedType: string): string {
	const typeMap: Record<string, string> = {
		COLOR: "color",
		FLOAT: "number",
		STRING: "string",
		BOOLEAN: "boolean",
	};

	return typeMap[resolvedType] || resolvedType.toLowerCase();
}

function extractVariableValue(variable: any): unknown {
	if (variable.valuesByMode) {
		const firstMode = Object.keys(variable.valuesByMode)[0];
		return variable.valuesByMode[firstMode];
	}

	return variable.value;
}

function generateAngularFromTokens(tokens: any, componentName: string) {
	const componentNameKebab = componentName
		.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
		.toLowerCase();
	const componentNameCamel = componentName.charAt(0).toUpperCase() + componentName.slice(1);

	return {
		componentName: componentNameCamel,
		files: {
			[`${componentNameKebab}.component.ts`]: generateTypeScriptComponent(componentNameCamel, componentNameKebab, tokens),
			[`${componentNameKebab}.component.html`]: generateHTMLTemplate(),
			[`${componentNameKebab}.component.css`]: generateComponentStyles(tokens),
		},
		cssVariables: generateCSSVariables(tokens),
	};
}

function generateCSSVariables(tokens: any): string {
	let css = ":root {\n";

	if (tokens.styles) {
		for (const [name, style] of Object.entries(tokens.styles)) {
			const styleEntry = style as any;
			const variableName = tokenNameToCSSVar(name);
			if (styleEntry.type === "color" && typeof styleEntry.value === "string") {
				css += `  ${variableName}: ${styleEntry.value};\n`;
			}
		}
	}

	if (tokens.variables) {
		for (const [name, variable] of Object.entries(tokens.variables)) {
			const variableEntry = variable as any;
			const variableName = tokenNameToCSSVar(name);
			if (variableEntry.type === "color" && variableEntry.value) {
				css += `  ${variableName}: ${formatColorValue(variableEntry.value)};\n`;
			} else if (variableEntry.type === "number") {
				css += `  ${variableName}: ${variableEntry.value}px;\n`;
			} else if (variableEntry.type === "string") {
				css += `  ${variableName}: \"${variableEntry.value}\";\n`;
			}
		}
	}

	css += "}\n";
	return css;
}

function generateComponentStyles(tokens: any): string {
	let css = "/* Component styles using design tokens */\n\n";
	css += ".component-container {\n";

	const colorTokens = extractColorTokens(tokens);
	if (colorTokens.length > 0) {
		css += `  background-color: var(${tokenNameToCSSVar(colorTokens[0])});\n`;
	}

	css += "}\n\n";

	if (tokens.styles) {
		for (const [name, style] of Object.entries(tokens.styles)) {
			const styleEntry = style as any;
			if (styleEntry.type === "typography") {
				const variableName = tokenNameToCSSVar(name);
				css += `.typography-${name.toLowerCase().replace(/\s+/g, "-")} {\n`;
				css += `  font-family: var(${variableName}-font-family);\n`;
				css += `  font-size: var(${variableName}-font-size);\n`;
				css += `  font-weight: var(${variableName}-font-weight);\n`;
				css += `  line-height: var(${variableName}-line-height);\n`;
				css += "}\n\n";
			}
		}
	}

	return css;
}

function generateTypeScriptComponent(componentName: string, componentNameKebab: string, tokens: any): string {
	let component = `import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-${componentNameKebab}',\n  standalone: true,\n  imports: [CommonModule],\n  templateUrl: './${componentNameKebab}.component.html',\n  styleUrls: ['./${componentNameKebab}.component.css']\n})\nexport class ${componentName}Component {\n`;

	if (tokens.variables) {
		for (const [name, variable] of Object.entries(tokens.variables)) {
			const variableEntry = variable as any;
			component += `  ${tokenNameToProperty(name)}: ${getTypeScriptType(variableEntry.type)} = ${formatValueForTS(variableEntry.value, variableEntry.type)};\n`;
		}
	}

	component += "\n  constructor() {}\n}\n";
	return component;
}

function generateHTMLTemplate(): string {
	return `<div class="component-container">\n  <h1 class="typography-heading">{{ title }}</h1>\n  <p class="typography-body">Component generated from Figma design tokens</p>\n</div>\n`;
}

function tokenNameToCSSVar(name: string): string {
	return `--${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

function tokenNameToProperty(name: string): string {
	return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function getTypeScriptType(tokenType: string): string {
	const typeMap: Record<string, string> = {
		color: "string",
		number: "number",
		string: "string",
		boolean: "boolean",
	};

	return typeMap[tokenType] || "any";
}

function formatValueForTS(value: unknown, type: string): string {
	if (type === "string") {
		return `'${value}'`;
	}

	if (type === "color") {
		return `'${formatColorValue(value)}'`;
	}

	return JSON.stringify(value);
}

function formatColorValue(value: any): string {
	if (typeof value === "string") {
		return value;
	}

	if (value && typeof value === "object" && "r" in value) {
		const { r, g, b, a = 1 } = value;
		return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
	}

	return "transparent";
}

function extractColorTokens(tokens: any): string[] {
	const colors: string[] = [];

	if (tokens.styles) {
		for (const [name, style] of Object.entries(tokens.styles)) {
			if ((style as any).type === "color") {
				colors.push(name);
			}
		}
	}

	if (tokens.variables) {
		for (const [name, variable] of Object.entries(tokens.variables)) {
			if ((variable as any).type === "color") {
				colors.push(name);
			}
		}
	}

	return colors;
}

export function getFigmaTools(): Tool[] {
	return figmaTools;
}

export async function handleFigmaTool(toolName: string, args: unknown): Promise<ToolResult> {
	try {
		const client = getClient();
		const argsObj = (args as Record<string, unknown>) || {};

		switch (toolName) {
			case "get_files": {
				const projectId = argsObj.project_id as string | undefined;
				const teamId = argsObj.team_id as string | undefined;

				if (!projectId && !teamId) {
					return failure("Error: Figma requires a project_id or team_id to list files.");
				}

				if (projectId) {
					return success(await client.getProjectFiles(projectId));
				}

				const teamProjects = (await client.getTeamProjects(teamId as string)) as {
					projects?: Array<{ id?: string; name?: string }>;
				};
				const projectFiles: Array<Record<string, unknown>> = [];

				for (const project of teamProjects.projects || []) {
					if (!project.id) {
						continue;
					}

					try {
						const projectData = (await client.getProjectFiles(project.id)) as {
							files?: unknown;
						};
						projectFiles.push({
							project: project.name,
							project_id: project.id,
							files: projectData.files,
						});
					} catch {
						continue;
					}
				}

				return success(projectFiles);
			}
			case "get_file": {
				const fileKey = argsObj.file_key as string | undefined;
				if (!fileKey) {
					return failure("Error: file_key parameter is required");
				}

				return success(await client.getFile(fileKey));
			}
			case "get_file_nodes": {
				const fileKey = argsObj.file_key as string | undefined;
				const nodeIds = argsObj.node_ids as string[] | undefined;
				if (!fileKey || !nodeIds || nodeIds.length === 0) {
					return failure("Error: file_key and node_ids are required");
				}

				return success(await client.getFileNodes(fileKey, nodeIds));
			}
			case "get_component": {
				const fileKey = argsObj.file_key as string | undefined;
				const componentId = argsObj.component_id as string | undefined;
				if (!fileKey || !componentId) {
					return failure("Error: file_key and component_id are required");
				}

				return success(await client.getFileNodes(fileKey, [componentId]));
			}
			case "extract_design_tokens": {
				const fileKey = argsObj.file_key as string | undefined;
				if (!fileKey) {
					return failure("Error: file_key parameter is required");
				}

				let styles: Record<string, any> = {};
				let variables: Record<string, any> = {};

				try {
					const stylesData = (await client.getStyles(fileKey)) as {
						meta?: { styles?: Record<string, any> };
					};
					styles = stylesData.meta?.styles || {};
				} catch {
					styles = {};
				}

				try {
					const variablesData = (await client.getVariables(fileKey)) as {
						meta?: { variables?: Record<string, any> };
					};
					variables = variablesData.meta?.variables || {};
				} catch {
					variables = {};
				}

				return success({
					styles: formatStyles(styles),
					variables: formatVariables(variables),
				});
			}
			case "map_tokens_to_angular": {
				const tokens = argsObj.tokens;
				const componentName = argsObj.component_name as string | undefined;
				if (!tokens || !componentName) {
					return failure("Error: tokens and component_name are required");
				}

				return success(generateAngularFromTokens(tokens, componentName));
			}
			default:
				return failure(`Unknown Figma tool: ${toolName}`);
		}
	} catch (error) {
		return failure(`Error: ${error instanceof Error ? error.message : String(error)}`);
	}
}
