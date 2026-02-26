from supabase import create_client

url = 'https://cifzlkspxjghpgxhrwkg.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4'
sb = create_client(url, key)

r = sb.table('settings').select('*').execute()
print('=== SETTINGS TABLE ===')
for s in r.data:
    print(f"{s['setting_key']:20s} = {s['setting_value']}")
