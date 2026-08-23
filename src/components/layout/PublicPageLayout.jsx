import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import '../../styles/story-public.css';
import './PublicPageLayout.css';

function PublicPageLayout({ children, mainId = 'main-content', className = '' }) {
  const { t } = useLocale();
  return (
    <div className={`public-page story-public ${className}`.trim()}>
      <a href={`#${mainId}`} className="skip-to-content">
        {t('skip')}
      </a>
      <Header />
      <main id={mainId}>{children}</main>
      <Footer />
    </div>
  );
}

export default PublicPageLayout;
