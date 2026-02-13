import requests
response = requests.get('http://localhost:5000/health', timeout=5)
print(response.text)
