from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import requests
import re
import base64

app = Flask(__name__)
CORS(app)

# eBay API configuration (use your live eBay credentials)
EBAY_CLIENT_ID = "SamMay-CardScan-PRD-4227403db-8b726135"  # Replace with your live eBay App ID (Client ID)
EBAY_CLIENT_SECRET = "PRD-227403db4eda-4945-4811-aabd-f9fe"  # Replace with your live eBay Client Secret (Cert ID)
EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"  # Production URL for OAuth token
EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"  # Production URL for eBay search

# Global variable to store the OAuth token
EBAY_ACCESS_TOKEN = None

# Verification token for Marketplace Account Deletion Notifications
EBAY_VERIFICATION_TOKEN = "a7b3f9d1-e0b5-43b7-bf3c-05d4b7fd2186"  # Your verification token, ensure it matches the one in eBay Developer Portal

def get_ebay_oauth_token():
    """Fetch OAuth token from eBay API and store it globally."""
    global EBAY_ACCESS_TOKEN
    try:
        # Base64 encode the client credentials for HTTP Basic Auth
        credentials = base64.b64encode(f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode('utf-8')).decode('utf-8')

        # Prepare the data for the POST request to eBay OAuth endpoint
        data = {
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope"
        }

        # Send POST request to eBay OAuth endpoint
        response = requests.post(
            EBAY_OAUTH_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data=data
        )

        # Check if the response is successful
        response.raise_for_status()

        # Parse the response and extract the token
        token_data = response.json()
        EBAY_ACCESS_TOKEN = token_data.get("access_token")

        if EBAY_ACCESS_TOKEN:
            print("Successfully retrieved eBay OAuth token.")
        else:
            print("Failed to retrieve eBay OAuth token.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching eBay OAuth token: {e}")
        EBAY_ACCESS_TOKEN = None

def search_ebay(card_name, card_set_number):
    """Searches eBay UK using the card name and set number."""
    global EBAY_ACCESS_TOKEN
    if not EBAY_ACCESS_TOKEN:
        get_ebay_oauth_token()

    if not EBAY_ACCESS_TOKEN:
        return {"error": "Failed to retrieve eBay OAuth token"}

    query = f"{card_name} {card_set_number}"
    print(f"Searching eBay for: {query}")  # Debugging log

    params = {
        "q": query,
        "limit": 5,
        "siteId": 3  # Ensure we are searching the UK eBay marketplace
    }
    headers = {
        "Authorization": f"Bearer {EBAY_ACCESS_TOKEN}",
    }

    try:
        response = requests.get(EBAY_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()  # Raise an error for bad responses
        items = response.json().get("itemSummaries", [])
        print("eBay search response:", response.json())  # Debug log

        return [
            {
                "title": item.get("title", "N/A"),
                "viewItemURL": item.get("itemWebUrl", "N/A"),
                "price": item.get("price", {}).get("value", "N/A"),
            }
            for item in items
        ]
    except requests.exceptions.RequestException as e:
        print(f"Error with eBay API request: {e}")  # Log error
        return {"error": str(e)}


@app.route("/ocr", methods=["POST"])
def ocr():
    """Handles OCR processing and returns extracted card details."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        # Initialize EasyOCR Reader
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)

        # Extract card name and set number
        card_name = extract_card_name(results)
        card_set_number = extract_card_set_number(results)

        # Fetch eBay results using extracted details
        ebay_results = search_ebay(card_name, card_set_number)

        return jsonify({
            "text": results,
            "cardName": card_name,
            "cardSetNumber": card_set_number,
            "ebayResults": ebay_results
        })
    except Exception as e:
        return jsonify({"error": f"Failed to process the file: {str(e)}"}), 500

def extract_card_name(text):
    """Extracts the card name from OCR text."""
    exclusions = [
        "basic", "trainer", "item", "supporter", "utem", "basc", "basig",
        "iten", "stagg]", "basis", "stage]",
    ]
    result_str = " ".join(text)
    entries = result_str.split(" ")
    valid_entries = [entry.strip() for entry in entries if entry.lower() not in exclusions and len(entry) > 1]
    return valid_entries[0] if valid_entries else "Not Detected"

def extract_card_set_number(text):
    """Extracts the card set number from OCR text."""
    result_str = " ".join(text)
    matches = re.findall(r'\b\d{1,3}[\/|\\]\d{1,5}\b', result_str)
    return matches[0] if matches else "Not Detected"

@app.route("/api/ebay-search", methods=["POST"])
def ebay_search():
    """Search eBay using the card name and set number."""
    data = request.json
    card_name = data.get("cardName")
    card_set_number = data.get("cardSetNumber")

    if not card_name or not card_set_number:
        return jsonify({"error": "Card name and set number are required."}), 400

    ebay_results = search_ebay(card_name, card_set_number)
    return jsonify(ebay_results)

@app.route("/api/get-ebay-token", methods=["POST"])
def get_ebay_token():
    """Fetches the OAuth token from eBay and returns it."""
    global EBAY_ACCESS_TOKEN
    if not EBAY_ACCESS_TOKEN:
        get_ebay_oauth_token()

    if EBAY_ACCESS_TOKEN:
        return jsonify({"access_token": EBAY_ACCESS_TOKEN}), 200
    else:
        return jsonify({"error": "Failed to retrieve eBay OAuth token"}), 500

@app.route("/ebay/notifications", methods=["POST"])
def ebay_notifications():
    """
    Handle Marketplace Account Deletion Notifications.
    """
    data = request.json

    # Verify the token
    if data.get("verificationToken") != EBAY_VERIFICATION_TOKEN:
        print("Invalid verification token received.")
        return jsonify({"error": "Invalid token"}), 403

    # Log the notification for debugging
    print("Received Marketplace Account Deletion Notification:", data)

    # Respond with success
    return jsonify({"message": "Notification received"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5001)
