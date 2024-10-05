import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import Tesseract from 'tesseract.js';

export default function LoggedIn() {
  const { user, logout } = useKindeAuth();
  const webcamRef = useRef(null);
  const [capturedText, setCapturedText] = useState(''); // Placeholder for captured text
  const [loading, setLoading] = useState(false); // Loading indicator for OCR processing
  const [error, setError] = useState(null); // Placeholder for any errors

  // Function to capture the image, run OCR, and speak the text
  const captureAndReadText = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setLoading(true);
      setError(null);

      // Use Tesseract to perform OCR on the image
      Tesseract.recognize(
        imageSrc,
        'eng', // Set the language to English, can be customized
        {
          logger: (m) => console.log(m), // Optional logger to see the progress
        }
      )
      .then(({ data: { text } }) => {
        setCapturedText(text); // Update the state with the extracted text
        setLoading(false);
        speakText(text); // Call the function to speak the text
      })
      .catch((err) => {
        setError('Failed to read text from the image');
        setLoading(false);
      });
    } else {
      setError('Failed to capture image from the webcam');
    }
  };

  // Function to speak the captured text using the Web Speech API
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Set language, can be customized
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Text-to-speech is not supported in this browser.');
    }
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
            <p className="text-body-2 start-hero-intro">Woohoo!</p>
            <p className="text-display-2">
              Your authentication is all sorted.
              <br />
              Build the important stuff.
            </p>
          </div>

          {/* Section with Camera */}
          <div style={{ padding: 20, textAlign: 'center' }}>
            <h2>Let SensAI guide you in the right direction</h2>

            {/* Web Camera */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{
                width: '100%',     // Full width
                height: '400px',   // Height reduced for mobile
                borderRadius: 10,
                marginBottom: 20,
                objectFit: 'cover', // Cover the container without stretching
              }}
            />

            <button onClick={captureAndReadText} style={{ color: '#ffffff', backgroundColor: '#cc0000', padding: '10px 20px' }}>
              Capture and Read Text
            </button>

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
              <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
                <p>{capturedText}</p>
              </div>
            )}
          </div>

          <section className="next-steps-section">
            <h2 className="text-heading-1">Next steps for you</h2>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer" style={{ backgroundColor: '#cc0000', padding: '20px', textAlign: 'center' }}>
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
