import React, { useState, useRef, useEffect } from "react";

function WebcamComponent({ onCapture }) {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startWebcam = async (deviceId = null) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Get new stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      });

      // Get device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Update state
      setStream(mediaStream);
      setDevices(videoDevices);
      setShowDeviceSelector(true);
      setIsWebcamActive(true);
      
      if (!deviceId && videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      } else if (deviceId) {
        setSelectedDevice(deviceId);
      }
    } catch (err) {
      console.error('Webcam error:', err);
      alert('Could not start camera. Please check permissions.');
    }
  };

  const handleDeviceSelect = (deviceId) => {
    if (!deviceId) return;
    setSelectedDevice(deviceId);
    startWebcam(deviceId);
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsWebcamActive(false);
    setShowDeviceSelector(false);
    setSelectedDevice('');
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
        <button 
          onClick={() => startWebcam()}
          className="button"
          style={{ width: '100%' }}
        >
          Start Webcam
        </button>
      ) : (
        <div>
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
          
          <select
            className="webcam-device-select"
            value={selectedDevice}
            onChange={(e) => handleDeviceSelect(e.target.value)}
            style={{ 
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            <option value="">Select camera</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>

          <div style={{ marginBottom: '10px' }}>
            <button onClick={captureImage} className="button">Capture</button>
            <button onClick={stopWebcam} className="button">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebcamComponent;