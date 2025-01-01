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

  // Keep exclusions intact
  const exclusions = ["hp", "cd", "trainer", "basic", "Item", "Stage", "basc", "utem", "iten", "Splash", "Typhoon", "stage]", "basis", "basig"];

  const correctMisreads = (text) => {
    return text
      .replace(/([a-zA-Z])eX\b/gi, "$1 EX") // Add space before "EX" in cases like "LatiaseX"
      .replace(/\bex\b/gi, " EX"); // Ensure "EX" is properly formatted with a leading space
  };

  const extractCardNameFromOCR = (ocrText) => {
    const words = ocrText.split(/[ ,\n]+/); // Split by spaces, commas, or newlines
  
    // Stopwords to halt name detection
    const stopwords = ["TRAINER", "ITEM", "ABILITY", "STAGE", "ATTACK", "DAMAGE", "WEAKNESS", "RESISTANCE"];
  
    // Clean and preprocess words
    const cleanedWords = words
      .filter((word) => word.length > 1 && !exclusions.includes(word.toLowerCase())) // Exclude unwanted words
      .map((word) => correctMisreads(word)); // Apply corrections
  
    let name = "";
  
    // Iterate through cleaned words to find the Pokémon name or valid card name
    for (let i = 0; i < cleanedWords.length; i++) {
      const currentWord = cleanedWords[i];
      const nextWord = cleanedWords[i + 1] || "";
  
      // Stop at stopwords
      if (stopwords.includes(currentWord.toUpperCase())) {
        break;
      }
  
      // Two-word names (e.g., "Precious Trolley" or "Pikachu EX")
      if (/^[A-Z]/.test(currentWord) && /^[A-Z]/.test(nextWord)) {
        if (nextWord.toUpperCase() === "EX") {
          name = `${currentWord} ${nextWord}`; // Include "EX" if it directly follows
        } else {
          name = `${currentWord} ${nextWord}`;
        }
        break;
      }
  
      // Single-word names (e.g., "Pikachu")
      if (/^[A-Z]/.test(currentWord)) {
        name = currentWord;
        break;
      }
    }
  
    return name || "Not Detected"; // Fallback
  };

  const extractSetNumberFromOCR = (ocrText) => {
    // Match all numbers in the text, excluding years (2020–2029)
    const numberMatches = ocrText.match(/\b\d{1,4}\b/g); // Match 1 to 4 digit numbers
    if (!numberMatches) return "Not Detected";

    // Filter out years (2020–2029)
    const validNumbers = numberMatches.filter((num) => !(num >= 2020 && num <= 2029));

    // Return the last valid number if it exists
    return validNumbers.length > 0 ? validNumbers[validNumbers.length - 1] : "Not Detected";
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

  const handleEbaySearch = async () => {
    if (!cardName || !cardSetNumber) {
      alert("Please scan a card to get the card name and set number first.");
      return;
    }

    const query = `${cardName} ${cardSetNumber}`;
    console.log("Search Query:", query);

    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:5000/ebay", {
        params: { query },
      });

      const ebayData = response.data.items || [];
      console.log("eBay Results:", ebayData);
      setEbayResults(ebayData);
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
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title} - {item.price}
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
