import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [ocrResult, setOcrResult] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert('Please select a file first!');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://127.0.0.1:5000/ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setOcrResult(response.data.text);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to process the image!');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Card Scanner</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setWebcamEnabled(!webcamEnabled)}>
          {webcamEnabled ? 'Disable' : 'Enable'} Webcam
        </button>
      </div>

      {webcamEnabled && <p>Webcam functionality coming soon!</p>}

      <div style={{ marginBottom: '20px' }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload and Scan</button>
      </div>

      {ocrResult && (
        <div>
          <h2>OCR Result:</h2>
          <pre>{ocrResult}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
