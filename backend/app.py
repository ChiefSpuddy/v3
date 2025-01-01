from flask import Flask, request, jsonify
import easyocr
import logging

logging.basicConfig(level=logging.DEBUG)
app = Flask(__name__)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "OCR endpoint is ready!"})

@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        reader = easyocr.Reader(["en"])
        results = reader.readtext(file.read(), detail=0)
        return jsonify({"text": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
