import React from 'react';
import { Link } from 'react-router-dom';
import './SiteAnalyticsTable.css';

function SiteAnalyticsTable({ sites }) {
  return (
    <div className="site-analytics-table">
      <div className="table-header">
        <span className="table-col-site">Site Name</span>
        <span className="table-col-views">Views</span>
        <span className="table-col-visitors">Visitors</span>
        <span className="table-col-bounce">Bounce Rate</span>
        <span className="table-col-duration">Avg. Duration</span>
        <span className="table-col-actions">Actions</span>
      </div>

      <div className="table-body">
        {sites.map((site) => (
          <div key={site.id} className="table-row">
            <span className="table-col-site">
              <strong>{site.name}</strong>
            </span>
            <span className="table-col-views">
              {site.views?.toLocaleString() || '0'}
            </span>
            <span className="table-col-visitors">
              {site.visitors?.toLocaleString() || '0'}
            </span>
            <span className="table-col-bounce">
              {site.bounceRate ? `${site.bounceRate}%` : 'N/A'}
            </span>
            <span className="table-col-duration">
              {site.avgDuration || 'N/A'}
            </span>
            <span className="table-col-actions">
              <Link
                to={`/analytics?siteId=${site.id}`}
                className="btn btn-sm btn-secondary"
              >
                View Details
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SiteAnalyticsTable;

