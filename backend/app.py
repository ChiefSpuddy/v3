from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
import easyocr

app = Flask(__name__)
CORS(app)

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # EasyOCR logic
    reader = easyocr.Reader(["en"])
    results = reader.readtext(file.read(), detail=0)
    return jsonify({"text": results})


@app.route("/ebay", methods=["POST"])
def ebay_search():
    data = request.json
    query = data.get("query")

    if not query:
        return jsonify({"error": "No search query provided"}), 400

    EBAY_APP_ID = "SamMay-CardScan-SBX-9faa35af2-f7a6d731"
    EBAY_SEARCH_URL = "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"

    params = {"q": query, "limit": 5}
    headers = {"Authorization": f"Bearer SBX-faa35af2396e-4cb7-429c-a2a3-7c9e"}

    try:
        response = requests.get(EBAY_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()
        items = [
            {
                "title": item["title"],
                "price": item["price"]["value"],
                "link": item["itemWebUrl"],
            }
            for item in response.json().get("itemSummaries", [])
        ]
        return jsonify({"items": items})
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)