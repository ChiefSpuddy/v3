from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import requests

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
        # EasyOCR logic to extract text from the card image
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)
        if not results:
            return jsonify({"error": "No text detected in image"}), 500

        # Extract the card name and set number
        card_name = extract_card_name(results)
        card_set_number = extract_card_set_number(results)
        
        return jsonify({
            "text": results,
            "cardName": card_name,
            "cardSetNumber": card_set_number
        })
    except Exception as e:
        return jsonify({"error": f"Failed to process the file: {str(e)}"}), 500

def extract_card_name(text):
    exclusions = [
        "basic", "trainer", "item", "supporter", "utem", "basc", "basig", "iten", "stagg]", "basis", "stage]"
    ]
    entries = [entry.strip() for entry in text]  # Split and trim entries
    
    valid_entries = [entry for entry in entries if entry.lower() not in exclusions and len(entry) > 1]
    
    return valid_entries[0] if valid_entries else "Not Detected"

def extract_card_set_number(text):
    import re
    regex = r"\b\d{1,3}[\/|\\]\d{1,5}\b"  # Regex pattern for set number
    matches = re.findall(regex, text)
    return matches[0] if matches else "Not Detected"

if __name__ == "__main__":
    app.run(debug=True)
