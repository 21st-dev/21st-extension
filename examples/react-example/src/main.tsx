import { ReactPlugin } from '@21st-extension/react';
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Render the main app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TwentyFirstToolbar config={{ plugins: [ReactPlugin] }} />
    <App />
  </StrictMode>,
);
