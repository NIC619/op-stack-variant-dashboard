import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PasswordProtection from './components/PasswordProtection';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PasswordProtection>
      <App />
    </PasswordProtection>
  </React.StrictMode>,
);
