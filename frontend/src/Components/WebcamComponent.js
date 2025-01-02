import React, { useState, useRef, useEffect } from "react";

function WebcamComponent({ onCapture }) {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startWebcam = async (deviceId) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsWebcamActive(true);
    } catch (err) {
      console.error('Webcam error:', err);
    }
  };

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      setShowDeviceSelector(true);
    } catch (err) {
      console.error("Error getting devices:", err);
    }
  };

  const handleDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    startWebcam(deviceId);
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsWebcamActive(false);
    setShowDeviceSelector(false);
    setSelectedDevice(null);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob(blob => {
        const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
        onCapture(file);
        stopWebcam();
      }, 'image/jpeg');
    }
  };

  return (
    <div className="webcam-container" style={{ width: '300px', margin: '0 auto' }}>
      {!showDeviceSelector ? (
        <button onClick={getDevices} className="button">
          Start Webcam
        </button>
      ) : (
        <div>
          {isWebcamActive && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%',
                  height: 'auto',
                  minHeight: '225px',
                  marginBottom: '10px',
                  border: '1px solid #ccc',
                  backgroundColor: '#000',
                  objectFit: 'cover'
                }}
              />
              <div style={{ marginBottom: '10px' }}>
                <button onClick={captureImage} className="button">Capture</button>
                <button onClick={stopWebcam} className="button">Cancel</button>
              </div>
            </>
          )}
          
          <select
            className="webcam-device-select"
            value={selectedDevice || ''}
            onChange={(e) => handleDeviceSelect(e.target.value)}
            style={{ 
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            <option value="">Select your camera</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default WebcamComponent;