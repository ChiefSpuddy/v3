from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import requests
import re
import base64

app = Flask(__name__)
CORS(app)

# eBay API configuration
EBAY_CLIENT_ID = "SamMay-CardScan-PRD-4227403db-8b726135"
EBAY_CLIENT_SECRET = "PRD-227403db4eda-4945-4811-aabd-f9fe"
EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"

# Global variable to store the OAuth token
EBAY_ACCESS_TOKEN = None


def get_ebay_oauth_token():
    """Fetch OAuth token from eBay API and store it globally."""
    global EBAY_ACCESS_TOKEN
    try:
        # Encode credentials for Basic Auth
        credentials = base64.b64encode(f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode()).decode()

        # Request OAuth token
        response = requests.post(
            EBAY_OAUTH_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials", "scope": "https://api.ebay.com/oauth/api_scope"},
        )
        response.raise_for_status()
        token_data = response.json()
        EBAY_ACCESS_TOKEN = token_data.get("access_token")
        print("eBay OAuth token retrieved successfully.")
    except Exception as e:
        print(f"Error fetching eBay OAuth token: {e}")
        EBAY_ACCESS_TOKEN = None


def search_ebay_items(card_name, card_set_number):
    """Search eBay for items using the Browse API."""
    global EBAY_ACCESS_TOKEN
    if not EBAY_ACCESS_TOKEN:
        get_ebay_oauth_token()

    if not EBAY_ACCESS_TOKEN:
        return {"error": "Failed to retrieve eBay OAuth token"}

    # Simplified query to ensure results
    query = f"{card_name} {card_set_number}"
    print(f"Searching eBay for: {query}")

    params = {"q": query, "limit": 10}  # Fetch first 10 results
    headers = {"Authorization": f"Bearer {EBAY_ACCESS_TOKEN}"}

    try:
        response = requests.get(EBAY_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()
        items = response.json().get("itemSummaries", [])

        if not items:
            return {"error": "No results found"}

        print(f"Found {len(items)} items.")
        return [
            {
                "title": item.get("title", "N/A"),
                "price": item.get("price", {}).get("value", "N/A"),
                "currency": item.get("price", {}).get("currency", "N/A"),
                "location": item.get("itemLocation", {}).get("country", "N/A"),
                "url": item.get("itemWebUrl", "N/A"),
            }
            for item in items
        ]
    except Exception as e:
        print(f"Error during eBay search: {e}")
        return {"error": str(e)}


@app.route("/ocr", methods=["POST"])
def ocr():
    """Handle OCR processing and fetch eBay results."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    try:
        # OCR with EasyOCR
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)

        # Extract card details
        card_name = extract_card_name(results)
        card_set_number = extract_card_set_number(results)

        # Search eBay
        ebay_results = search_ebay_items(card_name, card_set_number)
        return jsonify({"text": results, "cardName": card_name, "cardSetNumber": card_set_number, "ebayResults": ebay_results})
    except Exception as e:
        return jsonify({"error": f"Processing error: {e}"}), 500


def extract_card_name(text):
    """Extract card name from OCR text."""
    exclusions = ["basic", "trainer", "item", "supporter", "basc", "basig", "iten", "stagg]"]
    result_str = " ".join(text)
    entries = result_str.split()
    valid_entries = [entry for entry in entries if entry.lower() not in exclusions]
    return valid_entries[0] if valid_entries else "Not Detected"


def extract_card_set_number(text):
    """Extract card set number from OCR text."""
    result_str = " ".join(text)
    matches = re.findall(r'\d{1,3}[\/\\]\d{1,5}', result_str)
    return matches[0] if matches else "Not Detected"


@app.route("/api/ebay-search", methods=["POST"])
def ebay_search():
    """Search eBay with provided card details."""
    data = request.json
    card_name = data.get("cardName")
    card_set_number = data.get("cardSetNumber")

    if not card_name or not card_set_number:
        return jsonify({"error": "Card name and set number are required."}), 400

    ebay_results = search_ebay_items(card_name, card_set_number)
    return jsonify(ebay_results)


if __name__ == "__main__":
    app.run(debug=True, port=5001)