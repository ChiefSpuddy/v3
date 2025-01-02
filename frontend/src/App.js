import "./App.css";
import Home from './pages/Home';
import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import axios from "axios";
import WebcamComponent from './Components/WebcamComponent';
import Navbar from './Components/Navbar';
import pikachuRun from './Assets/pikachu-run.gif';


function Scanner() {
  const [file, setFile] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardSetNumber, setCardSetNumber] = useState("");
  const [ebayResults, setEbayResults] = useState([]);
  const [scanLoading, setScanLoading] = useState(false); // Separate loading state for scanning
  const [ebayLoading, setEbayLoading] = useState(false); // Separate loading state for eBay search
  const [fileUploaded, setFileUploaded] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [ebaySearchCompleted, setEbaySearchCompleted] = useState(false); // Track eBay search completion
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const exclusions = [
    "hp", "trainer", "basic", "item", "stage", "basc", "utem", "iten", "splash", "typhoon", "basis", "basig",
  ];

  const correctMisreads = (text) => {
    return text
      .replace(/([a-zA-Z])eX\b/gi, "$1 EX")
      .replace(/\bex\b/gi, " EX");
  };

  const extractCardNameFromOCR = (ocrText) => {
    const segments = ocrText.split(",");
    const stopwords = [
      "TRAINER", "ITEM", "STAGE", "ABILITY", "ATTACK", "DAMAGE", "WEAKNESS", "RESISTANCE", "CD", "HP", "BASIC",
    ];

    for (const segment of segments) {
      let trimmedSegment = segment.trim().replace(/[^A-Za-z\s]/g, "");

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
    const matches = ocrText.match(/\b\d+\s?\/\s?\d+\b|\b\d{1,4}\b/g);

    if (!matches) return "Not Detected";

    const validMatches = matches.filter((num) => {
      if (/^\d+\s?\/\s?\d+$/.test(num)) return true;
      return !(num >= 2020 && num <= 2029);
    });

    const cleanedMatches = validMatches.map((num) => num.replace(/\s?\/\s?/g, "/"));

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
    setEbaySearchCompleted(false);
  };

  const handleScan = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setScanLoading(true); // Start scan loading state
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
      setScanLoading(false); // Stop scan loading state
    }
  };

  const handleEbaySearch = async () => {
    if (!cardName || !cardSetNumber) {
      alert("Please scan a card to get the card name and set number first.");
      return;
    }

    setEbayLoading(true); // Start eBay loading state
    try {
      const response = await axios.post("http://localhost:5001/api/ebay-search", {
        cardName,
        cardSetNumber,
      });

      console.log("eBay API Response:", response.data);
      setEbayResults(response.data);
      setEbaySearchCompleted(true);
    } catch (error) {
      console.error("Error fetching eBay results:", error);
      alert("Failed to fetch eBay results.");
    } finally {
      setEbayLoading(false); // Stop eBay loading state
    }
  };

  return (
    <div className="app-container">
      <h1>Card Scanner & eBay Search</h1>

      <section>
        <h2>Card Scanner</h2>
        <div className="file-input-container">
          <label className="file-label">
            {scanCompleted ? "Upload Another Card" : "Choose File"}
            <input
              type="file"
              className="file-input-hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div style={{ marginTop: "20px" }}>
    <h3>Or Use Webcam</h3>
    <WebcamComponent 
      onCapture={(capturedFile) => {
        setFile(capturedFile);
        setFileUploaded(true);
        setScanCompleted(false);
        setOcrResult("");
        setCardName("");
        setCardSetNumber("");
        setEbayResults([]);
        setEbaySearchCompleted(false);
      }} 
    />
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
          className={`button ${scanLoading ? "loading" : ""}`}
          disabled={!file || scanLoading}
        >
          {scanLoading ? "Scanning..." : "Scan"}
        </button>

        {/* Pikachu-run GIF while scanning */}
        {scanLoading && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <img
              src={pikachuRun}
              alt="Loading..."
              style={{ width: "120px", height: "auto" }}
            />
          </div>
        )}

        {scanCompleted && (
          <>
            <p>
              <strong>Card Name:</strong> {cardName}
            </p>
            <p>
              <strong>Card Set Number:</strong> {cardSetNumber}
            </p>
          </>
        )}
      </section>

      <hr />

      <section>
        <h2>eBay Results</h2>
        <button
          onClick={handleEbaySearch}
          className={`button ${ebayLoading ? "loading" : ""}`}
          disabled={!cardName || !cardSetNumber || ebayLoading}
        >
          {ebayLoading ? "Searching eBay..." : "Search eBay"}
        </button>

        {ebayLoading && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <img
              src={pikachuRun}
              alt="Loading..."
              style={{ width: "120px", height: "auto" }}
            />
          </div>
        )}

        <div className="ebay-results">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {ebayResults.length > 0 ? (
              ebayResults.map((item, index) => (
                <li key={index} style={{ margin: '10px 0' }}>
                  <a
                    href={item.url}  // Changed from viewItemURL to url
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0066c0',
                      textDecoration: 'none',
                      display: 'block',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.title}</span>
                      <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>${item.price}</span>
                    </div>
                  </a>
                </li>
              ))
            ) : (
              ebaySearchCompleted && <p>No eBay results found.</p>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scanner" element={<Scanner />} />
      </Routes>
    </Router>
  );
}

export default AppWrapper;
