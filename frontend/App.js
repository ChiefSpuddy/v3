import React, { useState } from 'react';
import Loader from './Loader'; // Import the Loader component

const CardScanner = () => {
  const [loading, setLoading] = useState(false); // State to track loading status
  const [ocrResult, setOcrResult] = useState(''); // State for OCR result
  const [error, setError] = useState(null); // State for error messages

  const handleScan = async () => {
    setLoading(true); // Show the loader
    setError(null); // Reset error state
    setOcrResult(''); // Reset OCR result

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: 'example/path' }), // Adjust to match your backend
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setOcrResult(data.result); // Set the OCR result
    } catch (err) {
      setError('An error occurred during the scan. Please try again.');
    } finally {
      setLoading(false); // Hide the loader
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Card Scanner & eBay Search</h1>
      <button onClick={handleScan} disabled={loading} style={{ padding: '10px 20px', fontSize: '16px' }}>
        {loading ? 'Scanning...' : 'Upload & Scan'}
      </button>

      {loading && <Loader />} {/* Display the loader when loading */}

      {error && <div style={{ color: 'red', marginTop: '20px' }}>{error}</div>}
      {ocrResult && (
        <div style={{ marginTop: '20px', fontSize: '16px' }}>
          <h3>OCR Result:</h3>
          <p>{ocrResult}</p>
        </div>
      )}
    </div>
  );
};

export default CardScanner;
