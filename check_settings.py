from supabase import create_client

url = 'https://wkyakaunbejmuzqnvgno.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY'
sb = create_client(url, key)

r = sb.table('settings').select('*').execute()
print('=== SETTINGS TABLE ===')
for s in r.data:
    print(f"{s['setting_key']:20s} = {s['setting_value']}")
