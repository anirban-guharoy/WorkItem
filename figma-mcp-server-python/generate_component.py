#!/usr/bin/env python3

"""
Figma to Angular Component Generator
Fetches design from Figma and generates Angular component
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

FIGMA_API_TOKEN = os.getenv("FIGMA_API_TOKEN")
FILE_KEY = 'yFsZrVGKYZvCnaL7AcnU8n'
COMPONENT_NAME = 'FigmaPoC'

if not FIGMA_API_TOKEN:
    print('Error: FIGMA_API_TOKEN environment variable is not set')
    exit(1)

def fetch_figma_file():
    """Fetch Figma design file."""
    try:
        print('📥 Fetching Figma design file...')

        response = requests.get(
            f"https://api.figma.com/v1/files/{FILE_KEY}",
            headers={"X-Figma-Token": FIGMA_API_TOKEN}
        )
        response.raise_for_status()

        data = response.json()
        print('✅ File fetched successfully')

        return data
    except requests.RequestException as e:
        print(f'❌ Error fetching Figma file: {e}')
        exit(1)

def extract_design_info(figma_file):
    """Extract design information from Figma file."""
    file_data = figma_file

    # Extract basic info
    name = file_data.get('name', 'Component')
    nodes = file_data.get('document', {}).get('children', [])

    print(f"📄 File: {name}")
    print(f"📦 Top-level frames/sections: {len(nodes)}")

    # Get first page/frame for basic structure
    structure = {
        'name': name,
        'nodes': [
            {
                'id': n['id'],
                'name': n['name'],
                'type': n['type'],
                'children': len(n.get('children', [])),
            }
            for n in nodes
        ],
    }

    return structure

def generate_angular_component(component_name, design):
    """Generate Angular component files."""

    # Convert to kebab-case
    component_name_kebab = re.sub(r'([a-z0-9]|(?=[A-Z]))([A-Z])', r'\1-\2', component_name).lower()

    # Convert to PascalCase
    component_name_camel = component_name[0].upper() + component_name[1:]

    # Generate TypeScript component
    ts_component = f"""import {{ Component }} from '@angular/core';
import {{ CommonModule }} from '@angular/common';

@Component({{
  selector: 'app-{component_name_kebab}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './{component_name_kebab}.component.html',
  styleUrls: ['./{component_name_kebab}.component.css']
}})
export class {component_name_camel}Component {{
  title = '{component_name}';

  // Add your component logic here
  constructor() {{}}

  ngOnInit(): void {{
    // Initialize component
  }}
}}
"""

    # Generate HTML template
    html_template = f"""<div class="figma-component">
  <h1>{{{{ title }}}}</h1>

  <!-- Component content from Figma design -->
  <div class="design-layout">
    <!-- Replace with actual design elements -->
    <p>Design elements rendered based on Figma structure:</p>
    <ul>
""" + '\n'.join(f"      <li><strong>{node['name']}</strong> ({node['type']})</li>" for node in design['nodes']) + """
    </ul>
  </div>
</div>
"""

    # Generate CSS styles
    css_styles = """.figma-component {
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
"""

    # Generate spec file for testing
    spec_file = f"""import {{ ComponentFixture, TestBed }} from '@angular/core/testing';

import {{ {component_name_camel}Component }} from './{component_name_kebab}.component';

describe('{component_name_camel}Component', () => {{
  let component: {component_name_camel}Component;
  let fixture: ComponentFixture<{component_name_camel}Component>;

  beforeEach(async () => {{
    await TestBed.configureTestingModule({{
      imports: [{component_name_camel}Component]
    }})
    .compileComponents();

    fixture = TestBed.createComponent({component_name_camel}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }});

  it('should create', () => {{
    expect(component).toBeTruthy();
  }});

  it('should display title', () => {{
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('{component_name}');
  }});
}});
"""

    return {
        'ts': ts_component,
        'html': html_template,
        'css': css_styles,
        'spec': spec_file,
        'component_name_kebab': component_name_kebab,
    }

def main():
    try:
        # Fetch Figma file
        figma_file = fetch_figma_file()

        # Extract design information
        design = extract_design_info(figma_file)

        # Generate component files
        print('\n🔨 Generating Angular component...')
        component_files = generate_angular_component(COMPONENT_NAME, design)

        # Prepare component directory in angular-app
        angular_app_path = Path('/Users/anirban/Desktop/WorkItem/Angular PoC/angular-app')
        component_dir = angular_app_path / 'src' / 'app' / component_files['component_name_kebab']

        # Create component directory
        component_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {component_dir}")

        # Write component files
        files = [
            (f"{component_files['component_name_kebab']}.component.ts", component_files['ts']),
            (f"{component_files['component_name_kebab']}.component.html", component_files['html']),
            (f"{component_files['component_name_kebab']}.component.css", component_files['css']),
            (f"{component_files['component_name_kebab']}.component.spec.ts", component_files['spec']),
        ]

        for filename, content in files:
            file_path = component_dir / filename
            file_path.write_text(content)
            print(f"✅ Created: {filename}")

        print('\n📦 Component Files Generated:')
        print(f"📁 {component_dir}")
        for filename, _ in files:
            print(f"   ├── {filename}")

        print('\n✨ Next steps:')
        print(f"1. Import the component in your Angular app")
        print(f"2. Use it in templates: <app-{component_files['component_name_kebab']}></app-{component_files['component_name_kebab']}>")
        print(f"3. Customize the component with your design details")

    except Exception as e:
        print(f'Error: {e}')
        exit(1)

if __name__ == "__main__":
    main()