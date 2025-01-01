import requests

# Replace with your actual generated access token
ACCESS_TOKEN = "SamMay-CardScan-SBX-9faa35af2-f7a6d731"

def search_ebay(query):
    url = f"https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q={query}"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": response.json(), "status": response.status_code}
