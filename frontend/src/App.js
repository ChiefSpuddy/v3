import React, { useState } from "react";
import axios from "axios";
import "./App.css"; // Ensure this file includes the new styles

function App() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(""); // Store the file preview URL
  const [ocrResult, setOcrResult] = useState("");
  const [query, setQuery] = useState("");
  const [ebayResults, setEbayResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false); // Track file upload state

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setFilePreview(URL.createObjectURL(uploadedFile)); // Create a preview URL
    setFileUploaded(true); // Update file uploaded state
  };

  const handleScan = async () => {
    if (!file) {
      console.error("No file selected!");
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:5000/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOcrResult(response.data.text.join(", "));
    } catch (error) {
      console.error("Error uploading and scanning file:", error);
      alert("Failed to scan file.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query) {
      alert("Please enter a search query.");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:5000/ebay", { query });
      setEbayResults(response.data.items);
    } catch (error) {
      console.error("Error fetching eBay results:", error);
      alert("Failed to fetch eBay results.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Card Scanner & eBay Search</h1>

      {/* OCR Section */}
      <section>
        <h2>OCR Scanner</h2>
        <div className="file-input-container">
          <label className="file-label">
            {fileUploaded ? "File Uploaded" : "Choose File"} {/* Change text dynamically */}
            <input
              type="file"
              className="file-input"
              onChange={handleFileChange}
            />
          </label>
        </div>
        {filePreview && (
          <div style={{ marginTop: "10px" }}>
            <img
              src={filePreview}
              alt="Uploaded File Preview"
              style={{ width: "200px", border: "1px solid #ccc" }}
            />
          </div>
        )}
        <button
          onClick={handleScan}
          className={`button ${loading ? "loading" : ""}`}
          disabled={loading}
        >
          {loading ? "Scanning..." : "Scan"} {/* Default text is "Scan" */}
        </button>
        <p>
          <strong>OCR Result:</strong> {ocrResult}
        </p>
      </section>

      <hr />

      {/* eBay Search Section */}
      <section>
        <h2>eBay Search</h2>
        <input
          type="text"
          placeholder="Enter search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
        <ul>
          {ebayResults.map((item, index) => (
            <li key={index}>
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title} - ${item.price}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
