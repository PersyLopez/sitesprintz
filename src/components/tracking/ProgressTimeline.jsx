import React from 'react';
import './ProgressTimeline.css';

/**
 * ProgressTimeline Component
 * Visual timeline for order/appointment status tracking
 * 
 * @param {object} props
 * @param {string} props.title - Title for the tracker
 * @param {string} props.referenceId - Order ID or confirmation code
 * @param {string} props.currentStatus - Current status
 * @param {Array} props.statuses - Array of status objects: { id, label, description }
 * @param {string} props.estimatedCompletion - Estimated completion time/date
 * @param {string} props.technicianETA - Technician ETA
 * @param {Array} props.updates - Array of update objects: { timestamp, message, status }
 */
function ProgressTimeline({
  title = 'Track Your Order',
  referenceId,
  currentStatus,
  statuses = [],
  estimatedCompletion,
  technicianETA,
  updates = []
}) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatETA = (eta) => {
    if (!eta) return 'N/A';
    
    if (typeof eta === 'string') {
      const date = new Date(eta);
      const now = new Date();
      const diff = date - now;
      
      if (diff < 0) return 'Arrived';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    return eta;
  };

  const currentIndex = statuses.findIndex(s => s.id === currentStatus);

  return (
    <div className="progress-tracker">
      <h3 className="tracker-title">{title}</h3>
      {referenceId && (
        <div className="order-id">
          {referenceId.startsWith('ord_') || referenceId.length > 20 ? 'Order' : 'Confirmation'}: {referenceId}
        </div>
      )}

      <div className="status-timeline">
        <div 
          className={`timeline-line ${currentIndex >= 0 ? 'active' : ''}`}
          style={{ height: `${Math.max((statuses.length - 1) * 80, 0)}px` }}
        />
        <div className="timeline-items">
          {statuses.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const statusUpdate = updates.find(u => u.status === status.id);
            
            return (
              <div key={status.id} className="timeline-item">
                <div className={`timeline-marker ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="timeline-content">
                  <div className="timeline-label">{status.label}</div>
                  <div className="timeline-description">{status.description}</div>
                  {statusUpdate && (
                    <div className="timeline-date">
                      {formatDate(statusUpdate.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(technicianETA || estimatedCompletion) && (
        <div className="eta-display">
          <div className="eta-label">
            {technicianETA ? 'Technician ETA' : 'Estimated Completion'}
          </div>
          <div className="eta-value">
            {formatETA(technicianETA || estimatedCompletion)}
          </div>
        </div>
      )}

      {updates.length > 0 && (
        <div className="updates-section">
          <div className="updates-title">Recent Updates</div>
          {updates.slice().reverse().map((update, index) => (
            <div key={index} className="update-item">
              <div className="update-time">{formatDateTime(update.timestamp)}</div>
              <div className="update-message">{update.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgressTimeline;



