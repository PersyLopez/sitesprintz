import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext.jsx';
import PublishedSiteViewer from './pages/PublishedSiteViewer';
import './styles/global.css';

function embeddedShopSubdomain() {
  const embed = typeof window !== 'undefined' ? window.__RSL_PUBLISHED_SITE__ : null;
  const site = embed?.site || embed;
  return site?.subdomain || '';
}

function ShopFromEmbed() {
  const subdomain = embeddedShopSubdomain();
  if (!subdomain) {
    return (
      <div className="published-site-viewer error" data-testid="custom-domain-unknown">
        <h1>Site not connected</h1>
        <p>This domain is not connected to a published Right Site Light site yet.</p>
      </div>
    );
  }
  return <PublishedSiteViewer forcedSubdomain={subdomain} />;
}

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
            <Route path="*" element={<ShopFromEmbed />} />
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
