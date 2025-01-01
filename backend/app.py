from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import requests

app = Flask(__name__)
CORS(app)

EBAY_APP_ID = "SamMay-CardScan-SBX-9faa35af2-f7a6d731"  # eBay App ID for sandbox testing
EBAY_SEARCH_URL = "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        # EasyOCR logic to extract text from the card image
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)

        # Extract card name and set number
        card_name = extract_card_name(results)
        card_set_number = extract_card_set_number(results)
        
        # Fetch eBay results using the extracted name and set number
        ebay_results = search_ebay(card_name, card_set_number)

        return jsonify({"text": results, "cardName": card_name, "cardSetNumber": card_set_number, "ebayResults": ebay_results})
    except Exception as e:
        return jsonify({"error": f"Failed to process the file: {str(e)}"}), 500

def search_ebay(card_name, card_set_number):
    query = f"{card_name} {card_set_number}"
    print(f"Searching eBay for: {query}")  # Debugging log
    params = {
        "q": query,
        "limit": 5,
    }
    headers = {
        "Authorization": f"Bearer {EBAY_APP_ID}",
    }

    try:
        response = requests.get(EBAY_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()  # Will raise an exception for a 4xx/5xx response
        items = [
            {
                "title": item["title"],
                "price": item["price"]["value"],
                "link": item["itemWebUrl"],
            }
            for item in response.json().get("itemSummaries", [])
        ]
        print("eBay search response:", response.json())  # Log the full response
        return items
    except requests.exceptions.RequestException as e:
        print(f"Error with eBay API request: {e}")  # Log any error
        return {"error": str(e)}

def extract_card_name(text):
    exclusions = [
        "basic", "trainer", "item", "supporter", "utem", "basc", "basig", "iten", "stagg]", "basis", "stage]",
    ]
    result_str = " ".join(text)
    entries = result_str.split(" ")
    valid_entries = [entry.strip() for entry in entries if entry.lower() not in exclusions and len(entry) > 1]
    return valid_entries[0] if valid_entries else "Not Detected"

def extract_card_set_number(text):
    result_str = " ".join(text)
    import re
    matches = re.findall(r'\b\d{1,3}[\/|\\]\d{1,5}\b', result_str)
    return matches[0] if matches else "Not Detected"

if __name__ == "__main__":
    app.run(debug=True)
