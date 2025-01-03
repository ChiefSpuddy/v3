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

// Add new constants for name filtering
const nameExclusions = [
  'psa', 'cgc', 'bgs', 'gem', 'mint', 'nm', 'near mint',
  'holo', 'reverse', 'foil', 'stamped', 'card', 'pokemon',
  'tcg', 'regular', 'non-holo', 'japanese', 'english',
  'swsh', 'sv', 'base set', 'playable', 'grade', 'graded',
  'trick or treat', 'trick', 'treat', 'cosmo', 'cosmos',
  'rare', 'ultra rare', 'secret rare', 'promo', 
  'twilight masquerade', 'bundle', 'booster',
  '2024', '2023', '2022', '2021',  // Remove year patterns
  'trick or trade', 'trick', 'trade', 'cosmo', 'cosmos',
  'twilight', 'masquerade', 'bundle', 'booster', 'set',
  'or', 'and', '&', 'series', 'coloring', 'colour',
  'low pop', 'pop'
];

// Add set patterns mapping
const setPatterns = {
  '095/167': 'Twilight Masquerade',
  'twilight masquerade': 'Twilight Masquerade',
  '/167$': 'Twilight Masquerade',  // Cards ending in /167
  'CRZ': 'Crown Zenith',
  'PAL': 'Paldea Evolved',
  'OBF': 'Obsidian Flames',
  'MEW': '151',
  'PAR': 'Paradox Rift',
  'SHF': 'Shrouded Fable',
  'SVI': 'Scarlet & Violet'
};

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
const Scanner = () => {
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
const getSetFromCardNumber = (cardNumber) => {
  if (!cardNumber || cardNumber === "Not Detected") return null;

  // Add specific card number patterns
  const setPatterns = {
    '/165$': '151',  // If total is 165, it's from 151 set
    '/064$': 'Shrouded Fable',  // If total is 064, it's from Shrouded Fable
    'CRZ': 'Crown Zenith',
    'PAL': 'Paldea Evolved',
    'OBF': 'Obsidian Flames',
    'MEW': '151',
    'PAR': 'Paradox Rift',
    'SHF': 'Shrouded Fable',
    'SVI': 'Scarlet & Violet'
  };

  // Check for total card count patterns first
  for (const [pattern, setName] of Object.entries(setPatterns)) {
    if (pattern.startsWith('/') && cardNumber.match(pattern)) {
      return setName;
    }
  }

  // Then check for prefix patterns
  for (const [prefix, setName] of Object.entries(setPatterns)) {
    if (!prefix.startsWith('/') && cardNumber.startsWith(prefix)) {
      return setName;
    }
  }

  return null;
};

const findSetNameInTitle = (title, cardSetNames) => {
  const normalizedTitle = title.toLowerCase().trim();
  
  // Add specific set name variations with priorities
  const setVariations = {
    'shrouded fable': 'Shrouded Fable',
    'surgingsparks': 'Surging Sparks',
    'surging sparks': 'Surging Sparks',
    'sv08': 'Surging Sparks'
  };

  // First check for exact set name matches from variations
  for (const [variation, setName] of Object.entries(setVariations)) {
    if (normalizedTitle.includes(variation)) {
      return setName;
    }
  }

  // Try to match from card number pattern
  const setFromNumber = getSetFromCardNumber(cardSetNumber);
  if (setFromNumber) {
    return setFromNumber;
  }

  // Skip series names that are too general
  const seriesToSkip = [
    'sword & shield',
    'sun & moon',
    'xy',
    'black & white',
    'diamond & pearl'
  ];

  // Try exact matches from CardSetNames.json
  const exactMatch = cardSetNames.find(setName => {
    const normalizedSetName = setName.toLowerCase();
    return normalizedTitle.includes(normalizedSetName) && 
           !seriesToSkip.includes(normalizedSetName);
  });

  if (exactMatch) return exactMatch;

  // Try partial matches with common variations
  const setMatch = cardSetNames.find(setName => {
    if (seriesToSkip.includes(setName.toLowerCase())) return false;

    const setVariations = [
      setName.toLowerCase().replace(/&/g, 'and'),
      setName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      setName.toLowerCase().split(' ').join(''),
      setName.toLowerCase().replace(/\s+/g, '')
    ];
    return setVariations.some(variation => normalizedTitle.includes(variation));
  });

  return setMatch || 'Unknown Set';
};

const findCardNumber = (title) => {
  // Match patterns like "163/182" with optional prefix like "Sv04:"
  const patterns = [
    /(\d{1,3}\/\d{1,3})\s+(?:Sv\d+:|[A-Za-z\s]+)/i,  // Matches "163/182 Sv04:"
    /(\d{1,3}\/\d{1,3})/,  // Simple XXX/XXX pattern
    /\b(\d{1,3})[\/\\](\d{1,3})\b/  // Fallback pattern
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      // If it's a split pattern, format it properly
      if (match[2]) {
        return `${match[1].padStart(3, '0')}/${match[2].padStart(3, '0')}`;
      }
      // Otherwise return the full match
      return match[1];
    }
  }

  return null;
};

