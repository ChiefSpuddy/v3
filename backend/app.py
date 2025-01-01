from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
from ebay_search import search_ebay

app = Flask(__name__)
CORS(app)

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        # EasyOCR logic
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)
        return jsonify({"text": results})
    except Exception as e:
        return jsonify({"error": f"Failed to process the file: {str(e)}"}), 500


@app.route("/ebay", methods=["POST"])
def ebay_search():
    data = request.json
    card_name = data.get("cardName")
    card_set_number = data.get("cardSetNumber")
    
    if not card_name or not card_set_number:
        return jsonify({"error": "Card name or set number not provided"}), 400

    query = f"{card_name} {card_set_number}"  # Combine name and set number to form the search query

    # Use the search_ebay function from ebay_search.py
    search_results = search_ebay(query)

    return jsonify(search_results)


if __name__ == "__main__":
    app.run(debug=True)
