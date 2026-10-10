import React from 'react';
import { createRoot } from 'react-dom/client';
// Stylesheet order matters: base → legacy game layer → current theme (life.css wins).
import '@fontsource-variable/noto-sans-kr';
import './styles.css';
import './game.css';
import './life.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
