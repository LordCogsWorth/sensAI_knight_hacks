import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import Tesseract from 'tesseract.js';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { debounce } from 'lodash';

export default function LoggedIn() {
  const { user, logout } = useKindeAuth();
  const webcamRef = useRef(null);
  const [capturedText, setCapturedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [objects, setObjects] = useState([]);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [mode, setMode] = useState('guide');
  const [notification, setNotification] = useState('');
  const recognitionRef = useRef(null);
  const previousObjectsRef = useRef([]);
  const lastGuidanceTimeRef = useRef(0);
  let c = 0;

  // Fetch available voices for text-to-speech
  useEffect(() => {
    const fetchVoices = () => {
      const voicesList = window.speechSynthesis.getVoices();
      setVoices(voicesList);
      if (voicesList.length > 0) {
        setSelectedVoice(voicesList[0]);
      }
    };

    fetchVoices();
    window.speechSynthesis.onvoiceschanged = fetchVoices;
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setNotification('Microphone is active and listening...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[event.resultIndex][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
      };

      recognition.onerror = (event) => {
        setNotification(`Error: ${event.error}`);
      };

      recognition.onend = () => {
        setNotification('Microphone stopped. Restarting...');
        recognition.start();
      };

      recognition.start();
    } else {
      console.error("Speech Recognition is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle voice commands with debounce
  const handleVoiceCommand = (command) => {
    const trimmedCommand = command.trim().toLowerCase(); // Trim and convert to lowercase for robustness
    console.log("Recognized command: ", trimmedCommand); // Debugging
  
    if (trimmedCommand.includes('ok sensei')) {
      if (trimmedCommand.includes('switch to capture')) {
        c = 0;
        setMode('capture');
        setNotification('Switched to Capture Mode');
        captureAndReadText(); // Capture the text immediately
        speakText('Capture mode activated.', false);  // Speak the message in capture mode
      } else if (trimmedCommand.includes('flip the camera')) {
        c = 0;
        toggleFacingMode();
        speakText('Camera flipped.', false);  // Speak the message regardless of mode
      } else if (trimmedCommand.includes('switch to guide')) {
        c = 1;
        setMode('guide');
        setNotification('Switched to Guide Mode');
        speakText('Guiding mode activated.');
      } else {
        setNotification('Command not recognized.');
      }
      // Clear notification after a short delay
      setTimeout(() => setNotification(''), 1000);
    }
  };
  

  // Load the CocoSSD model for object detection
  useEffect(() => {
    const loadModel = async () => {
      setLoading(true);
      const model = await cocoSsd.load();
      setLoading(false);
      detectObjects(model);
    };
    loadModel();
  }, []);

  // Function to update video dimensions when metadata is loaded
  const onLoadedMetadata = () => {
    const video = webcamRef.current.video;
    setVideoSize({ width: video.videoWidth, height: video.videoHeight });
  };

  // Function to detect objects using the loaded model with requestAnimationFrame
  const detectObjects = async (model) => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const predictions = await model.detect(video);

      if (predictions.length > 0) {
        if (JSON.stringify(predictions) !== JSON.stringify(previousObjectsRef.current)) {
          if (mode === 'guide') {
            compareObjects(predictions);
          }
          setObjects(predictions);
          previousObjectsRef.current = predictions;
        }
      }
    }
    requestAnimationFrame(() => detectObjects(model));
  };

  // Compare current objects with previous frame's objects to check for proximity and direction
  const compareObjects = (currentObjects) => {
    if (mode !== 'guide') return;

    const videoCenter = videoSize.width / 2;
    const currentTime = new Date().getTime();

    if (currentTime - lastGuidanceTimeRef.current < 6000) {
      return;
    }

    currentObjects.forEach((currentObject) => {
      const objectCenter = currentObject.bbox[0] + currentObject.bbox[2] / 2;
      
      const previousObject = previousObjectsRef.current.find(prev => prev.class === currentObject.class);
      const currentSize = currentObject.bbox[2] * currentObject.bbox[3];
      console.log(`Object: ${currentObject.class}, Center: ${objectCenter}, Video Center: ${videoCenter}`);

      if (previousObject) {
        const previousSize = previousObject.bbox[2] * previousObject.bbox[3];
        console.log("PREVIOUS    " + previousSize);
        console.log("CURRENT    " + currentSize);
        if (currentSize > previousSize * 1.01) {
          console.log('Object is approaching');
          debounceSpeak(`${currentObject.class} is approaching!`);
        }
      }
      if(c == 1){
        if (objectCenter > videoCenter/2) { // Adding margin to prevent constant instructions
          console.log(objectCenter);
          //console.log('Advising to move left');
          debounceSpeak('Move to the left!');
        } else if (objectCenter < videoCenter/2) { // Adding margin to prevent constant instructions
          //console.log('Advising to move right');
          debounceSpeak('Move to the right!');
        } else {
          console.log('Object is centered, no movement needed');
        }
      }
      lastGuidanceTimeRef.current = currentTime;
    
    });
  };

  // Function to capture the image, run OCR, and filter the text using LLM
  const captureAndReadText = () => {
    const imageSrc = webcamRef.current.getScreenshot({ width: 320, height: 240 });
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
          if (text.trim()) {
            speakText(text, false);  // Speak the recognized text regardless of mode
          } else {
            speakText('No meaningful text found.', false);  // Inform if no text is found
          }
        })
        .catch((err) => {
          setError('Failed to read text from the image');
          setLoading(false);
          speakText('Error reading the text.', false);  // Speak error message regardless of mode
        });
    } else {
      setError('Failed to capture image from the webcam');
      speakText('Failed to capture image.', false);  // Speak error message regardless of mode
    }
  };
  

  // Function to filter text using the LLM
  const filterTextWithLLM = async (text) => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer YOUR_API_KEY_HERE`, // Use your API key here
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo", // or use the model you want
            messages: [
              {
                role: "user",
                content: `Can you filter this text to remove all the nonsense? Also, if the text is in a different language, convert it to English: ${text}`,
              },
            ],
          }),
        }
      );

      console.log("Response status:", response.status);
      const responseText = await response.json();
      console.log("Response data:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
      }

      const filteredText = responseText.choices[0].message.content;

      if (!filteredText || filteredText.trim() === "") {
        setCapturedText("No meaningful text found.");
        speakText("No meaningful text found.");
      } else {
        setCapturedText(filteredText);
        speakText(filteredText);
      }
    } catch (error) {
      console.error("Failed to filter text with LLM:", error);
      setError("Failed to filter text with LLM");
    } finally {
      setLoading(false);
    }
  };

  // Updated speakText function using the Web Speech API with debounce
  let lastSpokenTime = 0;
  const debounceSpeak = (text, delay = 1000) => {
    const currentTime = new Date().getTime();
    if (currentTime - lastSpokenTime > delay) {
      speakText(text);
      lastSpokenTime = currentTime;
    }
  };

  const speakText = (text, onlyInGuideMode = true) => {
    if (onlyInGuideMode && mode !== 'guide') return;  // If only allowed in guide mode, return
  
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.voice = selectedVoice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Text-to-speech is not supported in this browser.');
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

  return (
    <>
      {/* Notification Box */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
        }}>
          {notification}
        </div>
      )}

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
                {user?.given_name?.[0]}{user?.family_name?.[1]}
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
                  facingMode: facingMode,
                  width: { ideal: 320 },
                  height: { ideal: 240 }
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
          </div>

          <section className="next-steps-section"></section>
        </div>
      </main>
    </>
  );
}

