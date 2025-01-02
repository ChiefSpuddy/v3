// Components/WebcamComponent.js
import React, { useState, useRef } from "react";

function WebcamComponent({ onCapture }) {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      // Draw the video frame to the canvas
      ctx.drawImage(videoRef.current, 0, 0);

      // Overlay grid lines
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      const gridSize = 3;
      const stepX = canvas.width / gridSize;
      const stepY = canvas.height / gridSize;

      for (let i = 1; i < gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(stepX * i, 0);
        ctx.lineTo(stepX * i, canvas.height);
        ctx.moveTo(0, stepY * i);
        ctx.lineTo(canvas.width, stepY * i);
        ctx.stroke();
      }

      canvas.toBlob(
        (blob) => {
          const file = new File([blob], "webcam-capture.jpg", {
            type: "image/jpeg",
          });
          onCapture(file);
          stopWebcam();
        },
        "image/jpeg"
      );
    }
  };

  return (
    <div>
      {!isWebcamActive ? (
        <button onClick={startWebcam} className="button">
          Start Webcam
        </button>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              maxWidth: "400px",
              border: "2px solid #ccc",
              borderRadius: "8px",
              marginBottom: "10px",
            }}
          />
          <div>
            <button onClick={captureImage} className="button">
              Capture Image
            </button>
            <button onClick={stopWebcam} className="button">
              Stop Webcam
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default WebcamComponent;
