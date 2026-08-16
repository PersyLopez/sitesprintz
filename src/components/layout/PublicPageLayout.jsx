import React from 'react';
import Header from './Header';
import Footer from './Footer';
import '../../styles/story-public.css';
import './PublicPageLayout.css';

function PublicPageLayout({ children, mainId = 'main-content', className = '' }) {
  return (
    <div className={`public-page story-public ${className}`.trim()}>
      <a href={`#${mainId}`} className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id={mainId}>{children}</main>
      <Footer />
    </div>
  );
}

export default PublicPageLayout;
