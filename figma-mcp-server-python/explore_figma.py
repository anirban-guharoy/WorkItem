#!/usr/bin/env python3

"""
Fetch Figma design structure to find POC designs
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

FIGMA_API_TOKEN = os.getenv("FIGMA_API_TOKEN")
FILE_KEY = 'yFsZrVGKYZvCnaL7AcnU8n'

if not FIGMA_API_TOKEN:
    print('Error: FIGMA_API_TOKEN environment variable is not set')
    exit(1)

def list_nodes(nodes, depth=0):
    """Recursively list all frames and components."""
    if not nodes:
        return

    for node in nodes:
        indent = '  ' * depth
        if node.get('type') == 'COMPONENT':
            icon = '🧩'
        elif node.get('type') == 'FRAME':
            icon = '📦'
        else:
            icon = '📄'
        node_id = f", id: {node['id']}" if node.get('id') else ''
        print(f"{indent}{icon} {node['name']} ({node['type']}{node_id})")

        if node.get('children') and len(node['children']) > 0:
            list_nodes(node['children'], depth + 1)

def fetch_figma_file():
    try:
        print('📥 Fetching Figma file structure...\n')

        response = requests.get(
            f"https://api.figma.com/v1/files/{FILE_KEY}",
            headers={"X-Figma-Token": FIGMA_API_TOKEN}
        )
        response.raise_for_status()

        data = response.json()

        print('📊 Figma File Structure:\n')
        if data.get('document') and data['document'].get('children'):
            list_nodes(data['document']['children'])

        # Save full data to file
        with open('figma-structure.json', 'w') as f:
            json.dump(data, f, indent=2)

        print('\n💾 Full data saved to figma-structure.json')

    except requests.RequestException as e:
        print(f'❌ Error: {e}')
        exit(1)

if __name__ == "__main__":
    fetch_figma_file()