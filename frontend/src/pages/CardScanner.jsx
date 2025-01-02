import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';

const CardScannerPage = () => {
    const [inputMode, setInputMode] = useState('file'); // 'file' or 'webcam'
    const webcamRef = useRef(null);

    const captureImage = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log('Captured Image: ', imageSrc);
        // Pass `imageSrc` to card detection logic
    };

    return (
        <div>
            <h1>Card Scanner</h1>
            <select onChange={(e) => setInputMode(e.target.value)} value={inputMode}>
                <option value="file">File Upload</option>
                <option value="webcam">Webcam</option>
            </select>

            {inputMode === 'file' && (
                <div>
                    <input type="file" accept="image/*" />
                </div>
            )}

            {inputMode === 'webcam' && (
                <div>
                    <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
                    <button onClick={captureImage}>Capture</button>
                </div>
            )}
        </div>
    );
};

export default CardScannerPage;
