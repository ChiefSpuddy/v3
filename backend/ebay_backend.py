from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# eBay API configuration
EBAY_CLIENT_ID = "SamMay-CardScan-SBX-9faa35af2-f7a6d731"  # Replace with your actual App ID
EBAY_CLIENT_SECRET = "SBX-faa35af2396e-4cb7-429c-a2a3-7c9e"  # Replace with your actual Client Secret
EBAY_OAUTH_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
EBAY_SEARCH_URL = "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"

# Global variable to store the OAuth token
EBAY_ACCESS_TOKEN = None

# Verification token for Marketplace Account Deletion Notifications
EBAY_VERIFICATION_TOKEN = "my_verification_token"  # Replace with your chosen verification token


def get_ebay_oauth_token():
    """
    Fetch OAuth token from eBay API and store it globally.
    """
    global EBAY_ACCESS_TOKEN
    try:
        response = requests.post(
            EBAY_OAUTH_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth=(EBAY_CLIENT_ID, EBAY_CLIENT_SECRET),
            data={"grant_type": "client_credentials", "scope": "https://api.ebay.com/oauth/api_scope"},
        )
        response.raise_for_status()
        EBAY_ACCESS_TOKEN = response.json().get("access_token")
        print("Successfully retrieved eBay OAuth token.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching eBay OAuth token: {e}")
        EBAY_ACCESS_TOKEN = None


@app.route("/api/ebay-search", methods=["POST"])
def ebay_search():
    """
    Search eBay using the card name and set number.
    """
    global EBAY_ACCESS_TOKEN
    if not EBAY_ACCESS_TOKEN:
        get_ebay_oauth_token()

    if not EBAY_ACCESS_TOKEN:
        return jsonify({"error": "Failed to retrieve eBay OAuth token"}), 500

    # Get card details from the request body
    data = request.json
    card_name = data.get("cardName")
    card_set_number = data.get("cardSetNumber")

    if not card_name or not card_set_number:
        return jsonify({"error": "Card name and set number are required."}), 400

    query = f"{card_name} {card_set_number}"
    params = {
        "q": query,
        "limit": 5,  # Limit the results to 5 items
    }
    headers = {
        "Authorization": f"Bearer {EBAY_ACCESS_TOKEN}",
    }

    try:
        # Make the request to the eBay API
        response = requests.get(EBAY_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()  # Raise an error for HTTP 4xx/5xx codes

        # Parse the eBay API response
        items = [
            {
                "title": item["title"],
                "price": item["price"]["value"],
                "link": item["itemWebUrl"],
            }
            for item in response.json().get("itemSummaries", [])
        ]
        return jsonify(items)
    except requests.exceptions.RequestException as e:
        print(f"Error with eBay API request: {e}")  # Debugging log
        return jsonify({"error": f"Failed to fetch eBay results: {str(e)}"}), 500


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
    app.run(port=5001, debug=True)
