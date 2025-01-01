import os

image_path = "test-image.jpg"

if os.path.exists(image_path):
    print("File found!")
else:
    print("File not found!")
