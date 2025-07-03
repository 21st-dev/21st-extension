import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import bgImage from '/21-bg.png';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [showNewImage, setShowNewImage] = useState(false);

  const handleRuntimeError = () => {
    throw new Error('This is a runtime error for testing purposes');
  };

  return (
    <>
      {showNewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: -1,
          }}
        />
      )}
      <div>
        {!showNewImage && (
          <>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </>
        )}
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button type="button" onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button
          type="button"
          onClick={handleRuntimeError}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginLeft: '8px',
            cursor: 'pointer',
          }}
        >
          Trigger Runtime Error
        </button>
        <button
          type="button"
          onClick={() => setShowNewImage(!showNewImage)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginLeft: '8px',
            cursor: 'pointer',
          }}
        >
          {showNewImage ? 'Show Original Logos' : 'Show 21st Background'}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