// Add helper function to clean card names
const cleanCardName = (name) => {
  if (!name) return '';
  
  // Convert to lower case for comparison
  let cleaned = name.toLowerCase();
  
  // Remove grading terms and scores
  cleaned = cleaned.replace(/psa\s*\d+/gi, '');
  cleaned = cleaned.replace(/cgc\s*\d+/gi, '');
  cleaned = cleaned.replace(/bgs\s*\d+/gi, '');
  cleaned = cleaned.replace(/pop\s*\d+/gi, '');
  
  // Remove year patterns
  cleaned = cleaned.replace(/\b20\d{2}\b/g, '');
  
  // Remove "Trick or Trade" and related terms
  cleaned = cleaned.replace(/trick\s*(?:or|&)?\s*treat(?:s|ing)?/gi, '');
  
  // Remove all exclusion words
  nameExclusions.forEach(term => {
    cleaned = cleaned.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
  });
  
  // Clean up extra spaces and punctuation
  cleaned = cleaned
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Update the card name extraction in extractCardInfoFromListings
const extractCardInfoFromListings = (listings) => {
  if (!listings || listings.length === 0) return null;

  // Try to extract card name from listings
  const namePattern = /^(.*?)(?:\d{1,3}\/\d{1,3}|sv\d+)/i;
  const cardNames = new Map(); // Use Map to track frequency
  
  listings.forEach(listing => {
    const match = listing.title.match(namePattern);
    if (match) {
      const cleanName = cleanCardName(match[1]);
      if (cleanName.length > 2) {
        cardNames.set(cleanName, (cardNames.get(cleanName) || 0) + 1);
      }
    }
  });

  // Get most common clean name
  let mostCommonName = '';
  let highestFreq = 0;
  
  cardNames.forEach((freq, name) => {
    if (freq > highestFreq) {
      highestFreq = freq;
      mostCommonName = name;
    }
  });

  // Rest of existing tracking logic
  const cardNumberFrequency = new Map();
  const setInfo = listings.reduce((info, listing) => {
    const title = listing.title;
    const price = parseFloat(listing.price.replace(/[^0-9.]/g, ''));
    
    // Find set name and card number
    const setName = findSetNameInTitle(title, cardSetNames);
    if (setName !== 'Unknown Set') {
      info.setNames.add(setName);
    }

    const cardNum = findCardNumber(title);
    if (cardNum) {
      cardNumberFrequency.set(cardNum, (cardNumberFrequency.get(cardNum) || 0) + 1);
    }

    info.prices.push(price);
    return info;
  }, { 
    setNames: new Set(),
    prices: [] 
  });

  // Get most common card number
  let mostCommonCardNumber = null;
  let highestFrequency = 0;
  
  cardNumberFrequency.forEach((frequency, cardNum) => {
    if (frequency > highestFrequency) {
      highestFrequency = frequency;
      mostCommonCardNumber = cardNum;
    }
  });

  // Get final card name (prefer name from listings over scanned name)
  const finalCardName = mostCommonName || cleanCardName(cardName);

  const prices = setInfo.prices.filter(price => price > 0);
  return {
    cardName: finalCardName,
    setName: Array.from(setInfo.setNames)[0] || 'Unknown Set',
    cardNumber: mostCommonCardNumber || cardSetNumber || "Unknown",
    listingCount: listings.length,
    averagePrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
    lowestPrice: Math.min(...prices).toFixed(2),
    highestPrice: Math.max(...prices).toFixed(2)
  };
};

// Update the render section to remove scanned details when market info is shown
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

      {/* Only show scanned details if no market info yet */}
      {scanCompleted && !cardInfo && !ebayResults.length > 0 && (
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
              <span className="info-label">Card Name:</span>
              <span className="info-value">{cardInfo.cardName}</span>
            </div>
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
              <ul className="ebay-results-list">
                {ebayResults.map((item, index) => (
                  <li key={index} className="ebay-result-item">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <div className="ebay-listing-content">
                        <span className="listing-title">{item.title}</span>
                        <span className="listing-price">${item.price}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
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
};

// Remove App component since its functionality is merged into Scanner

const AppWrapper = () => {
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
};

// Export at top level
export default AppWrapper;