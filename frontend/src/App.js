import "./App.css";
import Home from './pages/Home';
import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import axios from "axios";
import WebcamComponent from './Components/WebcamComponent';
import Navbar from './Components/Navbar';
import pikachuRun from './Assets/pikachu-run.gif';

// Constants
const specialTypes = ["EX", "GX", "V STAR", "VSTAR", "V", "VMAX"];
const specialPrefixes = ["Radiant"];
const knownPokemon = [
  "Mew", "Lucario", "Pikachu", "Charizard", "Mewtwo", 
  "Magneton", "Ceruledge"
];
const exclusions = [
  "hp", "basic", "stage", "item", "use", "this", "card",
  "your", "from", "energy", "damage", "more", "each",
  "when", "than", "the", "put", "into", "discard", "pile",
  "attack", "effect", "during", "turn", "weakness", "resistance",
  "restart", "ability", "move", "power", "fighting", "knuckle",
  "thunder", "flame", "water", "psychic", "strike", "pulse"
];

// Helper Functions
const cleanText = (text) => {
  return text
    .replace(/VSTAR/i, "V STAR")
    .replace(/[@\[\]{}\\\/\(\)]/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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

  for (const segment of segments) {
    const cleaned = cleanText(segment);

    // Check for Radiant prefix
    for (const prefix of specialPrefixes) {
      const radiantMatch = new RegExp(`${prefix}\\s+([A-Z][a-z]+)`, 'i');
      const match = cleaned.match(radiantMatch);
      if (match) return `${prefix} ${match[1]}`;
    }
    
    // Check for known Pokémon with special types
    for (const pokemon of knownPokemon) {
      for (const type of specialTypes) {
        const pattern = new RegExp(`${pokemon}.*?${type}|${type}.*?${pokemon}`, 'i');
        if (pattern.test(cleaned)) {
          return `${pokemon} ${type}`;
        }
      }
      // Check for just the Pokémon name
      if (cleaned.toLowerCase().includes(pokemon.toLowerCase())) {
        return pokemon;
      }
    }

    const words = cleaned.split(' ')
      .filter(word => 
        word.length >= 4 &&
        !exclusions.includes(word.toLowerCase()) &&
        /^[A-Z][a-z]{2,}$/.test(word)
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

      return words[0];
    }
  }

  return "Not Detected";
};

const extractSetNumberFromOCR = (ocrText) => {
  console.log("Raw OCR Text:", ocrText);

  const cleanedText = ocrText
    .replace(/[Il]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[.,;]/g, ' ');

  // First: Look for XXX/XXX format - highest priority and keep both numbers
  const setMatch = cleanedText.match(/\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/);
  if (setMatch) {
    const [_, num1, num2] = setMatch;
    return `${num1.padStart(3, '0')}/${num2.padStart(3, '0')}`;
  }

  // Second: Look for 6-7 digit numbers to split
  const longNumberMatch = cleanedText.match(/\b(\d{6,7})\b/);
  if (longNumberMatch) {
    const num = longNumberMatch[1];
    if (num.length >= 6) {
      const first = num.substring(0, 3);
      const second = num.substring(3, 6);
      return `${first}/${second}`;
    }
  }

  // Third: Check for SWSH/SM numbers
  const swshMatch = cleanedText.match(/\b(?:SWSH|SM)\s*(\d{2,3})\b/i);
  if (swshMatch) {
    return swshMatch[1].padStart(3, '0');
  }

  // Fourth: Look for exact promo numbers (075)
  const promoMatch = cleanedText.match(/\b0\s*7\s*5\b/);
  if (promoMatch) {
    return promoMatch[0].replace(/\s/g, '');
  }

  // Fifth: Look for standalone "050" style numbers
  const standaloneMatch = cleanedText.match(/\b0\s*[45]\s*[0-9]\b/);
  if (standaloneMatch) {
    return standaloneMatch[0].replace(/\s/g, '');
  }

  return "Not Detected";
};

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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSetNumber, setManualSetNumber] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setFileUploaded(true);
      setScanCompleted(false);
      setOcrResult("");
      setCardName("");
      setCardSetNumber("");
      setEbayResults([]);
      setEbaySearchCompleted(false);
      setShowManualInput(false);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Add useEffect for cleanup
React.useEffect(() => {
  return () => {
    // Clean up URL when component unmounts
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
}, [imagePreview]);

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

    // Auto trigger eBay search
    if (name !== "Not Detected") {
      setEbayLoading(true);
      try {
        const ebayResponse = await axios.post("http://localhost:5001/api/ebay-search", {
          cardName: name.trim(),
          cardSetNumber: setNumber !== "Not Detected" ? setNumber.trim() : null,
          searchType: 'exact'
        });

        setEbayResults(ebayResponse.data);
        setEbaySearchCompleted(true);
        
        if (!ebayResponse.data || ebayResponse.data.length === 0) {
          setShowManualInput(true);
        }
      } catch (error) {
        console.error("Error searching eBay:", error?.response?.data || error);
        setShowManualInput(true);
      } finally {
        setEbayLoading(false);
      }
    }
  } catch (error) {
    console.error("Error uploading and scanning file:", error);
    alert("Failed to scan file.");
  } finally {
    setScanLoading(false);
  }
};

  const handleManualSearch = async () => {
    setEbayLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/ebay-search", {
        cardName: cardName.trim(),
        cardSetNumber: manualSetNumber.trim(),
        searchType: 'exact'
      });

      setEbayResults(response.data);
      setEbaySearchCompleted(true);
    } catch (error) {
      console.error("Error searching eBay:", error?.response?.data || error);
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
              accept="image/*"
            />
          </label>
        </div>

        {imagePreview && (
          <div className="image-preview-container">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="image-preview"
            />
          </div>
        )}

        {fileUploaded && (
          <div className="scan-button-container">
            <button 
              onClick={handleScan}
              disabled={scanLoading}
              className="scan-button"
            >
              {scanLoading ? (
                <>
                  <img src={pikachuRun} alt="Loading..." className="loading-gif" />
                  Scanning...
                </>
              ) : (
                "Scan Card"
              )}
            </button>
          </div>
        )}

        {scanCompleted && (
          <>
            <p><strong>Card Name:</strong> {cardName}</p>
            <p><strong>Card Set Number:</strong> {cardSetNumber}</p>
            <button 
              disabled={ebayLoading}
              className="search-button"
            >
              Search eBay
            </button>
          </>
        )}

        <section className="ebay-results-section">
          {ebayLoading ? (
            <p>Searching eBay...</p>
          ) : (
            <>
              <ul className="ebay-results-list">
                {ebayResults.map((item, index) => (
                  <li key={index}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.title}</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>${item.price}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>

              {ebaySearchCompleted && ebayResults.length === 0 && (
                <>
                  <p>No eBay results found.</p>
                  {showManualInput && (
                    <div className="manual-input-container">
                      <p>Try entering the set number manually:</p>
                      <div className="manual-input-wrapper">
                        <input
                          type="text"
                          value={manualSetNumber}
                          onChange={(e) => setManualSetNumber(e.target.value)}
                          placeholder="Enter set number (e.g. 061/064)"
                          className="manual-input"
                        />
                        <button 
                          onClick={handleManualSearch}
                          disabled={!manualSetNumber.trim() || ebayLoading}
                          className="manual-search-button"
                        >
                          Search Again
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
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