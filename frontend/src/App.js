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

  const exclusions = ["hp", "mp", "stagg]", "stage]", "cd", "trainer", "basic", "item", "stage", "basc", "utem", "iten", "splash", "typhoon", "basis", "basig"];

  const correctMisreads = (text) => {
    return text
      .replace(/([a-zA-Z])eX\b/gi, "$1 EX") // Add space before "EX" in cases like "LatiaseX"
      .replace(/\bex\b/gi, " EX"); // Ensure "EX" is properly formatted with a leading space
  };

  const extractCardNameFromOCR = (ocrText) => {
    const words = ocrText.split(/[ ,\n]+/); // Split by spaces, commas, or newlines

    const stopwords = ["TRAINER", "ITEM", "ABILITY", "STAGE", "ATTACK", "DAMAGE", "WEAKNESS", "RESISTANCE"];

    const cleanedWords = words
      .filter((word) => word.length > 1 && !exclusions.includes(word.toLowerCase())) // Exclude unwanted words
      .map((word) => correctMisreads(word)); // Apply corrections

    let name = "";

    for (let i = 0; i < cleanedWords.length; i++) {
      const currentWord = cleanedWords[i];
      const nextWord = cleanedWords[i + 1] || "";

      // Skip stopwords but continue searching for valid names
      if (stopwords.includes(currentWord.toUpperCase())) {
        continue;
      }

      // Two-word names (e.g., "Night Stretcher")
      if (/^[A-Z]/.test(currentWord) && /^[A-Z]/.test(nextWord)) {
        name = `${currentWord} ${nextWord}`;
        break;
      }

      // Single-word names (fallback if no two-word name is found)
      if (/^[A-Z]/.test(currentWord)) {
        name = currentWord;
        break;
      }
    }

    return name || "Not Detected"; // Fallback
  };

  const extractSetNumberFromOCR = (ocrText) => {
    const matches = ocrText.match(/\b\d+\s?\/\s?\d+\b|\b\d{1,4}\b/g); // Match "163/182" or "061 /064"

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
      const response = await axios.post("http://127.0.0.1:5000/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let resultText = response.data.text.join(", ");
      resultText = correctMisreads(resultText); // Apply misread corrections
      setOcrResult(resultText);

      const name = extractCardNameFromOCR(resultText);
      const setNumber = extractSetNumberFromOCR(resultText);

      console.log("Extracted Card Name:", name);
      console.log("Extracted Card Set Number:", setNumber);

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
    </div>
  );
}

export default App;
