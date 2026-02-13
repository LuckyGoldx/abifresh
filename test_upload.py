#!/usr/bin/env python3
import requests
import json

# Create a minimal test PNG image
image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

# Try to upload
try:
    files = {'image': ('test.png', image_data, 'image/png')}
    # Note: Using test auth token - should fail auth but we want to see the response
    headers = {'Authorization': 'Bearer test-token'}
    response = requests.post('http://localhost:5000/api/inventory/upload-image', 
                            files=files, 
                            headers=headers,
                            timeout=5)
    print(f'Status: {response.status_code}')
    print(f'Content-Type: {response.headers.get("content-type")}')
    print(f'Text (first 1000 chars): {response.text[:1000]}')
    try:
        print(f'JSON: {response.json()}')
    except Exception as je:
        print(f'Could not parse JSON response: {je}')
except Exception as e:
    print(f'Error: {e}')
