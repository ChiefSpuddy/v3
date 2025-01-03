import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import pokemonNames from './Assets/PokemonNames.json';
import axios from "axios";
import WebcamComponent from './Components/WebcamComponent';
import Navbar from './Components/Navbar';
import pikachuRun from './Assets/pikachu-run.gif';
import ManualSearch from './Components/ManualSearch';
import cardSetNames from './Assets/CardSetNames.json';

// Constants
const specialPrefixes = ['Radiant', 'Ancient', 'Origin'];
const specialTypes = ['V', 'VSTAR', 'VMAX', 'GX', 'EX'];
const knownPokemon = pokemonNames?.names || [];
const exclusions = [
  "hp", "basic", "stage", "item", "use", "this", "card",
  "your", "from", "energy", "damage", "more", "each",
  "when", "than", "the", "put", "into", "discard", "pile",
  "attack", "effect", "during", "turn", "weakness", "resistance",
  "restart", "ability", "move", "power", "fighting", "knuckle",
  "thunder", "flame", "water", "psychic", "strike", "pulse",
  "active pokemon", "active", "defending pokemon", "defending",
  "aura star", "power", "poweril", "vstar power",
];

// Helper Functions - Move these outside of any component
const cleanText = (text) => {
  return text
    .replace(/[Il]/g, 'l')
    .replace(/[oO]/g, 'o')
    .replace(/\bSTAGG\b/gi, "Stage")
    .replace(/['']/g, "'")
    .replace(/\bvessel\b/gi, "Vessel")
    .replace(/\bSZAR\b/gi, "VSTAR")
    .replace(/\bLLucario\b/gi, "Lucario")
    .replace(/\bUtem\b/gi, "Item")
    .replace(/€X/gi, " EX")
    .replace(/([a-zA-Z])eX\b/gi, "$1 EX")
    .replace(/\bex\b/gi, " EX")
    .replace(/\s+/g, " ")
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

const findClosestPokemon = (text) => {
  if (!Array.isArray(knownPokemon) || knownPokemon.length === 0) {
    console.error('Pokemon names not loaded correctly');
    return null;
  }

  const cleanedText = text.toLowerCase()
    .replace(/[Il]/g, 'l')
    .replace(/[oO]/g, 'o')
    .replace(/evolves\s+from\s+/gi, '')
    .replace(/ability|abliity/gi, '')
    .replace(/€X/gi, " EX")
    .replace(/szar/gi, "vstar");

  // Check for EX with Euro symbol
  if (cleanedText.includes('€x')) {
    const baseName = cleanedText.split('€x')[0].trim();
    const pokemonMatch = knownPokemon.find(pokemon => 
      baseName.toLowerCase().includes(pokemon.toLowerCase()));
    if (pokemonMatch) return `${pokemonMatch} EX`;
  }

  // Regular Pokemon name checks with suffixes
  const exactMatch = knownPokemon.find(pokemon => 
    pokemon && cleanedText.includes(pokemon.toLowerCase()) &&
    !exclusions.includes(pokemon.toLowerCase()));

  if (exactMatch) {
    const hasVSTAR = /vstar|szar/i.test(cleanedText);
    const hasVMAX = /vmax/i.test(cleanedText);
    const hasEX = /\bex\b/i.test(cleanedText);
    const hasV = /\bv\b/i.test(cleanedText);

    if (hasVSTAR) return `${exactMatch} VSTAR`;
    if (hasVMAX) return `${exactMatch} VMAX`;
    if (hasEX) return `${exactMatch} EX`;
    if (hasV) return `${exactMatch} V`;
    return exactMatch;
  }

  return null;
};

const trainerNameExclusions = ['utem', 'lten', 'ltem', 'iten'];

const extractCardNameFromOCR = (ocrText) => {
  const segments = ocrText.split(/[,.-]/);
  const skipPatterns = /evolves?\s+from|hp|damage|attack/i;

  console.log("Processing segments:", segments);

  for (const segment of segments) {
    const cleaned = cleanText(segment);
    if (skipPatterns.test(cleaned)) continue;

    // Enhanced Trainer card detection
    if (/trainer|item|supporter/i.test(cleaned)) {
      const fullText = segments.join(", ");
      console.log("Trainer card detected, full text:", fullText);
      
      // Look for card name after TRAINER keyword
      const nameMatch = fullText.match(/(?:trainer|item|supporter)[,\s]+([^,\n]+)/i);
      if (nameMatch && nameMatch[1]) {
        const cardName = nameMatch[1].trim()
          .split(/[,\n]/)[0]  // Take first segment
          .replace(/^\s*,\s*/, '')  // Remove leading comma
          .replace(/\d+/g, '')  // Remove numbers
          .trim();
        
        console.log("Extracted trainer name:", cardName);
        // Skip if name is in exclusions list
        if (cardName && cardName.length > 3 && 
            !trainerNameExclusions.includes(cardName.toLowerCase())) {
          return cardName;
        }
      }
    }

    // Check for special prefixes + Pokemon
    for (const prefix of specialPrefixes) {
      const pokemonName = findClosestPokemon(cleaned);
      if (pokemonName && cleaned.toLowerCase().includes(prefix.toLowerCase())) {
        return `${prefix} ${pokemonName}`;
      }
    }

    // Check for Pokemon + Type combinations
    const pokemonName = findClosestPokemon(cleaned);
    if (pokemonName) {
      for (const type of specialTypes) {
        if (cleaned.toLowerCase().includes(type.toLowerCase())) {
          return `${pokemonName} ${type}`;
        }
      }
      return pokemonName;
    }


    // Third: Look for compound names
    const twoWordMatch = cleaned.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+|[A-Z]+)\b/);
    if (twoWordMatch) {
      const [_, first, second] = twoWordMatch;
      if (!exclusions.includes(first.toLowerCase()) && 
          !exclusions.includes(second.toLowerCase()) &&
          !skipPatterns.test(`${first} ${second}`)) {
        return `${first} ${second}`;
      }
    }

    // Fourth: Look for single names with types
    const singleWordMatch = cleaned.match(/\b([A-Z][a-z]+)\b/);
    if (singleWordMatch && !exclusions.includes(singleWordMatch[1].toLowerCase())) {
      for (const type of specialTypes) {
        if (cleaned.toLowerCase().includes(type.toLowerCase())) {
          return `${singleWordMatch[1]} ${type}`;
        }
      }
      return singleWordMatch[1];
    }
  }

  return "Not Detected";
};

