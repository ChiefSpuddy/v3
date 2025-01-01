from flask import Flask, request, jsonify
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

    try:
        # EasyOCR logic to extract text from the card image
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)

        return jsonify({"text": results})
    except Exception as e:
        return jsonify({"error": f"Failed to process the file: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
