import React, { useState, useRef } from "react";

function WebcamComponent({ onCapture }) {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const videoRef = useRef(null);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      setShowDeviceSelector(true);
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error getting devices:", err);
    }
  };

  const handleDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    setShowDeviceSelector(false);
    startWebcam();
  };

  const startWebcam = async () => {
    try {
      const constraints = {
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(stream);
      setIsWebcamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access webcam");
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsWebcamActive(false);
    }
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
    <div>
      {!isWebcamActive ? (
        <div>
          {!showDeviceSelector ? (
            <button onClick={getDevices} className="button">Start Webcam</button>
          ) : (
            <div className="webcam-controls">
              <select
                className="webcam-device-select"
                value={selectedDevice}
                onChange={(e) => handleDeviceSelect(e.target.value)}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '300px', marginBottom: '10px', border: '1px solid #ccc' }}
          />
          <div>
            <button onClick={captureImage} className="button">Capture</button>
            <button onClick={stopWebcam} className="button">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

export default WebcamComponent;