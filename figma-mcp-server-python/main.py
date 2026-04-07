#!/usr/bin/env python3

import asyncio
import os
import json
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import requests
from mcp import Tool
from mcp.server import Server
from mcp.types import (
    TextContent,
    PromptMessage,
    EmbeddedResource,
    LoggingLevel
)

# Load environment variables
load_dotenv()

class FigmaMCPServer:
    def __init__(self):
        self.figma_api_token = os.getenv("FIGMA_API_TOKEN", "")
        self.figma_api_base_url = "https://api.figma.com/v1"

        # Create MCP server
        self.server = Server("figma-mcp")

        # Register tools
        self._register_tools()

    def _register_tools(self):
        """Register all available tools."""

        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            return [
                Tool(
                    name="get_files",
                    description="List Figma files from a project or team",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "project_id": {
                                "type": "string",
                                "description": "Optional Figma project ID to list files from",
                            },
                            "team_id": {
                                "type": "string",
                                "description": "Optional Figma team ID to list project files from",
                            },
                        },
                    },
                ),
                Tool(
                    name="get_file",
                    description="Get detailed information about a specific Figma file including its structure",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "file_key": {
                                "type": "string",
                                "description": "The unique identifier for the Figma file",
                            },
                        },
                        "required": ["file_key"],
                    },
                ),
                Tool(
                    name="get_file_nodes",
                    description="Get specific nodes (elements) from a Figma file",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "file_key": {
                                "type": "string",
                                "description": "The unique identifier for the Figma file",
                            },
                            "node_ids": {
                                "type": "array",
                                "description": "Array of node IDs to retrieve",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["file_key", "node_ids"],
                    },
                ),
                Tool(
                    name="get_component",
                    description="Get component details from a Figma file",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "file_key": {
                                "type": "string",
                                "description": "The unique identifier for the Figma file",
                            },
                            "component_id": {
                                "type": "string",
                                "description": "The unique identifier for the component",
                            },
                        },
                        "required": ["file_key", "component_id"],
                    },
                ),
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            try:
                if name == "get_files":
                    return await self._get_files(arguments)
                elif name == "get_file":
                    return await self._get_file(arguments)
                elif name == "get_file_nodes":
                    return await self._get_file_nodes(arguments)
                elif name == "get_component":
                    return await self._get_component(arguments)
                else:
                    return [TextContent(
                        type="text",
                        text=f"Unknown tool: {name}"
                    )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

    async def _get_files(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """List Figma files from a project or team."""
        if not self.figma_api_token:
            return [TextContent(
                type="text",
                text="Error: FIGMA_API_TOKEN environment variable is not set"
            )]

        project_id = arguments.get("project_id")
        team_id = arguments.get("team_id")

        if not project_id and not team_id:
            return [TextContent(
                type="text",
                text="Error: Figma requires a project_id or team_id to list files. Provide project_id to list files within a project, or team_id to list files for a team."
            )]

        try:
            if project_id:
                response = requests.get(
                    f"{self.figma_api_base_url}/projects/{project_id}/files",
                    headers={"X-Figma-Token": self.figma_api_token}
                )
                response.raise_for_status()
                data = response.json()
            else:
                team_response = requests.get(
                    f"{self.figma_api_base_url}/teams/{team_id}/projects",
                    headers={"X-Figma-Token": self.figma_api_token}
                )
                team_response.raise_for_status()
                team_data = team_response.json()

                project_files = []
                for project in team_data.get("projects", []):
                    project_id = project.get("id")
                    if not project_id:
                        continue

                    project_response = requests.get(
                        f"{self.figma_api_base_url}/projects/{project_id}/files",
                        headers={"X-Figma-Token": self.figma_api_token}
                    )
                    if not project_response.ok:
                        continue

                    project_data = project_response.json()
                    project_files.append({
                        "project": project.get("name"),
                        "project_id": project_id,
                        "files": project_data.get("files", []),
                    })

                data = project_files

            return [TextContent(
                type="text",
                text=json.dumps(data, indent=2)
            )]
        except requests.RequestException as e:
            return [TextContent(
                type="text",
                text=f"Error fetching files: {str(e)}"
            )]

    async def _get_file(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Get detailed information about a specific Figma file."""
        file_key = arguments.get("file_key")
        if not file_key:
            return [TextContent(
                type="text",
                text="Error: file_key parameter is required"
            )]

        try:
            response = requests.get(
                f"{self.figma_api_base_url}/files/{file_key}",
                headers={"X-Figma-Token": self.figma_api_token}
            )
            response.raise_for_status()
            data = response.json()
            return [TextContent(
                type="text",
                text=json.dumps(data, indent=2)
            )]
        except requests.RequestException as e:
            return [TextContent(
                type="text",
                text=f"Error fetching file: {str(e)}"
            )]

    async def _get_file_nodes(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Get specific nodes from a Figma file."""
        file_key = arguments.get("file_key")
        node_ids = arguments.get("node_ids", [])

        if not file_key or not node_ids:
            return [TextContent(
                type="text",
                text="Error: file_key and node_ids are required"
            )]

        try:
            node_ids_param = "&".join(f"ids={node_id}" for node_id in node_ids)
            response = requests.get(
                f"{self.figma_api_base_url}/files/{file_key}/nodes?{node_ids_param}",
                headers={"X-Figma-Token": self.figma_api_token}
            )
            response.raise_for_status()
            data = response.json()
            return [TextContent(
                type="text",
                text=json.dumps(data, indent=2)
            )]
        except requests.RequestException as e:
            return [TextContent(
                type="text",
                text=f"Error fetching nodes: {str(e)}"
            )]

    async def _get_component(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Get component details from a Figma file."""
        file_key = arguments.get("file_key")
        component_id = arguments.get("component_id")

        if not file_key or not component_id:
            return [TextContent(
                type="text",
                text="Error: file_key and component_id are required"
            )]

        try:
            response = requests.get(
                f"{self.figma_api_base_url}/files/{file_key}/nodes?ids={component_id}",
                headers={"X-Figma-Token": self.figma_api_token}
            )
            response.raise_for_status()
            data = response.json()
            return [TextContent(
                type="text",
                text=json.dumps(data, indent=2)
            )]
        except requests.RequestException as e:
            return [TextContent(
                type="text",
                text=f"Error fetching component: {str(e)}"
            )]

    async def run(self):
        """Run the MCP server."""
        from mcp.server.stdio import stdio_server

        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )


async def main():
    server = FigmaMCPServer()
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())