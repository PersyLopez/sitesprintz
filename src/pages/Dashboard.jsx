import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { sitesService } from '../services/sites';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SiteCard from '../components/dashboard/SiteCard';
import WelcomeModal from '../components/dashboard/WelcomeModal';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    loadUserSites();
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = () => {
    const hasVisited = localStorage.getItem('hasVisitedDashboard');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisitedDashboard', 'true');
    }
  };

  const loadUserSites = async () => {
    if (!user?.id) return;
    
    try {
      const data = await sitesService.getUserSites(user.id);
      setSites(data.sites || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
      showError('Failed to load your sites');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }

    try {
      await sitesService.deleteSite(user.id, siteId);
      setSites(sites.filter(site => site.id !== siteId));
      showSuccess('Site deleted successfully');
    } catch (error) {
      showError('Failed to delete site');
    }
  };

  return (
    <div className="dashboard-page">
      <Header />
      
      <main className="dashboard-container">
        <div className="dashboard-header">
          <div className="user-greeting">
            <h1>Welcome back, {user?.email?.split('@')[0] || 'there'}!</h1>
            <p>Manage your websites and create new ones</p>
          </div>
          
          <Link to="/setup" className="btn btn-primary">
            <span>+</span> Create New Site
          </Link>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚀</div>
            <h2>No sites yet</h2>
            <p>Create your first website to get started</p>
            <Link to="/setup" className="btn btn-primary btn-large">
              Create Your First Site
            </Link>
          </div>
        ) : (
          <>
            <div className="sites-stats">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{sites.length}</div>
                  <div className="stat-label">Total Sites</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{sites.filter(s => s.status === 'published').length}</div>
                  <div className="stat-label">Published</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-value">{sites.filter(s => s.status === 'draft').length}</div>
                  <div className="stat-label">Drafts</div>
                </div>
              </div>
            </div>

            <div className="sites-section">
              <h2>Your Sites</h2>
              <div className="sites-grid">
                {sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onDelete={() => handleDeleteSite(site.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
      
      {showWelcome && (
        <WelcomeModal onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

export default Dashboard;
