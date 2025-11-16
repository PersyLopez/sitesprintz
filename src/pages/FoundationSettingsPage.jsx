/**
 * Foundation Settings Page
 * 
 * Allows users to configure foundation features for their sites
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { sitesService } from '../services/sites';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import FoundationSettings from '../components/dashboard/FoundationSettings';
import './FoundationSettingsPage.css';

function FoundationSettingsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSites();
  }, [user]);

  const loadUserSites = async () => {
    if (!user?.id) return;
    
    try {
      const data = await sitesService.getUserSites(user.id);
      const userSites = data.sites || [];
      setSites(userSites);
      
      // Auto-select first published site
      const publishedSite = userSites.find(site => site.status === 'published');
      if (publishedSite) {
        setSelectedSite(publishedSite);
      } else if (userSites.length > 0) {
        setSelectedSite(userSites[0]);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      showError('Failed to load your sites');
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  const handleConfigUpdate = (updatedFoundation) => {
    // Update the selected site in state
    setSites(prevSites => 
      prevSites.map(site => 
        site.id === selectedSite.id 
          ? { ...site, site_data: { ...site.site_data, foundation: updatedFoundation } }
          : site
      )
    );
    
    // Update selected site
    setSelectedSite(prev => ({
      ...prev,
      site_data: { ...prev.site_data, foundation: updatedFoundation }
    }));
    
    showSuccess('Foundation settings updated!');
  };

  if (loading) {
    return (
      <div className="foundation-settings-page">
        <Header />
        <main className="foundation-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your sites...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="foundation-settings-page">
        <Header />
        <main className="foundation-container">
          <div className="empty-state">
            <h2>No Sites Yet</h2>
            <p>Create your first site to configure foundation features</p>
            <a href="/create" className="btn btn-primary">Create Site</a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="foundation-settings-page">
      <Header />
      
      <main className="foundation-container">
        <div className="foundation-layout">
          {/* Site Selector Sidebar */}
          <aside className="site-selector">
            <h3>Your Sites</h3>
            <div className="site-list">
              {sites.map(site => (
                <button
                  key={site.id}
                  className={`site-item ${selectedSite?.id === site.id ? 'active' : ''}`}
                  onClick={() => handleSiteSelect(site)}
                >
                  <div className="site-item-header">
                    <span className="site-name">{site.name}</span>
                    <span className={`site-status ${site.status}`}>
                      {site.status === 'published' ? '🟢' : '🟡'}
                    </span>
                  </div>
                  {site.subdomain && (
                    <span className="site-url">{site.subdomain}.sitesprintz.com</span>
                  )}
                  <span className="site-plan">{site.plan || 'starter'}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Settings Panel */}
          <div className="settings-panel">
            {selectedSite ? (
              <>
                <div className="selected-site-header">
                  <div>
                    <h2>{selectedSite.name}</h2>
                    <p className="site-meta">
                      {selectedSite.subdomain && (
                        <a 
                          href={`https://${selectedSite.subdomain}.sitesprintz.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="site-link"
                        >
                          {selectedSite.subdomain}.sitesprintz.com ↗
                        </a>
                      )}
                      <span className="plan-badge">{selectedSite.plan || 'Starter'} Plan</span>
                    </p>
                  </div>
                </div>
                
                <FoundationSettings 
                  site={selectedSite} 
                  onUpdate={handleConfigUpdate}
                />
              </>
            ) : (
              <div className="no-selection">
                <p>Select a site to configure its foundation features</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default FoundationSettingsPage;

