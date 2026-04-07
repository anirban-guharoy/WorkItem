#!/usr/bin/env python3

"""
Find and extract POC design from Figma
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

FIGMA_API_TOKEN = os.getenv("FIGMA_API_TOKEN")
FILE_KEY = 'yFsZrVGKYZvCnaL7AcnU8n'

if not FIGMA_API_TOKEN:
    print('Error: FIGMA_API_TOKEN environment variable is not set')
    exit(1)

def search_nodes(nodes, parent_path=''):
    """Recursively search for frames and components."""
    designs = []
    if not nodes:
        return designs

    for node in nodes:
        full_path = f"{parent_path} > {node['name']}" if parent_path else node['name']

        if node['type'] in ['FRAME', 'COMPONENT']:
            designs.append({
                'name': node['name'],
                'id': node['id'],
                'type': node['type'],
                'path': full_path,
                'child_count': len(node.get('children', [])),
            })

        if node.get('children') and len(node['children']) > 0:
            designs.extend(search_nodes(node['children'], full_path))

    return designs

def find_poc_design():
    try:
        print('📥 Fetching Figma file...\n')

        response = requests.get(
            f"https://api.figma.com/v1/files/{FILE_KEY}",
            headers={"X-Figma-Token": FIGMA_API_TOKEN}
        )
        response.raise_for_status()

        data = response.json()
        designs = []

        if data.get('document') and data['document'].get('children'):
            designs = search_nodes(data['document']['children'])

        # Display designs
        print('🎨 Available Designs in Figma:\n')
        for idx, design in enumerate(designs, 1):
            print(f"{idx}. {design['name']}")
            print(f"   Type: {design['type']} | ID: {design['id']} | Elements: {design['child_count']}")
            print(f"   Path: {design['path']}\n")

        # Find POC-related designs
        poc_designs = [
            d for d in designs
            if 'poc' in d['name'].lower() or
               'poc named design' in d['name'].lower() or
               'design' in d['name'].lower()
        ]

        if poc_designs:
            print('\n🔍 POC-related designs found:\n')
            for design in poc_designs:
                print(f"✓ {design['name']} ({design['id']})")

    except requests.RequestException as e:
        print(f'❌ Error: {e}')
        exit(1)

if __name__ == "__main__":
    find_poc_design()