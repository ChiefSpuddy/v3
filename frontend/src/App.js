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

      const resultText = response.data.text.join(", ");
      setOcrResult(resultText);

      const name = response.data.cardName;
      const setNumber = response.data.cardSetNumber;
      console.log("Extracted Card Name:", name); // Debugging log
      console.log("Extracted Card Set Number:", setNumber); // Debugging log

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
    console.log("Search Query:", query); // Debugging log

    setLoading(true);
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/ebay`, // Update this to your backend endpoint
        { params: { query } }
      );

      const ebayData = response.data.items || [];
      console.log("eBay Results:", ebayData); // Debugging log
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
