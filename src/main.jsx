import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

const publishedRoot = document.getElementById('root');
if (publishedRoot?.querySelector('#ss-prerender')) {
  window.__RSL_PUBLISHED_HTML__ = publishedRoot.innerHTML;
}

ReactDOM.createRoot(publishedRoot).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

