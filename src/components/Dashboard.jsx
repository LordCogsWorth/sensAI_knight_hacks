import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export default function LoggedOut() {
  const { login, register } = useKindeAuth();
  const webcamRef = useRef(null);

  const [capturedText, setCapturedText] = useState(''); // Placeholder for text capture

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    // Perform any processing on imageSrc or pass to another function
    console.log(imageSrc);
    setCapturedText("Captured Text Example");
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: 20, backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#000000' }}>SensAI</h1>
        <div>
          <button onClick={login} style={{ color: '#cc0000', marginRight: 10 }}>Sign in</button>
          <button onClick={register} style={{ color: '#cc0000' }}>Sign up</button>
        </div>
      </div>

      {/* Main Section with Camera */}
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

        <button onClick={capture} style={{ color: '#ffffff', backgroundColor: '#cc0000', padding: '10px 20px' }}>
          Capture from Camera
        </button>

        {/* Display captured text */}
        {capturedText && (
          <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
            <p>{capturedText}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 20, backgroundColor: '#cc0000', textAlign: 'center' }}>
        <h3 style={{ color: '#ffffff' }}>SensAI</h3>
        <p style={{ color: '#ffffff' }}>
          Visit our <a href="https://kinde.com/docs" style={{ color: '#80b3ff' }}>help center</a>
        </p>
        <small style={{ color: '#e6e6e6' }}>© 2023 KindeAuth, Inc. All rights reserved</small>
      </div>
    </>
  );
}
