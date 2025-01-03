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
  const [scanLoading, setScanLoading] = useState(false);
  const [ebayLoading, setEbayLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [ebaySearchCompleted, setEbaySearchCompleted] = useState(false);

  const exclusions = [
    "hp", "trainer", "basic", "item", "stage", "basc", "utem", "iten", "splash", "typhoon", "basis", "basig",
  ];

  const correctMisreads = (text) => {
    return text
      .replace(/([a-zA-Z])eX\b/gi, "$1 EX")
      .replace(/\bex\b/gi, " EX")
      .replace(/\bSTAGG\b/gi, "Stage")
      .replace(/['']/g, "'")
      .replace(/\bvessel\b/gi, "Vessel");
  };
  
  const extractCardNameFromOCR = (ocrText) => {
    const segments = ocrText.split(/[,.-]/);
    const specialTypes = ["EX", "GX", "V", "VMAX", "VSTAR"];
    const exclusions = [
      "hp", "basic", "stage", "item", "use", "this", "card", "basc", 
      "your", "from", "energy", "damage", "more", "each", "utem",
      "when", "than", "the", "put", "into", "discard", "pile", "iten",
      "attack", "effect", "during", "turn", "weakness", "resistance",
      "trainer", "ability", "pokemon", "evolves", "retreat", "splash",
      "deck", "hand", "active", "bench", "prize", "cards", "typhoon",
      "basis", "basig", "stagg", "power", "move", "type", "pte", "fte",
      "uaa", "max", "star", "use", "card", "put", "into", "lten"
    ];
  
    const cleanText = (text) => {
      return text
        .replace(/[@\[\]{}\\\/\(\)]/g, ' ')  // Remove special chars
        .replace(/\d+/g, ' ')                // Remove numbers
        .replace(/[^a-zA-Z\s]/g, ' ')        // Keep only letters and spaces
        .replace(/\s+/g, ' ')                // Normalize spaces
        .trim();
    };
  
    for (const segment of segments) {
      const cleaned = cleanText(segment);
      const words = cleaned.split(' ')
        .filter(word => 
          word.length >= 4 &&  // Minimum length check
          !exclusions.includes(word.toLowerCase()) &&
          /^[A-Z][a-z]{2,}$/.test(word)  // Proper case validation
        );
  
      if (words.length > 0) {
        // Try multi-word names
        if (words.length >= 2) {
          const twoWords = words.slice(0, 2).join(' ');
          for (const type of specialTypes) {
            if (new RegExp(`${twoWords}\\s*${type}`, 'i').test(cleaned)) {
              return `${twoWords} ${type}`;
            }
          }
          return twoWords;
        }
  
        // Single word with special type
        for (const type of specialTypes) {
          if (new RegExp(`${words[0]}\\s*${type}`, 'i').test(cleaned)) {
            return `${words[0]} ${type}`;
          }
        }
  
        // Single word must be longer than 4 chars
        if (words[0].length >= 4) {
          return words[0];
        }
      }
    }
  
    return "Not Detected";
  };

const extractSetNumberFromOCR = (ocrText) => {
  const cleanedText = ocrText
    .replace(/[Il]/g, '1')
    .replace(/[oO]/g, '0');

  // Helper to correct first digit if it's 4 or 5
  const correctFirstDigit = (num) => {
    if (/^[456789]/.test(num)) {
      return '1' + num.slice(1);
    }
    return num;
  };

  // First priority: Check for format with slash (flexible spacing)
  const setMatch = cleanedText.match(/\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/);
  if (setMatch) {
    const [_, num1, num2] = setMatch;
    const correctedNum1 = correctFirstDigit(num1);
    const correctedNum2 = correctFirstDigit(num2);
    return `${correctedNum1.padStart(3, '0')}/${correctedNum2.padStart(3, '0')}`;
  }

  // Second priority: Look for embedded numbers
  const longNumberMatch = cleanedText.match(/\b(\d{6,7})\b/);
  if (longNumberMatch) {
    const num = longNumberMatch[1];
    if (num.length >= 6) {
      const first = correctFirstDigit(num.substring(0, 3));
      const second = correctFirstDigit(num.substring(3, 6));
      return `${first}/${second}`;
    }
  }

  // Third priority: Check for promo numbers
  const promoMatch = cleanedText.match(/\b(0\d{2})\b/);
  if (promoMatch) {
    return promoMatch[1];
  }

  // Last priority: Check for set codes
  if (cleanedText.includes('SM') || cleanedText.includes('SV')) {
    const codeMatch = cleanedText.match(/\b(\d{2,3})\b/);
    if (codeMatch) {
      const num = correctFirstDigit(codeMatch[1]);
      return num.padStart(3, '0');
    }
  }

  return "Not Detected";
};

const handleFileChange = (e) => {
  // Clear any existing webcam captures
  setFile(null); 
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

    setScanLoading(true);
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
      setScanLoading(false);
    }
  };

  const handleEbaySearch = async () => {
    if (!cardName || !cardSetNumber) {
      alert("Please scan a card to get the card name and set number first.");
      return;
    }

    setEbayLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/ebay-search", {
        cardName,
        cardSetNumber,
      });

      setEbayResults(response.data);
      setEbaySearchCompleted(true);
    } catch (error) {
      console.error("Error fetching eBay results:", error);
      alert("Failed to fetch eBay results.");
    } finally {
      setEbayLoading(false);
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
          <h3>Or, use your webcam to take a picture of your card.</h3>
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
              alt="Preview"
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
                    href={item.url}
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