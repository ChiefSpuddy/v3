import requests

# Endpoint URL
url = "http://127.0.0.1:5000/ocr"

# Path to the test image
image_path = "test-image.png"

# Sending the request
try:
    with open(image_path, "rb") as img_file:
        files = {"file": img_file}
        response = requests.post(url, files=files)
    print(response.json())
except FileNotFoundError:
    print(f"File {image_path} not found. Ensure the file is in the same directory.")
except Exception as e:
    print(f"An error occurred: {e}")
