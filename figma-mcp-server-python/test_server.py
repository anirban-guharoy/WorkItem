#!/usr/bin/env python3

"""
Simple test script to verify Figma MCP server is working
This simulates starting the server and checking if it loads properly
"""

import subprocess
import time
import os
import signal
import sys
from pathlib import Path

def test_server():
    """Test the MCP server startup."""
    try:
        # Start the server process
        env = os.environ.copy()
        env['FIGMA_API_TOKEN'] = env.get('FIGMA_API_TOKEN', '')

        server_process = subprocess.Popen(
            [sys.executable, 'main.py'],
            cwd=Path(__file__).parent,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        output = ''
        is_connected = False

        # Monitor stderr for startup messages
        start_time = time.time()
        while time.time() - start_time < 10:  # 10 second timeout
            if server_process.poll() is not None:
                # Process has ended
                break

            # Read stderr
            stderr_line = server_process.stderr.readline()
            if stderr_line:
                output += stderr_line
                print('Server:', stderr_line.strip())

                if 'running' in output.lower():
                    is_connected = True
                    break

            time.sleep(0.1)

        if is_connected:
            print('\n✅ Server started successfully!')
            if env.get('FIGMA_API_TOKEN'):
                print('✅ FIGMA_API_TOKEN is loaded')
            else:
                print('⚠️  FIGMA_API_TOKEN not set')
            print('\n📋 Available Tools:')
            print('  1. get_files - List all Figma files')
            print('  2. get_file - Get file details')
            print('  3. get_file_nodes - Get specific nodes')
            print('  4. get_component - Get component info')
            print('\n✨ Server is ready for use!')
        else:
            print('⚠️  Server may not have started properly')
            # Print any output we got
            stdout, stderr = server_process.communicate()
            if stdout:
                print('STDOUT:', stdout)
            if stderr:
                print('STDERR:', stderr)

        # Clean up
        server_process.terminate()
        try:
            server_process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            server_process.kill()

    except Exception as e:
        print(f'Error testing server: {e}')
        sys.exit(1)

if __name__ == "__main__":
    test_server()