import requests
import os
CF_API_TOKEN = "4Tk0EZ_4G8-BYR2uPqekWZliAORWj-_9a4-nEHEZ"
CF_ACCOUNT_ID = "9a00225a365387adfb3b047cbadd38de"
url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/cfd_tunnel"
headers = {"Authorization": f"Bearer {CF_API_TOKEN}"}
r = requests.get(url, headers=headers)
print(f"S:{r.status_code}")
print(f"R:{r.text}")
