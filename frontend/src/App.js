// Full App.js with eBay Search Integration

import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [cardName, setCardName] = useState(""); // Track the card name
  const [cardSetNumber, setCardSetNumber] = useState(""); // Track the card set number
  const [ebayResults, setEbayResults] = useState([]); // Track eBay results
  const [loading, setLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false); // Track file upload state
  const [scanCompleted, setScanCompleted] = useState(false); // Track scan completion state

  const exclusions = [
    "hp",
    "trainer",
    "basic",
    "item",
    "stage",
    "basc",
    "utem",
    "iten",
    "splash",
    "typhoon",
    "basis",
    "basig",
  ];

  const correctMisreads = (text) => {
    return text
      .replace(/([a-zA-Z])eX\b/gi, "$1 EX") // Add space before "EX" in cases like "LatiaseX"
      .replace(/\bex\b/gi, " EX"); // Ensure "EX" is properly formatted with a leading space
  };

  const extractCardNameFromOCR = (ocrText) => {
    const segments = ocrText.split(","); // Split the OCR text by commas

    const stopwords = [
      "TRAINER",
      "ITEM",
      "STAGE",
      "ABILITY",
      "ATTACK",
      "DAMAGE",
      "WEAKNESS",
      "RESISTANCE",
      "CD",
      "HP",
      "BASIC",
    ];

    for (const segment of segments) {
      let trimmedSegment = segment.trim(); // Remove leading and trailing whitespace

      trimmedSegment = trimmedSegment.replace(/[^A-Za-z\s]/g, ""); // Clean special characters

      if (
        trimmedSegment.length > 1 &&
        /^[A-Za-z\s]+$/.test(trimmedSegment) &&
        !exclusions.includes(trimmedSegment.toLowerCase()) &&
        !stopwords.includes(trimmedSegment.toUpperCase())
      ) {
        const words = trimmedSegment.split(" ");

        if (words.length > 1 && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) {
          return `${words[0]} ${words[1]}`;
        }

        if (/^[A-Z]/.test(trimmedSegment)) {
          return trimmedSegment;
        }
      }
    }

    return "Not Detected";
  };

  const extractSetNumberFromOCR = (ocrText) => {
    const matches = ocrText.match(/\b\d+\s?\/\s?\d+\b|\b\d{1,4}\b/g); // Match "163/182" or "036 /419"

    if (!matches) return "Not Detected";

    const validMatches = matches.filter((num) => {
      if (/^\d+\s?\/\s?\d+$/.test(num)) return true; // Include valid "XXX/YYY" formats
      return !(num >= 2020 && num <= 2029); // Exclude years
    });

    const cleanedMatches = validMatches.map((num) => num.replace(/\s?\/\s?/g, "/")); // Normalize spaces around "/"

    return cleanedMatches.length > 0 ? cleanedMatches[cleanedMatches.length - 1] : "Not Detected";
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileUploaded(true);
    setScanCompleted(false);
    setOcrResult("");
    setCardName("");
    setCardSetNumber("");
    setEbayResults([]);
  };

  const handleScan = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:5001/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let resultText = response.data.text.join(", ");
      resultText = correctMisreads(resultText);
      setOcrResult(resultText);

      const name = extractCardNameFromOCR(resultText);
      const setNumber = extractSetNumberFromOCR(resultText);

      setCardName(name);
      setCardSetNumber(setNumber);
      setScanCompleted(true);
    } catch (error) {
      console.error("Error uploading and scanning file:", error);
      alert("Failed to scan file.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEbaySearch = async () => {
    if (!cardName || !cardSetNumber) {
      alert("Please scan a card to get the card name and set number first.");
      return;
    }
  
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/ebay-search", {
        cardName,
        cardSetNumber,
      });
  
      setEbayResults(response.data);
    } catch (error) {
      console.error("Error fetching eBay results:", error);
      alert("Failed to fetch eBay results.");
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Card Scanner & eBay Search</h1>

      <section>
        <h2>OCR Scanner</h2>
        <div className="file-input-container">
          <label className="file-label">
            {scanCompleted
              ? "Upload Another Card"
              : fileUploaded
              ? "File Uploaded"
              : "Choose File"}
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
          disabled={!file || loading}
        >
          {loading ? "Scanning..." : "Scan"}
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

      <section>
        <h2>eBay Results</h2>
        <button
          onClick={handleEbaySearch}
          className={`button ${loading ? "loading" : ""}`}
          disabled={!cardName || !cardSetNumber || loading}
        >
          {loading ? "Searching eBay..." : "Search eBay"}
        </button>
        <ul>
  {ebayResults.length > 0 ? (
    ebayResults.map((item, index) => (
      <li key={index}>
        {/* Display eBay item details with correct link */}
        <a
          href={item.viewItemURL || "#"}  // Use the eBay URL
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.title} - ${item.price} {/* Display title and price */}
        </a>
      </li>
    ))
  ) : (
    <p>No eBay results found.</p>
  )}
</ul>
      </section>
    </div>
  );
}

export default App;