const extractSetNumberFromOCR = (ocrText) => {
  const cleanedText = ocrText
    .replace(/[Il]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[.,;]/g, ' ');

  const correctSetNumber = (num) => {
    // Correct first digit if it's 4-9
    if (/^[456789]\d{2}/.test(num)) {
      return '1' + num.slice(1);
    }
    // Also correct second number in XXX/XXX format
    if (/^\d{3}\/[456789]\d{2}$/.test(num)) {
      const [first, second] = num.split('/');
      return `${first}/1${second.slice(1)}`;
    }
    return num;
  };

  // First: Look for XXX/XXX format - highest priority and keep both numbers
  const setMatch = cleanedText.match(/\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/);
  if (setMatch) {
    const [_, num1, num2] = setMatch;
    const correctedNum1 = correctSetNumber(num1);
    const correctedNum2 = num2.replace(/^[456789]/, '1');  // Correct second number
    return `${correctedNum1.padStart(3, '0')}/${correctedNum2.padStart(3, '0')}`;
  }

  // Second: Look for 6-7 digit numbers to split
  const longNumberMatch = cleanedText.match(/\b(\d{6,7})\b/);
  if (longNumberMatch) {
    const num = longNumberMatch[1];
    if (num.length >= 6) {
      const first = correctSetNumber(num.substring(0, 3));
      const second = num.substring(3, 6);
      return `${first}/${second}`;
    }
  }

  // Third: Check for standalone 3-digit numbers
  const threeDigitMatch = cleanedText.match(/\b([5]\d{2})\b/);
  if (threeDigitMatch) {
    return correctSetNumber(threeDigitMatch[1]);
  }

  // Fourth: Check for SWSH/SM numbers
  const swshMatch = cleanedText.match(/\b(?:SWSH|SM)\s*(\d{2,3})\b/i);
  if (swshMatch) {
    return swshMatch[1].padStart(3, '0');
  }

  // Fifth: Look for exact promo numbers (075)
  const promoMatch = cleanedText.match(/\b0\s*7\s*5\b/);
  if (promoMatch) {
    return promoMatch[0].replace(/\s/g, '');
  }

  // Sixth: Look for standalone "050" style numbers
  const standaloneMatch = cleanedText.match(/\b0\s*[45]\s*[0-9]\b/);
  if (standaloneMatch) {
    return standaloneMatch[0].replace(/\s/g, '');
  }

  return "Not Detected";
};

