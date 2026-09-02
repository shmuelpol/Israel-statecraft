import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

// theme: persisted preference, system default initially (invariant: respect system default)
const saved = localStorage.getItem('theme');
const system = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const theme = saved && ['light', 'dark', 'hamal'].includes(saved) ? saved : system;
document.documentElement.dataset.theme = theme;

createRoot(document.getElementById('root')!).render(<App />);
