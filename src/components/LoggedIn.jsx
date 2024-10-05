import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import Tesseract from 'tesseract.js';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export default function LoggedIn() {
  const { user, logout } = useKindeAuth();
  const webcamRef = useRef(null);
  const [capturedText, setCapturedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [objects, setObjects] = useState([]); // State for detected objects
  const [previousObjects, setPreviousObjects] = useState([]); // State for previous frame's objects
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [alertsEnabled, setAlertsEnabled] = useState(true); // New state for toggling alerts

  // Fetch available voices for text-to-speech
  useEffect(() => {
    const fetchVoices = () => {
      const voicesList = window.speechSynthesis.getVoices();
      setVoices(voicesList);
      if (voicesList.length > 0) {
        setSelectedVoice(voicesList[0]); // Set a default voice
      }
    };

    fetchVoices();
    window.speechSynthesis.onvoiceschanged = fetchVoices;
  }, []);

  // Load the CocoSSD model for object detection
  useEffect(() => {
    const loadModel = async () => {
      const model = await cocoSsd.load();
      detectObjects(model);
    };
    loadModel();
  }, []);

  // Function to update video dimensions when metadata is loaded
  const onLoadedMetadata = () => {
    const video = webcamRef.current.video;
    setVideoSize({ width: video.videoWidth, height: video.videoHeight });
  };

  // Function to detect objects using the loaded model
  const detectObjects = async (model) => {
    // Reduce detection frequency for better performance
    setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const predictions = await model.detect(video);
        compareObjects(predictions); // Directly run the proximity check without delay
        setObjects(predictions);
        setPreviousObjects(predictions);
      }
    }, 500); // Detect objects every half second
  };

  // Compare current objects with previous frame's objects to check for proximity and direction
  const compareObjects = (currentObjects) => {
    const videoCenter = videoSize.width / 2; // Get the center of the video frame

    currentObjects.forEach((currentObject) => {
      const previousObject = previousObjects.find(
        (prev) => prev.class === currentObject.class
      );

      if (previousObject) {
        // Calculate current and previous bounding box areas
        const currentSize = currentObject.bbox[2] * currentObject.bbox[3];
        const previousSize = previousObject.bbox[2] * previousObject.bbox[3];

        if (currentSize > previousSize) {
          // Speak out the message that the object is getting closer
          if (alertsEnabled) { // Check if alerts are enabled before speaking
            speakText(`The ${currentObject.class} is approaching!`);

            // Calculate the center position of the bounding box
            const objectCenter = currentObject.bbox[0] + currentObject.bbox[2] / 2;

            // Compare the object's center position to the center of the video
            if (objectCenter < videoCenter) {
              speakText('please move to the right!'); // Object is on the left side
            } else {
              speakText('Please move to the left!'); // Object is on the right side
            }
          }
        }
      }
    });
  };

  // Updated speakText function using the Web Speech API
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // You can customize this to different languages if needed
      utterance.voice = selectedVoice; // Use the selected voice
      window.speechSynthesis.speak(utterance); // Speak the utterance
    } else {
      console.error('Text-to-speech is not supported in this browser.');
    }
  };

  // Function to capture the image, run OCR, and speak the text
  const captureAndReadText = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setLoading(true);
      setError(null);

      Tesseract.recognize(
        imageSrc,
        'eng',
        {
          logger: (m) => console.log(m),
        }
      )
        .then(({ data: { text } }) => {
          setCapturedText(text);
          setLoading(false);
          speakText(text);
        })
        .catch((err) => {
          setError('Failed to read text from the image');
          setLoading(false);
        });
    } else {
      setError('Failed to capture image from the webcam');
    }
  };

  // Function to toggle the camera between front and back
  const toggleFacingMode = () => {
    setFacingMode((prevFacingMode) =>
      prevFacingMode === 'user' ? 'environment' : 'user'
    );
  };

  // Scale the bounding box coordinates to match the rendered video element
  const calculateScaledBoundingBox = (bbox) => {
    const displayedWidth = webcamRef.current.video.clientWidth;
    const displayedHeight = webcamRef.current.video.clientHeight;
    const xScale = displayedWidth / videoSize.width;
    const yScale = displayedHeight / videoSize.height;

    return {
      left: bbox[0] * xScale,
      top: bbox[1] * yScale,
      width: bbox[2] * xScale,
      height: bbox[3] * yScale,
    };
  };

  // Toggle the alerts on and off
  const toggleAlerts = () => {
    setAlertsEnabled(!alertsEnabled);
  };

  return (
    <>
      {/* Header with Avatar and Logout */}
      <header>
        <nav className="nav container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="text-display-3">SensAI</h1>
          <div className="profile-blob" style={{ display: 'flex', alignItems: 'center' }}>
            {user.picture !== "" ? (
              <img
                className="avatar"
                src={user.picture}
                alt="user profile avatar"
                style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 10 }}
              />
            ) : (
              <div className="avatar" style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: '#ccc',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                {user?.given_name?.[0]}
                {user?.family_name?.[1]}
              </div>
            )}
            <div>
              <p className="text-heading-2">
                {user?.given_name} {user?.family_name}
              </p>
              <button className="text-subtle" onClick={logout} style={{ cursor: 'pointer', color: '#cc0000' }}>
                Sign out
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Section with Camera */}
      <main>
        <div className="container">
          <div className="card start-hero">
            <p style={{ fontSize: '1.2rem' }}>
              Your sensAI is now guiding you
              <br />
            </p>
          </div>

          {/* Section with Camera */}
          <div style={{ padding: 20, textAlign: 'center', position: 'relative' }}>
            {/* Web Camera */}
            <div style={{ position: 'relative' }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ 
                  facingMode: 'user', 
                  width: { ideal: 320 }, // Reduced width for faster processing
                  height: { ideal: 240 } // Reduced height for faster processing
                }}
                style={{
                  width: '100%',
                  height: '600px',
                  borderRadius: 10,
                  marginBottom: 20,
                  objectFit: 'cover',
                }}
                onLoadedMetadata={onLoadedMetadata}
              />

              {/* Display detected objects on top of the webcam */}
              {objects.map((object, index) => {
                const { left, top, width, height } = calculateScaledBoundingBox(object.bbox);

                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      border: '2px solid red',
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      color: '#fff',
                      backgroundColor: 'rgba(255, 0, 0, 0.5)',
                      fontSize: '12px',
                      zIndex: 2,
                    }}
                  >
                    {object.class} ({Math.round(object.score * 100)}%)
                  </div>
                );
              })}
            </div>

            <button
              onClick={captureAndReadText}
              style={{
                backgroundColor: '#cc0000',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                margin: '20px 10px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              Capture and Read Text
            </button>

            <button
              onClick={toggleFacingMode}
              style={{
                backgroundColor: '#cc0000',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                margin: '20px 10px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              Flip Camera
            </button>

            {/* Toggle Alerts Button */}
            <button
              onClick={toggleAlerts}
              style={{
                backgroundColor: alertsEnabled ? '#4CAF50' : '#f44336', // Green if enabled, red if disabled
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                margin: '20px 10px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
            </button>

            {/* Voice Selection Dropdown */}
            <select
              onChange={(e) =>
                setSelectedVoice(voices.find((voice) => voice.name === e.target.value))
              }
              style={{
                backgroundColor: '#cc0000',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                margin: '20px 10px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>

            {/* Loading Spinner */}
            {loading && (
              <p>Processing image for text...</p>
            )}

            {/* Display error if there's an issue */}
            {error && (
              <p style={{ color: 'red' }}>{error}</p>
            )}

            {/* Display captured text */}
            {capturedText && (
              <div style={{
                marginTop: 20,
                padding: 5,
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: 5,
                width: '80%',
                fontSize: '0.9rem'
              }}>
                <p>{capturedText}</p>
              </div>
            )}
          </div>

          <section className="next-steps-section"></section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer" style={{ backgroundColor: '#000000', padding: '20px', textAlign: 'center' }}>
        <div className="container">
          <strong className="text-heading-2" style={{ color: '#ffffff' }}>KindeAuth</strong>
          <p className="footer-tagline text-body-3" style={{ color: '#ffffff' }}>
            Visit our{" "}
            <a className="link" href="https://kinde.com/docs" style={{ color: '#80b3ff' }}>
              help center
            </a>
          </p>
          <small className="text-subtle" style={{ color: '#e6e6e6' }}>
            © 2023 KindeAuth, Inc. All rights reserved
          </small>
        </div>
      </footer>
    </>
  );
}