// Scanner Component
function Scanner() {
  // Combine all state declarations
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
  const [manualCardName, setManualCardName] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [ebayError, setEbayError] = useState(null);
  const [cardDetails, setCardDetails] = useState(null);
  const [cardInfo, setCardInfo] = useState(null);

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
  setEbayResults([]);
  setEbaySearchCompleted(false);
  setShowManualInput(false);

  try {
    // Step 1: OCR Scan
    const response = await axios.post("http://127.0.0.1:5001/ocr", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    let resultText = response.data.text.join(", ");
    resultText = cleanText(resultText)
      .replace(/Snoriax/gi, "Snorlax")  // Add specific OCR corrections
      .replace(/lax\b/gi, "lax");       // Fix common end patterns
    
    setOcrResult(resultText);

    const name = extractCardNameFromOCR(resultText);
    const setNumber = extractSetNumberFromOCR(resultText);
    
    console.log("Extracted card details:", { name, setNumber, resultText });
    
    setCardName(name);
    setCardSetNumber(setNumber);
    setScanCompleted(true);

    // Step 2: eBay Search
    if (name !== "Not Detected") {
      setEbayLoading(true);
      try {
        const searchParams = {
          cardName: name.trim(),
          cardSetNumber: setNumber !== "Not Detected" ? setNumber.trim() : "",
          searchType: 'exact'
        };
        console.log("eBay search parameters:", searchParams);

        const ebayResponse = await axios.post(
          "http://localhost:5001/api/ebay-search", 
          searchParams,
          { 
            timeout: 10000,
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        if (ebayResponse.data && Array.isArray(ebayResponse.data)) {
          setEbayResults(ebayResponse.data);
          setEbaySearchCompleted(true);
          
          if (ebayResponse.data.length > 0) {
            // Extract card info from successful automated scan
            const info = extractCardInfoFromListings(ebayResponse.data);
            setCardInfo(info);
          } else {
            console.log("No eBay listings found for:", searchParams);
            handleNoResults();
            setShowManualSearch(true); // Add this line
          }
        } else {
          setEbayError('Invalid response from eBay search');
          setShowManualSearch(true); // Add this line
        }
      } catch (error) {
        console.error("eBay search failed:", error);
        setShowManualSearch(true);
        // Don't show error message for invalid response
        if (error.message !== 'Invalid response from eBay search') {
          setEbayError(error.message || 'Failed to search eBay');
        }
      } finally {
        setEbayLoading(false);
      }
    } else {
      setShowManualSearch(true); // Add this line for when name is "Not Detected"
    }
  } catch (error) {
    console.error("OCR scan failed:", error);
    alert("Failed to scan card image.");
    setShowManualSearch(true); // Add this line for OCR failures
  } finally {
    setScanLoading(false);
  }
};

const searchEbay = async (params) => {
  try {
    const response = await axios.post(
      "http://localhost:5001/api/ebay-search",
      params,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error("eBay search request failed:", error);
    throw new Error(error.response?.data?.error || 'Failed to search eBay');
  }
};

const handleManualSearch = async (searchData) => {
  setEbayLoading(true);
  setEbayError(null);
  try {
    const searchParams = {
      cardName: searchData.name,
      cardSetNumber: searchData.setNumber,
      searchType: 'exact'
    };
    
    const results = await searchEbay(searchParams);
    
    if (Array.isArray(results)) {
      setEbayResults(results);
      setEbaySearchCompleted(true);
      
      if (results.length > 0) {
        // Extract card info from all listings
        const info = extractCardInfoFromListings(results);
        setCardInfo(info);
        setShowManualInput(false);
        setShowManualSearch(false);
        setEbayError(null);
      } else {
        setCardInfo(null);
        setEbayError('No listings found for this card');
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error("Manual search failed:", error);
    setEbayError(error.message || 'Failed to search eBay');
    setEbayResults([]);
    setCardInfo(null);
  } finally {
    setEbayLoading(false);
  }
};

// Helper functions for price calculations
const calculateAveragePrice = (results) => {
  if (!results.length) return 0;
  const total = results.reduce((sum, item) => sum + parseFloat(item.price.replace(/[^0-9.]/g, '')), 0);
  return (total / results.length).toFixed(2);
};

const findLowestPrice = (results) => {
  if (!results.length) return 0;
  return Math.min(...results.map(item => parseFloat(item.price.replace(/[^0-9.]/g, '')))).toFixed(2);
};

const findHighestPrice = (results) => {
  if (!results.length) return 0;
  return Math.max(...results.map(item => parseFloat(item.price.replace(/[^0-9.]/g, '')))).toFixed(2);
};

const handleNoResults = () => {
  setShowManualInput(true);
  // Pre-populate with scanned data
  setManualCardName(cardName);
  setManualSetNumber(cardSetNumber);
};

// Add helper functions to parse eBay listings
const extractCardInfoFromListings = (listings) => {
  if (!listings || listings.length === 0) return null;

  // Function to find matching set name from our known sets
  const findSetName = (title) => {
    return cardSetNames.find(setName => 
      title.toLowerCase().includes(setName.toLowerCase())
    );
  };

  // Function to extract card number from title or original scan
  const findCardNumber = (title, originalNumber) => {
    // Try to find XXX/XXX pattern in title
    const numberMatch = title.match(/(\d{1,3})[/\\](\d{1,3})/);
    if (numberMatch) return `${numberMatch[1]}/${numberMatch[2]}`;
    
    // If no match in title, use original number if valid
    if (originalNumber && originalNumber !== "Not Detected") {
      return originalNumber;
    }
    
    return "Unknown";
  };

  const setInfo = listings.reduce((info, listing) => {
    const title = listing.title.toLowerCase();
    const price = parseFloat(listing.price.replace(/[^0-9.]/g, ''));
    
    // Try to find set name in this listing
    const setName = findSetName(title);
    if (setName) {
      info.setNames.add(setName);
    }

    // Try to find card number in this listing
    const cardNum = findCardNumber(title, cardSetNumber);
    if (cardNum !== "Unknown") {
      info.cardNumbers.add(cardNum);
    }

    info.prices.push(price);
    return info;
  }, { 
    setNames: new Set(), 
    cardNumbers: new Set(), 
    prices: [] 
  });

  // Get most common set name, or use first one found
  const setName = Array.from(setInfo.setNames)[0] || 'Unknown Set';
  
  // Get card number (prefer scanned number if available)
  const finalCardNumber = cardSetNumber !== "Not Detected" 
    ? cardSetNumber 
    : Array.from(setInfo.cardNumbers)[0] || "Unknown";

  const prices = setInfo.prices.filter(price => price > 0);
  return {
    setName: setName,
    cardNumber: finalCardNumber,
    listingCount: listings.length,
    averagePrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
    lowestPrice: Math.min(...prices).toFixed(2),
    highestPrice: Math.max(...prices).toFixed(2)
  };
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
          </>
        )}

{ebayError && ebayError !== 'Invalid response from eBay search' && (
  <div className="error-container">
    <p className="error-message">{ebayError}</p>
  </div>
)}

      {/* Market Information Section - Moved Above Results */}
      {cardInfo && ebayResults.length > 0 && (
        <div className="card-info-section">
          <h3>Market Information</h3>
          <div className="card-info-grid">
            <div className="info-item">
              <span className="info-label">Set:</span>
              <span className="info-value">{cardInfo.setName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Card Number:</span>
              <span className="info-value">{cardInfo.cardNumber}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Number of Listings:</span>
              <span className="info-value">{cardInfo.listingCount}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Average Price:</span>
              <span className="info-value">${cardInfo.averagePrice}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Price Range:</span>
              <span className="info-value">${cardInfo.lowestPrice} - ${cardInfo.highestPrice}</span>
            </div>
          </div>
        </div>
      )}

{(ebaySearchCompleted || ebayLoading) && (
  <section className="ebay-results-section">
    {ebayLoading ? (
      <p>Searching eBay...</p>
    ) : (
      <>
        {Array.isArray(ebayResults) && ebayResults.length > 0 ? (
          <>
            <h3 className="ebay-listings-header">eBay Listings</h3>
            <div className="ebay-results-container">
              <button 
                className="scroll-button left" 
                onClick={() => {
                  const slider = document.querySelector('.ebay-results-slider');
                  slider.scrollLeft -= 315; // Width + margin
                }}
              >
                &#10094;
              </button>
              <div className="ebay-results-slider">
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
              </div>
              <button 
                className="scroll-button right" 
                onClick={() => {
                  const slider = document.querySelector('.ebay-results-slider');
                  slider.scrollLeft += 315; // Width + margin
                }}
              >
                &#10095;
              </button>
            </div>
          </>
        ) : (
          ebaySearchCompleted && <p>No eBay results found.</p>
        )}
      </>
    )}
  </section>
)}

        {(showManualInput || ebayError || showManualSearch) && ebayResults.length === 0 && (
          <div className="manual-search-wrapper">
            <h3>No eBay results found. Try adjusting the card details:</h3>
            <ManualSearch
              initialCardName={cardName}
              initialSetNumber={cardSetNumber}
              onSearch={handleManualSearch}
              className="manual-search-below-preview"
              error={ebayError !== 'Invalid response from eBay search' ? ebayError : null}
            />
          </div>
        )}
      </section>
    </div>
  );
}

// Remove App component since its functionality is merged into Scanner

function AppWrapper() {
  return (
    <Router>
      <Navbar />
      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scanner" element={<Scanner />} />
        </Routes>
      </div>
    </Router>
  );
}

// Export at top level
export default AppWrapper;