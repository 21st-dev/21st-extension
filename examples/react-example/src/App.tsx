import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react';

function App() {
  const [count, setCount] = useState(0);
  const [isDark, setIsDark] = useState(false);

  const handleRuntimeError = () => {
    throw new Error('This is a runtime error for testing purposes');
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const getCSSVariable = (varName: string) => {
    const anchor = document.querySelector('stagewise-companion-anchor');
    if (anchor) {
      return getComputedStyle(anchor).getPropertyValue(varName).trim();
    }
    return 'not found';
  };

  const [cssVars, setCssVars] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setCssVars({
        background: getCSSVariable('--background'),
        foreground: getCSSVariable('--foreground'),
        border: getCSSVariable('--border'),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <TwentyFirstToolbar />
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      {/* Theme Debug Info */}
      <div
        style={{
          border: '1px solid #ccc',
          padding: '10px',
          margin: '20px 0',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3>Theme Debug Info:</h3>
        <p>Current theme: {isDark ? 'Dark' : 'Light'}</p>
        <p>HTML classes: {document.documentElement.className || 'none'}</p>
        <p>
          Toolbar element exists:{' '}
          {document.querySelector('stagewise-companion-anchor') ? 'Yes' : 'No'}
        </p>

        <h4>CSS Variables:</h4>
        <ul>
          <li>--background: {cssVars.background || 'loading...'}</li>
          <li>--foreground: {cssVars.foreground || 'loading...'}</li>
          <li>--border: {cssVars.border || 'loading...'}</li>
        </ul>

        <button
          type="button"
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            backgroundColor: isDark ? '#333' : '#fff',
            color: isDark ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Toggle Theme (Current: {isDark ? 'Dark' : 'Light'})
        </button>
      </div>

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
