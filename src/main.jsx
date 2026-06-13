import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './lib/i18n.jsx'
import './index.css'

// Admin back office (admin.airluxo.ch or ?admin) gets the cream icon + its own tab
// title; the customer site keeps the black icon set in index.html.
const adminMode =
  window.location.hostname.startsWith('admin.') ||
  new URLSearchParams(window.location.search).has('admin');
if (adminMode) {
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
    l.href = '/favicon-admin.png';
  });
  document.title = 'AIRLUXO — Admin';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
