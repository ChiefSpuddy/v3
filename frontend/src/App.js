import React, { useState } from "react";
import axios from "axios";
import "./App.css"; // Ensure this file includes the new styles

function App() {
  const [file, setFile] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [cardName, setCardName] = useState(""); // Track the card name
  const [cardSetNumber, setCardSetNumber] = useState(""); // Track the card set number
  const [query, setQuery] = useState("");
  const [ebayResults, setEbayResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false); // Track file upload state
  const [scanCompleted, setScanCompleted] = useState(false); // Track scan completion state

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileUploaded(true); // Update file uploaded state
    setScanCompleted(false); // Reset scan completed state
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

      const resultText = response.data.text.join(", ");
      setOcrResult(resultText);

      // Extract card name
      const name = extractCardName(resultText);
      setCardName(name);

      // Extract card set number
      const setNumber = extractCardSetNumber(resultText);
      setCardSetNumber(setNumber);

      setScanCompleted(true); // Mark scan as completed
    } catch (error) {
      console.error("Error uploading and scanning file:", error);
      alert("Failed to scan file.");
    } finally {
      setLoading(false);
    }
  };

  const extractCardName = (text) => {
    const exclusions = [
      "basic",
      "trainer",
      "item",
      "supporter",
      "utem",
      "basc",
      "basig",
      "iten",
      "stagg]",
      "basis",
      "stage]",
    ]; // Words to ignore
    const entries = text.split(",").map((entry) => entry.trim()); // Split and trim entries

    // Filter out unwanted entries
    const validEntries = entries.filter((entry) => {
      const lowerCaseEntry = entry.toLowerCase();
      return !exclusions.includes(lowerCaseEntry) && entry.length > 1; // Exclude short or unwanted entries
    });

    if (validEntries.length > 0) {
      // Handle multi-word names and add a space before 'EX' (case-insensitive)
      return validEntries[0]
        .replace(/(ex)$/i, " EX") // Add space before 'EX'
        .replace(/[@'"]/g, "") // Remove unwanted characters
        .trim();
    }

    return "Not detected"; // Fallback if no name is found
  };

  const extractCardSetNumber = (text) => {
    // Regex to match card set numbers like 123/123, 01/123, 123/01, 01/01
    const regex = /\b\d{1,3}\/\d{1,3}\b/;
    const match = text.match(regex);
    return match ? match[0] : "Not detected"; // Return the matched set number or a fallback message
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
            {scanCompleted
              ? "Upload Another Card"
              : fileUploaded
              ? "File Uploaded"
              : "Choose File"}{" "}
            {/* Dynamically change text */}
            <input
              type="file"
              className="file-input"
              onChange={handleFileChange}
            />
          </label>
        </div>
        {file && (
          <div style={{ marginTop: "10px" }}>
            <img
              src={URL.createObjectURL(file)}
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
        <p>
          <strong>Card Name:</strong> {cardName}
        </p>
        <p>
          <strong>Card Set Number:</strong> {cardSetNumber}
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
