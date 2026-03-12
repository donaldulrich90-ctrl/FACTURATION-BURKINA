import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { MercurialeProvider } from './context/MercurialeContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MercurialeProvider>
          <App />
        </MercurialeProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
