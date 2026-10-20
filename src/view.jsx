import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext.jsx';
import PublishedSiteViewer from './pages/PublishedSiteViewer';
import './styles/global.css';

const publishedRoot = document.getElementById('root');
if (publishedRoot?.querySelector('#ss-prerender')) {
  window.__RSL_PUBLISHED_HTML__ = publishedRoot.innerHTML;
}

ReactDOM.createRoot(publishedRoot).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <Routes>
            <Route path="/view/:subdomain" element={<PublishedSiteViewer />} />
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
