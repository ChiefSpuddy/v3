import React, { useState } from "react";
import axios from "axios";

function App() {
  const [text, setText] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/ocr", formData);
      setText(response.data.text);
    } catch (error) {
      console.error("Error:", error);
    }
  };
//hello
  return (
    <div>
      <h1>OCR Scanner</h1>
      <input type="file" onChange={handleFileUpload} />
      <p>Detected Text: {text}</p>
    </div>
  );
}

export default App;
